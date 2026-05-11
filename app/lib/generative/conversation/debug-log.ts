import type {Product} from '@coveo/headless-react/ssr-commerce';
import type {SerializableSurfaceState} from '~/lib/generative/a2ui/surface-manager';
import {resolveProductId} from '~/lib/generative/product/product-identifier';
import type {ConversationMessage} from '~/types/conversation';
import type {ConversationRecord} from './record';

function formatValue(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : '-';
}

function getValueAtPointer(data: Record<string, unknown>, path: string): unknown {
  if (!path || path === '/') {
    return data;
  }

  const segments = path
    .split('/')
    .slice(1)
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));

  let current: unknown = data;
  for (const segment of segments) {
    if (current === null || typeof current !== 'object') {
      return null;
    }

    if (Array.isArray(current)) {
      const index = parseInt(segment, 10);
      if (Number.isNaN(index) || index < 0 || index >= current.length) {
        return null;
      }
      current = current[index];
      continue;
    }

    current = (current as Record<string, unknown>)[segment];
    if (current === undefined) {
      return null;
    }
  }

  return current;
}

function collectProductCandidates(source: unknown, bucket: Product[]) {
  if (!source || typeof source !== 'object') {
    return;
  }

  if (Array.isArray(source)) {
    source.forEach((entry) => collectProductCandidates(entry, bucket));
    return;
  }

  const record = source as Record<string, unknown>;
  const productId = resolveProductId(record);
  const name =
    typeof record.ec_name === 'string' && record.ec_name.trim().length > 0
      ? record.ec_name.trim()
      : null;

  if (productId || name) {
    bucket.push(record as unknown as Product);
  }

  Object.values(record).forEach((value) => {
    if (value && typeof value === 'object') {
      collectProductCandidates(value, bucket);
    }
  });
}

