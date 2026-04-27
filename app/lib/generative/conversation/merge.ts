import type {ConversationRecord} from './record';

export const MAX_CONVERSATIONS = 50;

export function mergeConversations(
  existing: ConversationRecord[],
  incoming: ConversationRecord[],
): ConversationRecord[] {
  const merged = new Map<string, ConversationRecord>();

  const upsert = (record: ConversationRecord, preserveLocalId?: string) => {
    const key = record.sessionId ?? record.localId;
    const current = merged.get(key);
    if (!current) {
      merged.set(key, record);
      return;
    }

    const currentTime = Date.parse(current.updatedAt);
    const incomingTime = Date.parse(record.updatedAt);
    const newer = incomingTime > currentTime ? record : current;
    const older = newer === current ? record : current;

    merged.set(key, {
      ...newer,
      localId: preserveLocalId ?? current.localId,
      sessionId: newer.sessionId ?? older.sessionId ?? null,
      conversationToken:
        newer.conversationToken ?? older.conversationToken ?? null,
      title: newer.title || older.title,
      messages: newer.messages.length ? newer.messages : older.messages,
      isPersisted: newer.isPersisted ?? older.isPersisted,
    });
  };

  for (const record of existing) {
    upsert(record);
  }

  for (const record of incoming) {
    const key = record.sessionId ?? record.localId;
    const localId = merged.get(key)?.localId;
    upsert(record, localId);
  }

  return sortConversations(Array.from(merged.values())).slice(
    0,
    MAX_CONVERSATIONS,
  );
}

export function sortConversations(
  records: ConversationRecord[],
): ConversationRecord[] {
  return [...records].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt, undefined, {numeric: true}),
  );
}
