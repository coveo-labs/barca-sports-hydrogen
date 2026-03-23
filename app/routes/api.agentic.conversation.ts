import type {ActionFunctionArgs} from 'react-router';
import discoveryBasicPolicy from '../../reference/commerce-agent/discovery-basic.json';
import {ServerSideNavigatorContextProvider} from '~/lib/coveo/navigator.provider';
import {getCookieFromRequest} from '~/lib/shopify/session';
import type {
  ConversationMessage,
  ConversationSummary,
} from '~/types/conversation';
import {CONVERSATIONS_SESSION_KEY} from '~/types/conversation';

const MAX_CONVERSATIONS = 50;
const MAX_CONTENT_LENGTH = 4000;
const DEFAULT_TRACKING_ID = 'market_88728731922';
const DEFAULT_LOCAL_AGENT_URL = 'http://localhost:8080/invocations';
const DEFAULT_COVEO_PLATFORM_URL = 'https://platformdev.cloud.coveo.com';
const DEFAULT_COVEO_ORGANIZATION_ID = 'barcasportsmcy01fvu';

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
  const sessionId = body.sessionId || createConversationId();
  const historyMessages = getInvocationMessages(
    getStoredConversationById(context.session, body.sessionId),
  );
  const localeTag = formatLocaleTag(locale);

  const payload = {
    messages: [
      ...historyMessages,
      {
        id: createConversationId(),
        role: 'user',
        content: body.message,
      },
    ],
    threadId: sessionId,
    runId: createConversationId(),
    state: {},
    tools: [],
    context: [],
    forwardedProps: {
      coveo: {
        accessToken: resolveCoveoAccessToken(context),
        organizationId: resolveCoveoOrganizationId(context),
        platformUrl: resolveCoveoPlatformUrl(context),
        trackingId: body.trackingId || DEFAULT_TRACKING_ID,
        clientId: navigatorContext.clientId,
        locale: localeTag,
        currency: locale.currency || 'USD',
        timezone: locale.timezone,
        context: {
          view: {
            url: body.view?.url || navigatorContext.location,
            referrer:
              body.view?.referrer || navigatorContext.referrer || undefined,
          },
        },
      },
      policy: discoveryBasicPolicy,
    },
  } satisfies LocalCommerceAgentPayload;

  const abortController = new AbortController();
  request.signal.addEventListener('abort', () => abortController.abort());

  const agenticResponse = await streamAgenticConversation(payload, {
    signal: abortController.signal,
    agentUrl: resolveLocalAgentUrl(context),
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

function getStoredConversationById(
  session: HydrogenSessionWithPending,
  sessionId?: string,
) {
  if (!sessionId) {
    return null;
  }

  return (
    getStoredConversations(session).find(
      (conversation) => conversation.id === sessionId,
    ) ?? null
  );
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
    timezone?: string;
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
  const cryptoObject = globalThis.crypto;
  if (cryptoObject && typeof cryptoObject.randomUUID === 'function') {
    return cryptoObject.randomUUID();
  }

  return `conv_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

type StreamAgenticConversationOptions = {
  signal?: AbortSignal;
  agentUrl?: string | null;
};

async function streamAgenticConversation(
  payload: LocalCommerceAgentPayload,
  options: StreamAgenticConversationOptions = {},
): Promise<Response> {
  const url = pickLocalAgentUrl(options.agentUrl);

  return fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  });
}

function formatLocaleTag(locale: ConversationStreamPayload['locale']) {
  const language = locale?.language?.trim().toLowerCase() || 'en';
  const country = locale?.country?.trim().toUpperCase() || 'US';
  return `${language}-${country}`;
}

function getInvocationMessages(
  conversation: ConversationSummary | null,
): LocalCommerceAgentMessage[] {
  if (!conversation) {
    return [];
  }

  return conversation.messages
    .filter((message) => {
      if (!message.content.trim()) {
        return false;
      }

      if (message.role === 'user') {
        return true;
      }

      if (message.role === 'assistant') {
        return message.kind === 'text';
      }

      return message.role === 'system';
    })
    .map((message) => {
      const role =
        message.role === 'system'
          ? 'system'
          : message.role === 'assistant'
            ? 'assistant'
            : 'user';

      return {
        id: message.id,
        role,
        content: message.content,
      };
    });
}

function resolveLocalAgentUrl(context: ActionFunctionArgs['context']) {
  const candidate = (context as {env?: {LOCAL_AGENT_URL?: string}})?.env
    ?.LOCAL_AGENT_URL;

  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate;
  }

  if (typeof process !== 'undefined' && process?.env?.LOCAL_AGENT_URL) {
    return process.env.LOCAL_AGENT_URL;
  }

  return DEFAULT_LOCAL_AGENT_URL;
}

function pickLocalAgentUrl(candidate?: string | null) {
  const trimmedCandidate = candidate?.trim();
  if (trimmedCandidate) {
    return trimmedCandidate;
  }

  return DEFAULT_LOCAL_AGENT_URL;
}

function resolveCoveoAccessToken(context: ActionFunctionArgs['context']) {
  const candidate = (context as {env?: {AGENTIC_ACCESS_TOKEN?: string}})?.env
    ?.AGENTIC_ACCESS_TOKEN;

  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate;
  }

  if (typeof process !== 'undefined' && process?.env?.AGENTIC_ACCESS_TOKEN) {
    return process.env.AGENTIC_ACCESS_TOKEN;
  }

  throw new Error(
    'Missing AGENTIC_ACCESS_TOKEN environment variable for local commerce agent access.',
  );
}

function resolveCoveoOrganizationId(context: ActionFunctionArgs['context']) {
  const candidate = (context as {env?: {COVEO_ORGANIZATION_ID?: string}})?.env
    ?.COVEO_ORGANIZATION_ID;

  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate;
  }

  if (
    typeof process !== 'undefined' &&
    process?.env?.COVEO_ORGANIZATION_ID
  ) {
    return process.env.COVEO_ORGANIZATION_ID;
  }

  return DEFAULT_COVEO_ORGANIZATION_ID;
}

function resolveCoveoPlatformUrl(context: ActionFunctionArgs['context']) {
  const candidate = (context as {env?: {COVEO_PLATFORM_URL?: string}})?.env
    ?.COVEO_PLATFORM_URL;

  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate;
  }

  if (typeof process !== 'undefined' && process?.env?.COVEO_PLATFORM_URL) {
    return process.env.COVEO_PLATFORM_URL;
  }

  return DEFAULT_COVEO_PLATFORM_URL;
}

type LocalCommerceAgentMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type LocalCommerceAgentPayload = {
  messages: LocalCommerceAgentMessage[];
  threadId: string;
  runId: string;
  state: Record<string, unknown>;
  tools: unknown[];
  context: unknown[];
  forwardedProps: {
    coveo: {
      accessToken: string;
      organizationId: string;
      platformUrl: string;
      trackingId: string;
      clientId: string;
      locale: string;
      currency: string;
      timezone?: string;
      context: {
        view: {
          url: string;
          referrer?: string;
        };
      };
    };
    policy: typeof discoveryBasicPolicy;
  };
};
