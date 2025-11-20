import type {Product} from '@coveo/headless-react/ssr-commerce';
import type {
  ConversationMessage,
  ConversationSummary,
} from '~/types/conversation';

export const STORAGE_KEY = 'agentic:conversations:v1';
export const MAX_MESSAGES = 20;
export const MAX_CONVERSATIONS = 10;

export type ConversationRecord = {
  localId: string;
  sessionId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
  isPersisted?: boolean;
};

type ToolResultParse = {
  message: string | null;
  products: Product[] | null;
};

export function parseToolResultPayload(raw: unknown): ToolResultParse {
  const message =
    typeof raw === 'object' && raw !== null
      ? (() => {
          const candidate = raw as Record<string, unknown>;
          const value = candidate.message ?? candidate.status ?? candidate.text;
          if (typeof value === 'string' && value.trim()) {
            return value.trim();
          }
          return null;
        })()
      : typeof raw === 'string'
        ? raw.trim()
        : null;

  const products = extractProductArray(raw);

  return {
    message: message && message.length ? message : null,
    products,
  };
}

function extractProductArray(source: unknown): Product[] | null {
  const stack: unknown[] = [source];
  const seen = new Set<unknown>();
  const keysToCheck = ['products', 'items', 'results', 'hits', 'documents'];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    if (Array.isArray(current) && current.length > 0) {
      return current as Product[];
    }

    if (typeof current === 'object') {
      if (seen.has(current)) {
        continue;
      }
      seen.add(current);
      const record = current as Record<string, unknown>;
      for (const key of keysToCheck) {
        if (key in record) {
          stack.push(record[key]);
        }
      }
    }
  }

  return null;
}

export function extractAssistantChunk(value: unknown): string | null {
  const chunk = gatherAssistantChunk(value);
  if (!chunk) {
    return null;
  }

  const trimmed = chunk.trim();
  if (trimmed) {
    const normalized = trimmed.toLowerCase();
    if (
      normalized === 'assistant' ||
      normalized === 'user' ||
      normalized === 'system' ||
      normalized === 'tool' ||
      normalized === 'stop' ||
      normalized === 'completed'
    ) {
      return null;
    }

    const upper = trimmed.toUpperCase();
    if (upper === '[DONE]' || upper === 'DONE') {
      return null;
    }
  }

  return chunk;
}

function gatherAssistantChunk(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map((entry) => gatherAssistantChunk(entry)).join('');
  }

  const record = value as Record<string, unknown>;

  const directKeys: Array<keyof typeof record> = ['content', 'text', 'message'];
  for (const key of directKeys) {
    const candidate = record[key];
    if (typeof candidate === 'string') {
      return candidate;
    }
    if (Array.isArray(candidate)) {
      const aggregated = candidate
        .map((entry) => gatherAssistantChunk(entry))
        .join('');
      if (aggregated) {
        return aggregated;
      }
    }
  }

  const nestedKeys: Array<keyof typeof record> = [
    'delta',
    'contentDelta',
    'messageDelta',
    'chunk',
    'value',
    'data',
    'response',
  ];
  for (const key of nestedKeys) {
    if (key in record) {
      const nested = gatherAssistantChunk(record[key]);
      if (nested) {
        return nested;
      }
    }
  }

  const collectionKeys: Array<keyof typeof record> = [
    'choices',
    'segments',
    'parts',
  ];
  for (const key of collectionKeys) {
    const collection = record[key];
    if (Array.isArray(collection)) {
      for (const entry of collection) {
        const nested = gatherAssistantChunk(entry);
        if (nested) {
          return nested;
        }
      }
    }
  }

  return '';
}

export function findEventBoundary(buffer: string) {
  const lfIndex = buffer.indexOf('\n\n');
  const crlfIndex = buffer.indexOf('\r\n\r\n');
  if (lfIndex === -1) return crlfIndex;
  if (crlfIndex === -1) return lfIndex;
  return Math.min(lfIndex, crlfIndex);
}

export function getBoundaryLength(buffer: string, index: number) {
  return buffer.startsWith('\r\n\r\n', index) ? 4 : 2;
}

export function loadConversationsFromStorage(): ConversationRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as ConversationSummary[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(mapSummaryToRecord);
  } catch {
    return [];
  }
}

export function persistConversationsToStorage(records: ConversationRecord[]) {
  if (typeof window === 'undefined') {
    return;
  }

  const summaries = records
    .filter((conversation) => conversation.sessionId)
    .map(recordToSummary)
    .slice(0, 10);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(summaries));
}

export function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diff = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return 'just now';
  }
  if (diff < hour) {
    const minutes = Math.round(diff / minute);
    return `${minutes} min ago`;
  }
  if (diff < day) {
    const hours = Math.round(diff / hour);
    return `${hours} hr ago`;
  }
  const days = Math.round(diff / day);
  return `${days} d ago`;
}

export function mapSummaryToRecord(
  summary: ConversationSummary,
): ConversationRecord {
  return {
    localId: generateId(),
    sessionId: summary.id,
    title: summary.title,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
    messages: limitMessages(summary.messages ?? []),
    isPersisted: true,
  };
}

export function recordToSummary(
  record: ConversationRecord,
): ConversationSummary {
  return {
    id: record.sessionId ?? record.localId,
    title: record.title,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    messages: limitMessages(record.messages),
  };
}

export function createEmptyConversation(
  title: string,
  timestamp: string,
): ConversationRecord {
  const label = title.trim() || 'New conversation';
  return {
    localId: generateId(),
    sessionId: null,
    title: label,
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [],
    isPersisted: false,
  };
}

export function mergeConversations(
  existing: ConversationRecord[],
  incoming: ConversationRecord[],
): ConversationRecord[] {
  const merged = new Map<string, ConversationRecord>();

  const upsert = (record: ConversationRecord, preserveLocalId?: string) => {
    const key = record.sessionId ?? record.localId;
    const current = merged.get(key);
    if (!current) {
      merged.set(key, {
        ...record,
        messages: limitMessages(record.messages),
      });
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
      title: newer.title || older.title,
      messages: limitMessages(
        newer.messages.length ? newer.messages : older.messages,
      ),
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

export function limitMessages(
  messages: ConversationMessage[],
): ConversationMessage[] {
  if (messages.length <= MAX_MESSAGES) {
    return messages;
  }
  return messages.slice(-MAX_MESSAGES);
}

export function generateId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function getProductGridClass(count: number) {
  if (count >= 6) {
    return 'sm:grid-cols-2 xl:grid-cols-3';
  }
  if (count >= 4) {
    return 'sm:grid-cols-2 lg:grid-cols-3';
  }
  if (count >= 2) {
    return 'sm:grid-cols-2';
  }
  return 'sm:grid-cols-1';
}
