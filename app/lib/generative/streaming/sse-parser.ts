import type {AssistantStreamEvent, CustomEvent} from './types';

export function parseAssistantStreamEvent({
  event,
  data,
}: {
  event: string;
  data: string;
}): AssistantStreamEvent {
  let parsedPayload: unknown = data;

  if (data) {
    try {
      parsedPayload = JSON.parse(data);
    } catch {
      parsedPayload = data;
    }
  }

  const normalized = normalizeEvent(event || 'message', parsedPayload);
  return coerceAssistantEvent(normalized, event || 'message', parsedPayload);
}

function normalizeEvent(fallbackName: string, payload: unknown): unknown {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (typeof record.type === 'string') {
      return record;
    }
  }

  if (fallbackName && fallbackName !== 'message') {
    return {
      type: fallbackName,
      payload,
    };
  }

  return payload;
}

function coerceAssistantEvent(
  value: unknown,
  fallbackEvent: string,
  fallbackPayload: unknown,
): AssistantStreamEvent {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const type = readTrimmedString(record.type);
    if (type) {
      if (type === 'CUSTOM') {
        return normalizeCustomEvent(record);
      }
      return record as AssistantStreamEvent;
    }
  }

  return {
    type: 'UNKNOWN',
    event: fallbackEvent,
    payload: value ?? fallbackPayload,
  };
}

function normalizeCustomEvent(record: Record<string, unknown>): CustomEvent {
  const name = readTrimmedString(record.name) ?? 'custom';
  let value: unknown = record;
  if ('value' in record) {
    value = record.value;
  } else if ('payload' in record) {
    value = record.payload;
  }

  return {
    type: 'CUSTOM',
    name,
    value,
  };
}

function readTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}
