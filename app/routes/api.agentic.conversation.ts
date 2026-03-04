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
// [LOCAL TESTING] - only needed for local agent payload
// const DEFAULT_PLATFORM_URL = new URL(AGENTIC_BASE_URL).origin;
// const DEFAULT_ORGANIZATION_ID = extractOrganizationId(AGENTIC_BASE_URL);
// const DEFAULT_PLATFORM_URL = 'https://platformdev.cloud.coveo.com';
// const DEFAULT_ORGANIZATION_ID = 'barcasportsmcy01fvu';

const MAX_CONVERSATIONS = 50;
const MAX_CONTENT_LENGTH = 4000;
const DEFAULT_TRACKING_ID = 'market_88728731922';
// [LOCAL TESTING]
// const LOCAL_AGENT_URL = 'http://localhost:8080/invocations';
// const LOCAL_COVEO_CONFIG = {
//   accessToken: 'xxdf4c168b-bfc4-46bf-ba3d-5449a8c62469',
//   organizationId: 'barcasportsmcy01fvu',
//   platformUrl: 'https://platformdev.cloud.coveo.com',
//   clientId: '02e1fe20-d824-4b75-b1d6-a9a37fcbbb40',
//   trackingId: 'market_88728731922',
//   language: 'en',
//   locale: 'en-US',
//   country: 'US',
//   currency: 'USD',
// };

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

  const navigatorContext = new ServerSideNavigatorContextProvider(request);
  const visitorHasCookie = Boolean(
    getCookieFromRequest(request, 'coveo_visitorId'),
  );
  const locale = body.locale ?? {};
  // [LOCAL TESTING] // const localAgentUrl = LOCAL_AGENT_URL;
  const accessToken = extractAgenticAccessToken(context);
  console.info('[api.agentic.conversation] streaming conversation', {
    hasSessionId: Boolean(body.sessionId),
    // localAgentUrl, // [LOCAL TESTING]
  });

  const payload = {
    message: body.message,
    ...(body.sessionId && {sessionId: body.sessionId}),
    trackingId: body.trackingId || DEFAULT_TRACKING_ID,
    context: {
      ...(body.context ?? {}),
      language: locale.language || 'en',
      country: locale.country || 'US',
      currency: locale.currency || 'USD',
      user: {
        userAgent: navigatorContext.userAgent || '',
      },
      view: {
        url: body.view?.url || navigatorContext.location,
        referrer: body.view?.referrer || navigatorContext.referrer || undefined,
      },
      cart: Array.isArray(body.cart) ? body.cart : [],
    },
  };
  // [LOCAL TESTING] - buildLocalAgentPayload
  // let payload: Record<string, unknown>;
  // try {
  //   payload = await buildLocalAgentPayload(body, navigatorContext);
  // } catch (error) {
  //   const message =
  //     error instanceof Error ? error.message : 'Invalid local payload.';
  //   return Response.json({error: message}, {status: 400});
  // }

  const abortController = new AbortController();
  request.signal.addEventListener('abort', () => abortController.abort());

  const agenticResponse = await streamAgenticConversation(payload, {
    accessToken,
    signal: abortController.signal,
  });
  // [LOCAL TESTING] - streamLocalAgentConversation
  // const agenticResponse = await streamLocalAgentConversation(
  //   localAgentUrl,
  //   payload,
  //   {
  //     signal: abortController.signal,
  //   },
  // );

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
  context?: Record<string, unknown>;
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
  accessToken?: string;
  signal?: AbortSignal;
};

// [LOCAL TESTING]
// type StreamLocalConversationOptions = {
//   signal?: AbortSignal;
// };

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

// [LOCAL TESTING]
// async function streamLocalAgentConversation(
//   localUrl: string,
//   payload: unknown,
//   options: StreamLocalConversationOptions = {},
// ): Promise<Response> {
//   return fetch(localUrl, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       Accept: 'text/event-stream',
//     },
//     body: JSON.stringify(payload),
//     signal: options.signal,
//   });
// }

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

// [LOCAL TESTING]
// function resolveLocalAgentUrl(
//   context: ActionFunctionArgs['context'],
// ): string | null {
//   const fromContext = (context as {env?: {LOCAL_AGENT_URL?: string}})?.env
//     ?.LOCAL_AGENT_URL;
//   if (fromContext && fromContext.trim()) {
//     return fromContext.trim();
//   }
//
//   if (typeof process !== 'undefined' && process?.env?.LOCAL_AGENT_URL) {
//     return process.env.LOCAL_AGENT_URL;
//   }
//
//   return null;
// }

// [LOCAL TESTING]
// function extractOrganizationId(url: string): string {
//   const match = url.match(/\/organizations\/([^/]+)/);
//   return match?.[1] ?? '';
// }

// [LOCAL TESTING]
// function buildLocalAgentPayload(
//   body: ConversationStreamPayload,
//   navigatorContext: ServerSideNavigatorContextProvider,
// ): Promise<Record<string, unknown>> {
//   return createLocalAgentPayload(body, navigatorContext);
// }
//
// async function createLocalAgentPayload(
//   body: ConversationStreamPayload,
//   navigatorContext: ServerSideNavigatorContextProvider,
// ): Promise<Record<string, unknown>> {
//   const locale = body.locale ?? {};
//   const localCoveo = LOCAL_COVEO_CONFIG;
//   const localContext: Record<string, unknown> = {};
//
//   return {
//     prompt: body.message,
//     coveo: {
//       ...localCoveo,
//       organizationId: localCoveo.organizationId || DEFAULT_ORGANIZATION_ID,
//       platformUrl: localCoveo.platformUrl || DEFAULT_PLATFORM_URL,
//       clientId: localCoveo.clientId || navigatorContext.clientId,
//       trackingId: localCoveo.trackingId || DEFAULT_TRACKING_ID,
//       language: localCoveo.language || locale.language || 'en',
//       locale: localCoveo.locale || locale.language || 'en',
//       country: localCoveo.country || locale.country || 'US',
//       currency: localCoveo.currency || locale.currency || 'USD',
//     },
//     context: {
//       ...localContext,
//       user: {
//         userAgent: navigatorContext.userAgent || '',
//       },
//       view: {
//         url: body.view?.url || navigatorContext.location,
//         referrer: body.view?.referrer || navigatorContext.referrer || undefined,
//       },
//       cart: Array.isArray(body.cart) ? body.cart : [],
//     },
//     sessionId: body.sessionId || undefined,
//   };
// }
