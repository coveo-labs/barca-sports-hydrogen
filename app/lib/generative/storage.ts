import {openDB, type IDBPDatabase, type DBSchema} from 'idb';
import type {ConversationRecord} from './chat';

const DB_NAME = 'agentic-conversations';
const DB_VERSION = 1;
const STORE_NAME = 'conversations';

interface ConversationsDBSchema extends DBSchema {
  conversations: {
    key: string;
    value: ConversationRecord;
    indexes: {
      'by-sessionId': string;
      'by-updatedAt': string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<ConversationsDBSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<ConversationsDBSchema>> {
  dbPromise ??= openDB<ConversationsDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, {keyPath: 'localId'});
      store.createIndex('by-sessionId', 'sessionId');
      store.createIndex('by-updatedAt', 'updatedAt');
    },
  });
  return dbPromise;
}

export async function loadConversations(): Promise<ConversationRecord[]> {
  if (globalThis.window === undefined) return [];
  try {
    const db = await getDB();
    const all = await db.getAll(STORE_NAME);
    return all.sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt, undefined, {numeric: true}),
    );
  } catch (error) {
    console.error('[storage] Failed to load conversations', error);
    return [];
  }
}

export async function saveConversation(
  record: ConversationRecord,
): Promise<void> {
  if (globalThis.window === undefined) return;
  try {
    const db = await getDB();
    await db.put(STORE_NAME, record);
  } catch (error) {
    console.error('[storage] Failed to save conversation', error);
  }
}

export async function saveAllConversations(
  records: ConversationRecord[],
): Promise<void> {
  if (globalThis.window === undefined) return;

  try {
    const db = await getDB();

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.store;

    const existingKeys = await store.getAllKeys();
    const newKeys = new Set(records.map((r) => r.localId));

    const deletePromises = existingKeys
      .filter((key) => !newKeys.has(key))
      .map((key) => store.delete(key));

    const putPromises = records.map((record) => store.put(record));

    await Promise.all([...deletePromises, ...putPromises, tx.done]);
  } catch (error) {
    console.error('[storage] Failed to save conversations', error);
  }
}

export async function deleteConversation(localId: string): Promise<void> {
  if (globalThis.window === undefined) return;
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, localId);
  } catch (error) {
    console.error('[storage] Failed to delete conversation', error);
  }
}

export async function clearAllConversations(): Promise<void> {
  if (globalThis.window === undefined) return;
  try {
    const db = await getDB();
    await db.clear(STORE_NAME);
  } catch (error) {
    console.error('[storage] Failed to clear conversations', error);
  }
}
