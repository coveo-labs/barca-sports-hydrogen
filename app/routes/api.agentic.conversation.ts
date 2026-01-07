import type {ActionFunctionArgs} from 'react-router';
import {ServerSideNavigatorContextProvider} from '~/lib/coveo/navigator.provider';
import {getCookieFromRequest} from '~/lib/shopify/session';
import type {
  ConversationMessage,
  ConversationSummary,
} from '~/types/conversation';
import {CONVERSATIONS_SESSION_KEY} from '~/types/conversation';

const AGENTIC_BASE_URL =
  'https://platformdev.cloud.coveo.com/rest/organizations/barcasportsmcy01fvu/commerce/unstable/agentic';

const MAX_CONVERSATIONS = 50;
const MAX_CONTENT_LENGTH = 4000;
const DEFAULT_TRACKING_ID = 'market_88728731922';

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method === 'POST') {
    console.info('[api.agentic.conversation] POST received');
    return handleStreamConversation(request, context);
  }

  if (request.method === 'PUT') {
    console.info('[api.agentic.conversation] PUT received');
    return handlePersistConversation(request, context.session);
  }

  if (request.method === 'DELETE') {
    console.info('[api.agentic.conversation] DELETE received');
    return handleDeleteConversation(request, context.session);
  }

  return new Response(null, {
    status: 405,
    headers: {
      Allow: 'POST, PUT, DELETE',
    },
  });
}

async function handleStreamConversation(
  request: Request,
  context: ActionFunctionArgs['context'],
) {
  const body = (await request
    .json()
    .catch(() => null)) as ConversationStreamPayload | null;

  if (!body || typeof body.message !== 'string' || !body.message.trim()) {
    console.warn('[api.agentic.conversation] missing message payload');
    return Response.json(
      {error: 'A non-empty message is required.'},
      {
        status: 400,
      },
    );
  }

  console.info('[api.agentic.conversation] streaming conversation', {
    hasSessionId: Boolean(body.sessionId),
  });

  const navigatorContext = new ServerSideNavigatorContextProvider(request);
  const visitorHasCookie = Boolean(
    getCookieFromRequest(request, 'coveo_visitorId'),
  );
  const locale = body.locale ?? {};

  const payload = {
    trackingId: body.trackingId || DEFAULT_TRACKING_ID,
    language: (locale.language || 'en').toLowerCase(),
    country: (locale.country || 'US').toUpperCase(),
    currency: locale.currency || 'USD',
    clientId: navigatorContext.clientId,
    message: body.message,
    context: {
      user: {
        userAgent: navigatorContext.userAgent || '',
      },
      view: {
        url: body.view?.url || navigatorContext.location,
        referrer: body.view?.referrer || navigatorContext.referrer || undefined,
      },
      cart: Array.isArray(body.cart) ? body.cart : [],
    },
    conversationSessionId: body.sessionId || undefined,
    targetEngine: 'AGENT_CORE',
  } satisfies Record<string, unknown>;

  const abortController = new AbortController();
  request.signal.addEventListener('abort', () => abortController.abort());

  const agenticResponse = await streamAgenticConversation(payload, {
    signal: abortController.signal,
    accessToken: extractAgenticAccessToken(context),
  });

  console.info('[api.agentic.conversation] upstream response', {
    status: agenticResponse.status,
  });

  if (!agenticResponse.ok || !agenticResponse.body) {
    const errorPayload = await agenticResponse
      .text()
      .catch(() => 'Agentic API returned an unexpected error.');

    return new Response(errorPayload, {
      status: agenticResponse.status,
      headers: {
        'Content-Type':
          agenticResponse.headers.get('Content-Type') || 'text/plain',
      },
    });
  }

  const upstreamReader = agenticResponse.body.getReader();

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const {done, value} = await upstreamReader.read();
        if (done) {
          controller.close();
          return;
        }

        if (value) {
          controller.enqueue(value);
        }
      } catch (error) {
        controller.error(error);
      }
    },
    cancel(reason) {
      abortController.abort();
      upstreamReader.cancel(reason).catch(() => undefined);
    },
  });

  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  if (!visitorHasCookie) {
    headers.set('Set-Cookie', navigatorContext.getCookieHeader());
  }

  return new Response(stream, {
    status: agenticResponse.status,
    headers,
  });
}

async function handlePersistConversation(
  request: Request,
  session: HydrogenSessionWithPending,
) {
  const body = (await request
    .json()
    .catch(() => null)) as PersistConversationPayload | null;

  if (!body?.conversation) {
    return Response.json(
      {error: 'Conversation payload is required.'},
      {
        status: 400,
      },
    );
  }

  const sanitized = sanitizeConversation(body.conversation);
  if (!sanitized.id) {
    return Response.json(
      {error: 'Conversation id is required.'},
      {
        status: 400,
      },
    );
  }

  const conversations = getStoredConversations(session);
  const updated = upsertConversation(conversations, sanitized);

  session.set(CONVERSATIONS_SESSION_KEY, updated);

  const headers: Record<string, string> = {};
  if (session.isPending) {
    headers['Set-Cookie'] = await session.commit();
  }

  return Response.json(
    {ok: true},
    Object.keys(headers).length ? {headers} : undefined,
  );
}

