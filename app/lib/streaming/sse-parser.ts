import {
  extractAssistantChunk,
  parseToolResultPayload,
} from '~/lib/generative-chat';
import {
  DEFAULT_STATUS_MESSAGE,
  DEFAULT_TOOL_PROGRESS_MESSAGE,
  GENERIC_ERROR_MESSAGE,
  TOOL_RESULT_FALLBACK_MESSAGE,
} from './constants';
import type {AssistantStreamEvent, SessionIdentifier} from './types';

export function parseAssistantStreamEvent({
  event,
  data,
}: {
  event: string;
  data: string;
}): AssistantStreamEvent {
  const rawEventName = event || 'message';
  let parsedPayload: unknown = data;

  if (data) {
    try {
      parsedPayload = JSON.parse(data);
    } catch {
      parsedPayload = data;
    }
  }

  const {name, payload, reportedEvent} = normalizeAssistantStreamEvent(
    rawEventName,
    parsedPayload,
  );
  const session = extractSessionIdentifier(payload);

  switch (name) {
    case 'turn_started':
      return {type: 'turn_started', payload: {...session}};

    case 'turn_complete':
      return {type: 'turn_complete', payload: {...session}};

    case 'status':
    case 'status_update':
      return {
        type: name,
        payload: {
          ...session,
          message: resolveDisplayText(payload, DEFAULT_STATUS_MESSAGE),
        },
      };

    case 'tool_invocation':
      return {
        type: 'tool_invocation',
        payload: {
          ...session,
          message: resolveDisplayText(payload, DEFAULT_TOOL_PROGRESS_MESSAGE),
        },
      };

    case 'tool_result': {
      const result = parseToolResultPayload(payload);
      const resolvedMessage =
        result.message ?? resolveDisplayText(payload, TOOL_RESULT_FALLBACK_MESSAGE);
      return {
        type: 'tool_result',
        payload: {
          ...session,
          message: resolvedMessage,
          products: result.products ?? [],
        },
      };
    }

    case 'error':
      return {
        type: 'error',
        payload: {
          ...session,
          message: resolveDisplayText(payload, GENERIC_ERROR_MESSAGE),
        },
      };

    case 'message':
      return {
        type: 'message',
        payload: {
          ...session,
          message: extractMessageChunkString(payload),
        },
      };

    default:
      return {
        type: 'unknown',
        event: reportedEvent,
        payload: {
          ...session,
          message: stringifyUnknownPayload(payload),
        },
      };
  }
}

function normalizeAssistantStreamEvent(fallbackName: string, payload: unknown) {
  const baseName = fallbackName || 'message';

  if (!payload || typeof payload !== 'object') {
    return {name: baseName, payload, reportedEvent: baseName};
  }

  const record = payload as Record<string, unknown>;
  const nestedType = readTrimmedString(record.type);
  const nestedEvent = readTrimmedString(record.event);
  const normalizedName = nestedType ?? baseName;
  const normalizedPayload = nestedType
    ? resolveNestedPayload(record, payload)
    : payload;

  return {
    name: normalizedName,
    payload: normalizedPayload,
    reportedEvent: nestedEvent ?? baseName,
  };
}

function resolveNestedPayload(
  record: Record<string, unknown>,
  fallback: unknown,
) {
  if ('payload' in record && record.payload !== undefined) {
    return record.payload;
  }
  if ('data' in record && record.data !== undefined) {
    return record.data;
  }
  return fallback;
}

function extractSessionIdentifier(value: unknown): SessionIdentifier {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;

    const direct =
      typeof record.sessionId === 'string' ? record.sessionId : null;
    if (direct?.trim()) {
      return {sessionId: direct.trim()};
    }

    const legacy =
      typeof record.conversationSessionId === 'string'
        ? record.conversationSessionId
        : null;
    if (legacy?.trim()) {
      return {sessionId: legacy.trim()};
    }

    return {sessionId: null};
  }
  return {sessionId: null};
}

function resolveDisplayText(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = ['message', 'content', 'status', 'detail', 'text'];

    for (const key of keys) {
      const candidate = record[key];
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (trimmed) {
          return trimmed;
        }
      }
    }
  }

  return fallback;
}

function extractMessageChunkString(value: unknown): string {
  const chunk = extractAssistantChunk(value);
  if (typeof chunk === 'string') {
    return chunk;
  }
  if (typeof value === 'string') {
    return value;
  }
  return resolveDisplayText(value, '');
}

function stringifyUnknownPayload(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function readTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}