function dedupeProducts(products: Product[]) {
  const seen = new Set<string>();

  return products.filter((product) => {
    const record = product as unknown as Record<string, unknown>;
    const productId = resolveProductId(record) ?? '';
    const name =
      typeof record.ec_name === 'string' && record.ec_name.trim().length > 0
        ? record.ec_name.trim()
        : '';
    const key = productId || name;

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function extractProductsFromSurfaces(
  a2uiSurfaces: Record<string, SerializableSurfaceState> | undefined,
) {
  if (!a2uiSurfaces) {
    return [];
  }

  const products: Product[] = [];
  Object.values(a2uiSurfaces).forEach((surface) => {
    collectProductCandidates(surface.dataModelData, products);
  });

  return dedupeProducts(products);
}

function formatProducts(products: Product[]) {
  if (products.length === 0) {
    return '';
  }

  const lines = products
    .map((product) => {
      const record = product as unknown as Record<string, unknown>;
      const productId = resolveProductId(record);
      const name =
        typeof record.ec_name === 'string' && record.ec_name.trim().length > 0
          ? record.ec_name.trim()
          : null;

      if (!productId && !name) {
        return null;
      }

      const brand =
        typeof record.ec_brand === 'string' && record.ec_brand.trim().length > 0
          ? record.ec_brand.trim()
          : null;
      const price =
        record.ec_promo_price != null && String(record.ec_promo_price).trim().length > 0
          ? record.ec_promo_price
          : record.ec_price;
      const currency =
        typeof record.ec_currency === 'string' && record.ec_currency.trim().length > 0
          ? record.ec_currency.trim()
          : null;
      const url =
        typeof record.clickUri === 'string' && record.clickUri.trim().length > 0
          ? record.clickUri.trim()
          : typeof record.url === 'string' && record.url.trim().length > 0
            ? record.url.trim()
            : null;

      const details = [
        brand ? `brand: ${brand}` : null,
        price !== undefined && price !== null ? `price: ${String(price)}${currency ? ` ${currency}` : ''}` : null,
        url ? `url: ${url}` : null,
      ].filter(Boolean);

      return `- ${name ?? 'Unnamed product'}${productId ? ` (${productId})` : ''}${details.length ? ` | ${details.join(' | ')}` : ''}`;
    })
    .filter(Boolean) as string[];

  return lines.length > 0 ? `\nProducts:\n${lines.join('\n')}` : '';
}

function extractFollowupActions(
  a2uiSurfaces: Record<string, SerializableSurfaceState> | undefined,
) {
  if (!a2uiSurfaces) {
    return [];
  }

  const actions: Array<{text: string; type: string}> = [];

  Object.values(a2uiSurfaces).forEach((surface) => {
    surface.components.forEach((component) => {
      if (component.catalogComponentId !== 'NextActionsBar') {
        return;
      }

      const props = (component.component as Record<string, unknown>)[
        component.catalogComponentId
      ] as Record<string, unknown> | undefined;
      const actionBinding = props?.actions as {dataBinding?: string} | undefined;
      const rawActions =
        typeof actionBinding?.dataBinding === 'string'
          ? getValueAtPointer(
              surface.dataModelData as Record<string, unknown>,
              actionBinding.dataBinding,
            )
          : null;

      if (!Array.isArray(rawActions)) {
        return;
      }

      rawActions.forEach((raw) => {
        if (!raw || typeof raw !== 'object') {
          return;
        }

        const record = raw as Record<string, unknown>;
        const text =
          typeof record.text === 'string' ? record.text.trim() : '';
        if (!text) {
          return;
        }

        actions.push({
          text,
          type:
            typeof record.type === 'string' && record.type.trim().length > 0
              ? record.type.trim()
              : 'followup',
        });
      });
    });
  });

  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.type}::${action.text}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function formatFollowupActions(actions: Array<{text: string; type: string}>) {
  if (actions.length === 0) {
    return '';
  }

  return `\nFollow-up actions:\n${actions
    .map((action) => `- [${action.type}] ${action.text}`)
    .join('\n')}`;
}

function formatMessageContent(content: string) {
  const trimmed = content.trim();
  return trimmed ? trimmed : '[no content]';
}

function formatMessageEntry(message: ConversationMessage) {
  const a2uiSurfaces = message.metadata?.a2uiSurfaces as
    | Record<string, SerializableSurfaceState>
    | undefined;
  const products = dedupeProducts([
    ...(message.metadata?.products ?? []),
    ...extractProductsFromSurfaces(a2uiSurfaces),
  ]);
  const productBlock = formatProducts(products);
  const followupBlock = formatFollowupActions(
    extractFollowupActions(a2uiSurfaces),
  );

  return [formatMessageContent(message.content), productBlock, followupBlock]
    .filter(Boolean)
    .join('\n');
}

function isVisibleMessage(message: ConversationMessage) {
  if (message.isAutoRetry) {
    return false;
  }

  const isEphemeralStatusMessage =
    Boolean(message.ephemeral) &&
    (message.kind === 'status' || message.kind === 'tool');

  return !isEphemeralStatusMessage;
}

export function buildConversationDebugLog(
  conversation: ConversationRecord,
  options: {currentUrl?: string} = {},
) {
  const visibleMessages = conversation.messages.filter(isVisibleMessage);
  const lines = [
    '# Conversation Debug Log',
    '',
    `Title: ${conversation.title}`,
    `Local ID: ${conversation.localId}`,
    `Session ID: ${formatValue(conversation.sessionId)}`,
    `Conversation Token: ${formatValue(conversation.conversationToken)}`,
    `Created At: ${conversation.createdAt}`,
    `Updated At: ${conversation.updatedAt}`,
    `URL: ${formatValue(options.currentUrl)}`,
    '',
    '## Messages',
  ];

  if (visibleMessages.length === 0) {
    lines.push('', 'No messages.');
    return lines.join('\n');
  }

  visibleMessages.forEach((message, index) => {
    lines.push(
      '',
      `${index + 1}. [${message.role}] [${message.kind}] ${message.createdAt}`,
      formatMessageEntry(message),
    );
  });

  return lines.join('\n');
}
