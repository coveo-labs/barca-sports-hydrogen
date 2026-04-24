# Conversational Flow Architecture

This document is the main readme for the conversational flow in this repo.

Use this doc when you need to understand:

- where the conversational flow starts
- how the frontend calls the agentic endpoint
- how streamed events become chat messages
- where structured response rendering happens
- where to make changes if you need to extend or instrument the flow

For the A2UI-specific rendering pipeline, see
[CONVERSATIONAL_A2UI_RENDERING.md](./CONVERSATIONAL_A2UI_RENDERING.md).

## 1. Scope

In this codebase, the "conversational flow" means the generative assistant
experience rendered at:

- `app/routes/($locale).generative.tsx`

It includes:

- conversation state
- sending user messages
- streaming assistant responses
- reasoning/thinking state
- structured response rendering through A2UI surfaces
- chat transcript rendering

## 2. High-Level Flow

```text
User submits a message
  -> useSendMessage
  -> useAssistantStreaming
  -> POST /api/agentic/conversation
  -> server-side agent adapter
  -> upstream agent SSE stream
  -> streaming parser
  -> AssistantStreamSession
  -> ConversationStateUpdater
  -> visible messages + thinking state + a2uiSurfaces metadata
  -> buildTranscriptItems
  -> MessageBubble
  -> ResponseContent renderers/components
```

## 3. File Map

### Route and page orchestration

- `app/routes/($locale).generative.tsx`
- `app/routes/api.agentic.conversation.ts`

### Shared conversational state

- `app/lib/generative/context.tsx`
- `app/lib/generative/conversation/`
- `app/lib/generative/view/`
- `app/lib/generative/use-assistant-streaming.ts`
- `app/lib/generative/use-auto-retry.ts`

### Streaming and turn assembly

- `app/lib/generative/streaming/`
- `app/lib/generative/session/`
- `app/lib/generative/adapters/a2ui/`

### Transcript derivation

- `app/lib/generative/transcript/build-transcript-items.ts`
- `app/lib/generative/transcript/types.ts`

### Response rendering

- `app/components/Generative/ConversationTranscript.tsx`
- `app/components/Generative/ResponseContent/MessageBubble.tsx`
- `app/components/Generative/ResponseContent/rendering/`
- `app/components/Generative/ResponseContent/components/`

### A2UI data layer

- `app/lib/generative/a2ui/message-processor.ts`
- `app/lib/generative/a2ui/surface-manager.ts`
- `app/lib/generative/a2ui/data-model-store.ts`
- `app/lib/generative/a2ui/data-binding-resolver.ts`

## 4. Client Entry Point

The conversational page is assembled in:

- `app/routes/($locale).generative.tsx`

That route wires together:

- `useConversationState` for stored/local conversation records
- `useConversationUrlSync` for the `conversationId` query param
- `useAssistantStreaming` for the live SSE request
- `useMessageDerivation` for filtering/deriving visible message state
- `useThinkingState` for reasoning panel expansion state
- `useConversationScroll` for transcript scroll behavior
- `useSendMessage` for creating the user turn and starting streaming
- `GenerativeProvider` for passing the assembled state/actions down to the UI

This route is the best place to start if you want the full picture.

## 5. Agentic Endpoint

The frontend always streams through:

- `app/routes/api.agentic.conversation.ts`

Current behavior:

- accepts a frontend payload with:
  - `message`
  - `sessionId`
  - `conversationToken`
  - `locale`
  - `view`
- looks up existing stored conversation history for the session
- adapts the frontend request into the backend agent contract
- forwards the request to the backend streaming agent
- proxies the upstream SSE response back to the browser

### Important request shaping

The route is responsible for shaping the upstream request, including:

- `messages`
- conversation/session identifiers
- locale/view context
- any backend-specific forwarded properties required by the active agent

### Conversation continuity

Conversation continuation uses a pair of values:

- `sessionId`
- `conversationToken`

Current client behavior is:

- first turn sends no `conversationToken`
- follow-up turns send both `sessionId` and `conversationToken`
- the token is treated as opaque server continuation state
- the latest token is captured from SSE lifecycle events and written back to the
  active conversation record

If you need to change how the agent is invoked, start in:

- `app/routes/api.agentic.conversation.ts`

## 6. Streaming Architecture

### Transport and parsing

The browser-side stream entry point is:

- `app/lib/generative/use-assistant-streaming.ts`

That hook:

- opens the `fetch` request to `/api/agentic/conversation`
- reads the SSE body
- parses raw chunks via:
  - `app/lib/generative/streaming/buffer.ts`
  - `app/lib/generative/streaming/sse-parser.ts`
- sends normalized events into `AssistantStreamSession`

### Turn assembly

The main turn state machine is:

- `app/lib/generative/session/assistant-stream-session.ts`

This class is responsible for:

- creating or ensuring the assistant bubble for the current turn
- collecting the final assistant text
- handling `REASONING_MESSAGE_*`
- choosing the final reasoning block that becomes visible assistant text
- recording thinking updates
- reacting to tool/status/custom events
- asking the structured-response adapter to patch metadata for A2UI content

It also owns streamed conversation continuity updates from lifecycle events:

- `turn_started`
- `turn_complete`

Those events are where the latest `conversationToken` is captured for the next
turn.

### React state mutation boundary

The only layer that mutates `ConversationRecord[]` during streaming is:

- `app/lib/generative/session/conversation-state-updater.ts`

That separation is intentional. The stream/session code decides what should
happen; the updater applies it to conversation state.

## 7. Conversation State Structure

