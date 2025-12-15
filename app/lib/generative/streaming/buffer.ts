import {findEventBoundary, getBoundaryLength} from '~/lib/generative/chat';

export type RawSSEEvent = {
  event: string;
  data: string;
};

export type EventProcessor = (event: RawSSEEvent) => void;

export function createBufferProcessor(onEvent: EventProcessor) {
  let buffer = '';

  const parseRawEvent = (rawEvent: string): RawSSEEvent | null => {
    if (!rawEvent.trim()) {
      return null;
    }

    const lines = rawEvent.split(/\r?\n/);
    let eventType = 'message';
    const dataLines: string[] = [];

    for (const line of lines) {
      if (!line || line.startsWith(':')) {
        continue;
      }

      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    return {
      event: eventType,
      data: dataLines.join('\n'),
    };
  };

  const processRawEvent = (rawEvent: string) => {
    const parsed = parseRawEvent(rawEvent);
    if (parsed) {
      onEvent(parsed);
    }
  };

  const extractAndProcessEvents = () => {
    while (true) {
      const boundaryIndex = findEventBoundary(buffer);
      if (boundaryIndex === -1) {
        break;
      }

      const delimiterLength = getBoundaryLength(buffer, boundaryIndex);
      const rawEvent = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + delimiterLength);

      processRawEvent(rawEvent);
    }
  };

  return {
    processChunk(chunk: string) {
      buffer += chunk;
      extractAndProcessEvents();
    },

    flush() {
      if (buffer.trim()) {
        processRawEvent(buffer);
        buffer = '';
      }
    },

    clear() {
      buffer = '';
    },
  };
}

export async function processSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  processor: ReturnType<typeof createBufferProcessor>,
) {
  const decoder = new TextDecoder();

  while (true) {
    const {value, done} = await reader.read();

    if (done) {
      processor.flush();
      break;
    }

    const chunk = decoder.decode(value, {stream: true});
    processor.processChunk(chunk);
  }
}
