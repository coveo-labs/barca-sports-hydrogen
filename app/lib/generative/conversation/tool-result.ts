import type {Product} from '@coveo/headless-react/ssr-commerce';

type ToolResultParse = {
  message: string | null;
  products: Product[] | null;
};

export function parseToolResultPayload(raw: unknown): ToolResultParse {
  let message: string | null = null;

  if (typeof raw === 'object' && raw !== null) {
    const candidate = raw as Record<string, unknown>;
    const value = candidate.message ?? candidate.status ?? candidate.text;
    if (typeof value === 'string' && value.trim()) {
      message = value.trim();
    }
  } else if (typeof raw === 'string') {
    message = raw.trim();
  }

  const products = extractProductArray(raw);

  return {
    message: message?.length ? message : null,
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
