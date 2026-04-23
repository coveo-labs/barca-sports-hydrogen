import type {ActionFunctionArgs} from 'react-router';
import {ServerSideNavigatorContextProvider} from '~/lib/coveo/navigator.provider';
import {getCookieFromRequest} from '~/lib/shopify/session';
import {
  AGENT_SELECTION_HEADER,
  COVEO_FEATURE_FLAG_OVERRIDE_HEADER,
  getFeatureFlagOverridesForAgentRuntime,
  normalizeAgentRuntimeSelection,
  type AgentRuntimeSelection,
} from '~/lib/generative/agent-runtime';
import type {
  ConversationMessage,
  ConversationSummary,
} from '~/types/conversation';
import {CONVERSATIONS_SESSION_KEY} from '~/types/conversation';

const AGENTIC_DEV_BASE_URL =
  'https://platformdev.cloud.coveo.com/rest/organizations/barcasportsmcy01fvu/commerce/unstable/agentic';
const AGENTIC_PROD_BASE_URL =
  'https://platform.cloud.coveo.com/rest/organizations/barcagroupproductionkwvdy6lp/commerce/unstable/agentic';

const MAX_CONVERSATIONS = 50;
const MAX_CONTENT_LENGTH = 4000;
const DEFAULT_TRACKING_ID = 'market_88728731922';
type AgenticAccessTokenEnvVar =
  | 'AGENTIC_ACCESS_TOKEN_DEV'
  | 'AGENTIC_ACCESS_TOKEN_PROD';

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

  const requestedAgentRuntime = resolveRequestedAgentRuntime(request);
  const runtimeConfig = resolveAgenticRuntimeConfig(
    requestedAgentRuntime,
    context,
  );

  console.info('[api.agentic.conversation] streaming conversation', {
    hasSessionId: Boolean(body.sessionId),
    hasConversationToken: Boolean(body.conversationToken),
    requestedAgentRuntime,
    targetEnvironment: runtimeConfig.targetEnvironment,
    featureFlagOverrideApplied: Boolean(runtimeConfig.featureFlagOverrides),
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
    conversationToken: body.conversationToken || undefined,
    targetEngine: 'AGENT_CORE',
  } satisfies Record<string, unknown>;

  const abortController = new AbortController();
  request.signal.addEventListener('abort', () => abortController.abort());

  const agenticResponse = await streamAgenticConversation(payload, {
    signal: abortController.signal,
    baseUrl: runtimeConfig.baseUrl,
    accessToken: runtimeConfig.accessToken,
    featureFlagOverrides: runtimeConfig.featureFlagOverrides,
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
    conversationToken:
      typeof conversation.conversationToken === 'string'
        ? conversation.conversationToken
        : null,
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

function resolveContextAgenticAccessToken(
  context: ActionFunctionArgs['context'],
  envVarName: AgenticAccessTokenEnvVar,
): string | undefined {
  const token = (
    context as {
      env?: Partial<Record<AgenticAccessTokenEnvVar, string>>;
    }
  )?.env?.[envVarName];

  return typeof token === 'string' && token.trim() ? token : undefined;
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
  conversationToken?: string;
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
  baseUrl: string;
  signal?: AbortSignal;
  accessToken: string;
  featureFlagOverrides?: Record<string, boolean> | null;
};

async function streamAgenticConversation(
  payload: unknown,
  options: StreamAgenticConversationOptions,
): Promise<Response> {
  const url = new URL(`${options.baseUrl}/converse`);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.accessToken}`,
    'Content-Type': 'application/json',
  };

  if (options.featureFlagOverrides) {
    headers[COVEO_FEATURE_FLAG_OVERRIDE_HEADER] = JSON.stringify(
      options.featureFlagOverrides,
    );
  }

  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: options.signal,
  });
}

function resolveRequestedAgentRuntime(request: Request): AgentRuntimeSelection {
  return normalizeAgentRuntimeSelection(
    request.headers.get(AGENT_SELECTION_HEADER),
  );
}

function resolveAgenticRuntimeConfig(
  requestedAgentRuntime: AgentRuntimeSelection,
  context: ActionFunctionArgs['context'],
) {
  if (requestedAgentRuntime === 'agent-smith-commerce-agent') {
    return {
      targetEnvironment: 'prod' as const,
      baseUrl: AGENTIC_PROD_BASE_URL,
      accessToken: getRequiredAgenticAccessToken(
        context,
        'AGENTIC_ACCESS_TOKEN_PROD',
      ),
      featureFlagOverrides: null,
    };
  }

  return {
    targetEnvironment: 'dev' as const,
    baseUrl: AGENTIC_DEV_BASE_URL,
    accessToken: getRequiredAgenticAccessToken(
      context,
      'AGENTIC_ACCESS_TOKEN_DEV',
    ),
    featureFlagOverrides:
      getFeatureFlagOverridesForAgentRuntime(requestedAgentRuntime),
  };
}

function getRequiredAgenticAccessToken(
  context: ActionFunctionArgs['context'],
  envVarName: AgenticAccessTokenEnvVar,
) {
  const contextToken = resolveContextAgenticAccessToken(context, envVarName);
  if (contextToken) {
    return contextToken;
  }

  const resolved = resolveAgenticAccessToken(envVarName);
  if (resolved) {
    return resolved;
  }

  throw new Error(
    `Missing ${envVarName} environment variable for Agentic API access.`,
  );
}

function resolveAgenticAccessToken(envVarName: AgenticAccessTokenEnvVar) {
  return typeof process !== 'undefined'
    ? process?.env?.[envVarName]
    : undefined;
}
