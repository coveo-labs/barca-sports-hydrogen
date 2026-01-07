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
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  return all.sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt, undefined, {numeric: true}),
  );
}

export async function saveConversation(
  record: ConversationRecord,
): Promise<void> {
  if (globalThis.window === undefined) return;
  const db = await getDB();
  await db.put(STORE_NAME, record);
}

export async function saveAllConversations(
  records: ConversationRecord[],
): Promise<void> {
  if (globalThis.window === undefined) return;
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await Promise.all([
    ...records.map((record) => tx.store.put(record)),
    tx.done,
  ]);
}

export async function deleteConversation(localId: string): Promise<void> {
  if (globalThis.window === undefined) return;
  const db = await getDB();
  await db.delete(STORE_NAME, localId);
}

export async function clearAllConversations(): Promise<void> {
  if (globalThis.window === undefined) return;
  const db = await getDB();
  await db.clear(STORE_NAME);
}
