# IndexedDB Migration Plan

## Overview

Migrate conversation storage from localStorage (5-10MB limit) to IndexedDB (hundreds of GB), and increase message/conversation limits to fix the product lookup issue in long conversations.

## Problem Statement

When conversations exceed 20 messages, older messages are truncated via `limitMessages()`. This causes:

1. **Products attached to truncated messages are lost** - The `message.metadata.products` data is discarded with the message
2. **Product lookup fails** - When rendering, the `knownProducts` Map is built only from visible messages
3. **Later messages can't find products** - If a later message references a product (via `<product_ref id="..."/>`) that was attached to a now-truncated message, the lookup returns `null`

## Decisions

| Decision                  | Value                             |
| ------------------------- | --------------------------------- |
| Messages per conversation | 100 (up from 20)                  |
| Max conversations         | 50 (up from 10)                   |
| Old localStorage data     | Leave orphaned (don't clear)      |
| Save debounce             | 500ms                             |
| `limitMessages()`         | Keep as safety net with 100 limit |

## Browser Storage Comparison

| Storage          | Limit                              | Best For              |
| ---------------- | ---------------------------------- | --------------------- |
| **localStorage** | 5-10 MB                            | Small key-value pairs |
| **IndexedDB**    | Up to 60% of disk (hundreds of GB) | Structured app data   |
| **Cache API**    | Same as IndexedDB                  | HTTP response caching |
| **OPFS**         | Same as IndexedDB                  | Binary files          |

**Choice: IndexedDB** with `idb` wrapper library (~1.19 KB, Promise-based API)

---

## Implementation Tasks

### Task 1: Install `idb` package

```bash
npm install idb
```

---

### Task 2: Create IndexedDB Storage Module

**New File:** `app/lib/generative/storage.ts`

```typescript
import {openDB, type IDBPDatabase} from 'idb';
import type {ConversationRecord} from './chat';

const DB_NAME = 'agentic-conversations';
const DB_VERSION = 1;
const STORE_NAME = 'conversations';

type ConversationsDB = IDBPDatabase<{
  conversations: {
    key: string;
    value: ConversationRecord;
    indexes: {
      'by-sessionId': string;
      'by-updatedAt': string;
    };
  };
}>;

let dbPromise: Promise<ConversationsDB> | null = null;

function getDB(): Promise<ConversationsDB> {
  if (!dbPromise) {
    dbPromise = openDB<ConversationsDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, {keyPath: 'localId'});
        store.createIndex('by-sessionId', 'sessionId');
        store.createIndex('by-updatedAt', 'updatedAt');
      },
    });
  }
  return dbPromise;
}

export async function loadConversations(): Promise<ConversationRecord[]> {
  if (typeof window === 'undefined') return [];
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  return all.sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt, undefined, {numeric: true}),
  );
}

export async function saveConversation(
  record: ConversationRecord,
): Promise<void> {
  if (typeof window === 'undefined') return;
  const db = await getDB();
  await db.put(STORE_NAME, record);
}

export async function saveAllConversations(
  records: ConversationRecord[],
): Promise<void> {
  if (typeof window === 'undefined') return;
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await Promise.all([
    ...records.map((record) => tx.store.put(record)),
    tx.done,
  ]);
}

export async function deleteConversation(localId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const db = await getDB();
  await db.delete(STORE_NAME, localId);
}

export async function clearAllConversations(): Promise<void> {
  if (typeof window === 'undefined') return;
  const db = await getDB();
  await db.clear(STORE_NAME);
}
```

---

### Task 3: Update `app/lib/generative/chat.ts`

**Changes:**

1. Update constants:

   ```typescript
   // Before
   export const MAX_MESSAGES = 20;
   export const MAX_CONVERSATIONS = 10;

   // After
   export const MAX_MESSAGES = 100;
   export const MAX_CONVERSATIONS = 50;
   ```

2. Remove these functions entirely:
   - `loadConversationsFromStorage()`
   - `persistConversationsToStorage()`

3. Remove `limitMessages()` calls from:
   - `mapSummaryToRecord()` (line ~265)
   - `recordToSummary()` (line ~278)
   - `mergeConversations()` (lines ~310, ~325)

4. Keep `limitMessages()` function itself (as safety net with new 100 limit)

---

### Task 4: Update `app/lib/generative/use-conversation-state.ts`

**Changes:**

1. Update imports:

   ```typescript
   // Remove from chat.ts imports:
   // - loadConversationsFromStorage
   // - persistConversationsToStorage

   // Add new import:
   import {loadConversations, saveAllConversations} from './storage';
   ```

2. Replace synchronous localStorage calls with async IndexedDB:

   ```typescript
   // Before (sync)
   const stored = loadConversationsFromStorage();

   // After (async)
   loadConversations().then((stored) => {
     if (stored.length > 0) {
       setConversations((prev) => mergeConversations(prev, stored));
     }
     storageLoadedRef.current = true;
   });
   ```

3. Add debounced save (500ms):

   ```typescript
   const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

   useEffect(() => {
     if (!isHydrated) return;

     if (saveTimeoutRef.current) {
       clearTimeout(saveTimeoutRef.current);
     }

     saveTimeoutRef.current = setTimeout(() => {
       saveAllConversations(conversations);
     }, 500);

     return () => {
       if (saveTimeoutRef.current) {
         clearTimeout(saveTimeoutRef.current);
       }
     };
   }, [conversations, isHydrated]);
   ```

---

### Task 5: Update `app/lib/generative/use-assistant-streaming.ts`

**Line ~100:** Remove `limitMessages()` call in `applyUpdate()`:

```typescript
// Before
const applyUpdate = (
  mutator: (conversation: ConversationRecord) => ConversationRecord,
) => {
  setConversations((prev) =>
    sortConversations(
      prev.map((conversation) => {
        if (conversation.localId !== conversationLocalId) {
          return conversation;
        }
        const updated = mutator(conversation);
        const limitedMessages = limitMessages(updated.messages);
        const limited =
          limitedMessages === updated.messages
            ? updated
            : {
                ...updated,
                messages: limitedMessages,
              };
        latestSnapshot = limited;
        return limited;
      }),
    ),
  );
};

// After
const applyUpdate = (
  mutator: (conversation: ConversationRecord) => ConversationRecord,
) => {
  setConversations((prev) =>
    sortConversations(
      prev.map((conversation) => {
        if (conversation.localId !== conversationLocalId) {
          return conversation;
        }
        const updated = mutator(conversation);
        latestSnapshot = updated;
        return updated;
      }),
    ),
  );
};
```

Also remove `limitMessages` from imports.

---

### Task 6: Update `app/lib/generative/use-send-message.ts`

**Line ~111:** Remove `limitMessages()` call:

```typescript
// Before
const updated: ConversationRecord = {
  ...base,
  title,
  updatedAt: now,
  messages: limitMessages([...base.messages, userMessage]),
};

// After
const updated: ConversationRecord = {
  ...base,
  title,
  updatedAt: now,
  messages: [...base.messages, userMessage],
};
```

Also remove `limitMessages` from imports.

---

### Task 7: Update `app/routes/api.agentic.conversation.ts`

**Lines 13-14:** Update constants:

```typescript
// Before
const MAX_CONVERSATIONS = 10;
const MAX_MESSAGES_PER_CONVERSATION = 20;

// After
const MAX_CONVERSATIONS = 50;
const MAX_MESSAGES_PER_CONVERSATION = 100;
```

---

## Files Changed Summary

| File                                            | Action                                                                       |
| ----------------------------------------------- | ---------------------------------------------------------------------------- |
| `package.json`                                  | Add `idb` dependency                                                         |
| `app/lib/generative/storage.ts`                 | **CREATE** - New IndexedDB module                                            |
| `app/lib/generative/chat.ts`                    | Update limits, remove localStorage functions, remove `limitMessages()` calls |
| `app/lib/generative/use-conversation-state.ts`  | Use async IndexedDB, add debounced saves                                     |
| `app/lib/generative/use-assistant-streaming.ts` | Remove `limitMessages()` call                                                |
| `app/lib/generative/use-send-message.ts`        | Remove `limitMessages()` call                                                |
| `app/routes/api.agentic.conversation.ts`        | Update limits                                                                |

---

## Testing Checklist

- [ ] Conversations persist after page refresh
- [ ] Long conversations (50+ messages) work correctly
- [ ] Product cards render in long conversations
- [ ] Products from early messages are still accessible in later messages
- [ ] Conversation list limits to 50
- [ ] Messages per conversation limits to 100
- [ ] Debounced saves work (check IndexedDB in DevTools)
- [ ] No errors when IndexedDB is accessed

---

## Rollback Plan

If issues arise:

1. Revert all file changes
2. Run `npm uninstall idb`
3. Old localStorage data is still present (orphaned but accessible)