Conversation domain helpers now live under:

- `app/lib/generative/conversation/`

Important files:

- `record.ts`: `ConversationRecord`, record mapping, empty conversation creation
- `merge.ts`: merge/sort logic and `MAX_CONVERSATIONS`
- `id.ts`: local ID generation
- `format.ts`: sidebar relative-time formatting
- `tool-result.ts`: tool/custom event parsing
- `storage.ts`: IndexedDB persistence

Conversation-specific hooks live beside them:

- `use-conversation-state.ts`
- `use-message-derivation.ts`
- `use-send-message.ts`

This is the main place to look if you want to change message storage, local
conversation lifecycle, or how active/visible messages are derived.

`ConversationRecord` persists both:

- `sessionId`
- `conversationToken`

so the frontend can continue the same upstream conversation across turns.

## 8. Thinking and View State

View-oriented hooks live under:

- `app/lib/generative/view/`

Important files:

- `use-thinking-state.ts`
- `use-conversation-scroll.ts`
- `use-conversation-url-sync.ts`

These do not shape the streamed response itself. They shape how the existing
conversation state is displayed in the UI.

## 9. Transcript Rendering

Transcript rendering is intentionally split into:

- derivation: `app/lib/generative/transcript/build-transcript-items.ts`
- presentation: `app/components/Generative/ConversationTranscript.tsx`

`buildTranscriptItems(...)` decides:

- which messages appear
- when the pending thinking panel appears
- when message-level thinking panels appear
- which assistant message is considered the active streaming message

`ConversationTranscript.tsx` just maps those items into:

- `ThinkingStatusPanel`
- `MessageBubble`

If you need to change transcript ordering or insert a new row type, start in:

- `app/lib/generative/transcript/build-transcript-items.ts`

## 10. Where Response Rendering Happens

The conversational response rendering stack lives under:

- `app/components/Generative/ResponseContent/`

It is split into:

- `MessageBubble.tsx`
  - bridge between transcript messages and structured response rendering
- `rendering/`
  - registry and render orchestration
- `components/`
  - actual UI components rendered in the assistant response

### Rendering path

Structured response rendering flows like this:

```text
message.metadata.a2uiSurfaces
  -> MessageBubble
  -> SurfaceRenderer
  -> ComponentRenderer
  -> component-registry
  -> component-renderers
  -> ResponseContent/components/*
```

### Ownership inside ResponseContent

- `rendering/SurfaceRenderer.tsx`
  - walks a surface tree
  - handles layout/container nodes
  - hides non-visual bundle slot surfaces
  - renders `NextActionsBar` after other sibling content
- `rendering/ComponentRenderer.tsx`
  - resolves bindings
  - builds render context + interaction handlers
  - dispatches through the registry
- `rendering/component-registry.ts`
  - maps `catalogComponentId` to renderer functions
- `rendering/component-renderers.tsx`
  - A2UI-to-component adapter functions
- `components/*`
  - presentational components like `ProductCarousel`, `ComparisonTable`,
    `BundleDisplay`, `NextActionsBar`, `A2UIProductCard`

If someone asks "where does response rendering happen?", this folder is the
answer.

## 11. A2UI in the Conversational Flow

Structured response rendering is optional from the point of view of the stream,
but when `ACTIVITY_SNAPSHOT` events are present they are handled through:

- `app/lib/generative/adapters/a2ui/stream-a2ui-adapter.ts`

That adapter:

- receives `ACTIVITY_SNAPSHOT` events from the session layer
- delegates them to `A2UIMessageProcessor`
- serializes surfaces into `message.metadata.a2uiSurfaces`

This is the key architectural boundary:

- generic streaming logic stays in `streaming/` and `session/`
- commerce/A2UI-specific rendering stays behind the structured-response adapter

For the detailed A2UI render path, read:

- [CONVERSATIONAL_A2UI_RENDERING.md](./CONVERSATIONAL_A2UI_RENDERING.md)

## 12. Where To Make Changes

### Change how the browser calls the backend

- `app/lib/generative/use-assistant-streaming.ts`

This layer is also where follow-up turns include the stored
`conversationToken`.

### Change how the server calls the backend agent

- `app/routes/api.agentic.conversation.ts`

### Change conversation creation, storage, or active conversation logic

- `app/lib/generative/conversation/`

This includes persistence of the conversation continuity pair:

- `sessionId`
- `conversationToken`

### Change transcript ordering or message row composition

- `app/lib/generative/transcript/build-transcript-items.ts`
- `app/components/Generative/ConversationTranscript.tsx`

### Change reasoning/thinking behavior in the UI

- `app/lib/generative/view/use-thinking-state.ts`
- `app/components/Generative/ThinkingStatusPanel.tsx`

### Change structured response rendering

- `app/components/Generative/ResponseContent/rendering/`
- `app/components/Generative/ResponseContent/components/`

### Change A2UI data processing

- `app/lib/generative/adapters/a2ui/stream-a2ui-adapter.ts`
- `app/lib/generative/a2ui/`

## 13. Recommended Reading Order

If you are new to this code, read in this order:

1. `app/routes/($locale).generative.tsx`
2. `app/lib/generative/use-assistant-streaming.ts`
3. `app/lib/generative/session/assistant-stream-session.ts`
4. `app/lib/generative/adapters/a2ui/stream-a2ui-adapter.ts`
5. `app/components/Generative/ConversationTranscript.tsx`
6. `app/components/Generative/ResponseContent/`
7. `CONVERSATIONAL_A2UI_RENDERING.md`