async function handleDeleteConversation(
  request: Request,
  session: HydrogenSessionWithPending,
) {
  const body = (await request
    .json()
    .catch(() => null)) as DeleteConversationPayload | null;

  if (!body?.id) {
    return Response.json(
      {error: 'Conversation id is required.'},
      {
        status: 400,
      },
    );
  }

  const conversations = getStoredConversations(session);
  const filtered = conversations.filter(
    (conversation) => conversation.id !== body.id,
  );

  if (filtered.length === conversations.length) {
    return Response.json({ok: true});
  }

  session.set(CONVERSATIONS_SESSION_KEY, filtered);

  const headers: Record<string, string> = {};
  if (session.isPending) {
    headers['Set-Cookie'] = await session.commit();
  }

  return Response.json(
    {ok: true},
    Object.keys(headers).length ? {headers} : undefined,
  );
}

function sanitizeConversation(
  conversation: ConversationSummary,
): ConversationSummary {
  const title = (conversation.title || 'Conversation').slice(0, 120);
  const createdAt = conversation.createdAt || new Date().toISOString();
  const updatedAt = conversation.updatedAt || createdAt;

  const messages = Array.isArray(conversation.messages)
    ? conversation.messages
        .filter((message): message is ConversationMessage =>
          Boolean(message && typeof message.content === 'string'),
        )
        .map((message) => sanitizeMessage(message))
    : [];

  return {
    id: conversation.id,
    title,
    createdAt,
    updatedAt,
    messages,
  };
}

function sanitizeMessage(message: ConversationMessage): ConversationMessage {
  const allowedRoles: ConversationMessage['role'][] = [
    'user',
    'assistant',
    'system',
    'tool',
  ];

  const role = allowedRoles.includes(message.role)
    ? message.role
    : ('assistant' as ConversationMessage['role']);

  const contentSource =
    typeof message.content === 'string' ? message.content : '';
  const content = contentSource.slice(0, MAX_CONTENT_LENGTH);

  const allowedKinds: ConversationMessage['kind'][] = [
    'text',
    'status',
    'tool',
    'products',
    'error',
  ];
  const kind = allowedKinds.includes(message.kind) ? message.kind : 'text';

  const metadata = message.metadata;

  return {
    id: message.id || createConversationId(),
    role,
    content,
    createdAt: message.createdAt || new Date().toISOString(),
    kind,
    metadata,
  };
}

function extractAgenticAccessToken(
  context: ActionFunctionArgs['context'],
): string | undefined {
  const token = (context as {env?: {AGENTIC_ACCESS_TOKEN?: string}})?.env
    ?.AGENTIC_ACCESS_TOKEN;

  if (typeof token === 'string' && token.trim()) {
    return token;
  }

  return undefined;
}

function upsertConversation(
  conversations: ConversationSummary[],
  conversation: ConversationSummary,
) {
  const copy = [...conversations];
  const index = copy.findIndex((current) => current.id === conversation.id);

  if (index >= 0) {
    copy[index] = conversation;
  } else {
    copy.unshift(conversation);
  }

  return copy.slice(0, MAX_CONVERSATIONS);
}

function getStoredConversations(
  session: HydrogenSessionWithPending,
): ConversationSummary[] {
  const stored = session.get(CONVERSATIONS_SESSION_KEY);

  if (!Array.isArray(stored)) {
    return [];
  }

  return stored
    .filter(isConversationSummary)
    .map((conversation) => sanitizeConversation(conversation));
}

type HydrogenSessionWithPending = {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  commit(): Promise<string>;
  isPending: boolean;
};

type ConversationStreamPayload = {
  message?: string;
  trackingId?: string;
  sessionId?: string;
  locale?: {
    language?: string;
    country?: string;
    currency?: string;
  };
  view?: {
    url?: string;
    referrer?: string;
  };
  cart?: unknown[];
};

type PersistConversationPayload = {
  conversation?: ConversationSummary;
};

type DeleteConversationPayload = {
  id?: string;
};

function isConversationSummary(value: unknown): value is ConversationSummary {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as {
    id?: unknown;
    title?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
    messages?: unknown;
  };

  return typeof candidate.id === 'string' && Array.isArray(candidate.messages);
}

function createConversationId() {
  const globalWithCrypto = globalThis as {
    crypto?: {randomUUID?: () => string};
  };

  const randomUUID = globalWithCrypto.crypto?.randomUUID;
  if (typeof randomUUID === 'function') {
    return randomUUID();
  }

  return `conv_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

type StreamAgenticConversationOptions = {
  signal?: AbortSignal;
  accessToken?: string | null;
};

async function streamAgenticConversation(
  payload: unknown,
  options: StreamAgenticConversationOptions = {},
): Promise<Response> {
  const accessToken = pickAccessToken(options.accessToken);
  const url = new URL(`${AGENTIC_BASE_URL}/converse`);

  return fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  });
}

function pickAccessToken(candidate?: string | null) {
  const trimmedCandidate = candidate?.trim();
  if (trimmedCandidate) {
    return trimmedCandidate;
  }

  const resolved = resolveAgenticAccessToken();
  if (resolved) {
    return resolved;
  }

  throw new Error(
    'Missing AGENTIC_ACCESS_TOKEN environment variable for Agentic API access.',
  );
}

function resolveAgenticAccessToken() {
  if (typeof process !== 'undefined' && process?.env?.AGENTIC_ACCESS_TOKEN) {
    return process.env.AGENTIC_ACCESS_TOKEN;
  }

  return undefined;
}
