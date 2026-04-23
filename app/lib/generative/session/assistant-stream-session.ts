import type {
  AssistantStreamEvent,
  ThinkingUpdateSnapshot,
} from '~/lib/generative/streaming';
import {
  CONNECTING_STATUS_MESSAGE,
  DEFAULT_STATUS_MESSAGE,
  DEFAULT_TOOL_PROGRESS_MESSAGE,
  GENERIC_ERROR_MESSAGE,
  INTERRUPTED_ERROR_MESSAGE,
  TOOL_RESULT_FALLBACK_MESSAGE,
} from '~/lib/generative/streaming';
import {
  generateId,
  parseToolResultPayload,
} from '~/lib/generative/conversation';
import type {
  ConversationMessage,
  ConversationThinkingUpdate,
} from '~/types/conversation';
import type {
  AssistantEphemeralMessageOptions,
  AssistantStreamSessionOptions,
  StreamHandlingResult,
} from './types';

export class AssistantStreamSession {
  private updater;
  private structuredResponseAdapter;
  private onThinkingUpdate;
  private resolvedSessionId: string | null;
  private resolvedConversationToken: string | null;
  private assistantMessageId: string | null = null;
  private accumulatedContent = '';
  private activeReasoningMessageId: string | null = null;
  private activeReasoningBuffer = '';
  private pendingFinalReasoningBlock: string | null = null;
  private capturedErrorMessage: string | null = null;
  private turnCompleted = false;
  private seenStatusMessages = new Set<string>();
  private thinkingUpdates: ConversationThinkingUpdate[] = [];

  constructor({
    initialSessionId,
    initialConversationToken,
    updater,
    structuredResponseAdapter,
    onThinkingUpdate,
  }: AssistantStreamSessionOptions) {
    this.resolvedSessionId = initialSessionId;
    this.resolvedConversationToken = initialConversationToken;
    this.updater = updater;
    this.structuredResponseAdapter = structuredResponseAdapter;
    this.onThinkingUpdate = onThinkingUpdate;
  }

  start(showInitialStatus?: boolean) {
    this.resetThinkingState();

    const initialStatusMessage = showInitialStatus
      ? CONNECTING_STATUS_MESSAGE
      : DEFAULT_STATUS_MESSAGE;

    this.pushAssistantMessage(initialStatusMessage, 'status', {
      ephemeral: true,
    });
    this.recordThinkingUpdate(initialStatusMessage, 'status');
  }

  handleEvent(event: AssistantStreamEvent): StreamHandlingResult {
    this.updateSessionFromEvent(event);

    switch (event.type) {
      case 'turn_started': {
        if (this.thinkingUpdates.length === 0) {
          this.recordThinkingUpdate(DEFAULT_STATUS_MESSAGE, 'status');
        } else {
          this.emitThinkingSnapshot();
        }
        return {};
      }
      case 'RUN_STARTED': {
        if (this.thinkingUpdates.length === 0) {
          this.recordThinkingUpdate(DEFAULT_STATUS_MESSAGE, 'status');
        } else {
          this.emitThinkingSnapshot();
        }
        return {};
      }
      case 'RUN_ERROR': {
        return this.handleTerminalError(
          event.message || GENERIC_ERROR_MESSAGE,
          true,
        );
      }
      case 'RUN_FINISHED': {
        this.finalizeAssistantResponse();
        this.turnCompleted = true;
        this.syncAssistantMetadata();
        return {complete: true};
      }
      case 'turn_complete':
      case 'REASONING_START':
      case 'REASONING_END':
      case 'TEXT_MESSAGE_END':
      case 'TOOL_CALL_END':
      case 'STATE_SNAPSHOT': {
        return {};
      }
      case 'REASONING_MESSAGE_START': {
        this.demotePendingReasoningBlock();
        this.activeReasoningMessageId = event.messageId;
        this.activeReasoningBuffer = '';
        return {};
      }
      case 'REASONING_MESSAGE_CONTENT': {
        if (
          !this.activeReasoningMessageId ||
          this.activeReasoningMessageId !== event.messageId
        ) {
          this.activeReasoningMessageId = event.messageId;
          this.activeReasoningBuffer = '';
        }
        this.activeReasoningBuffer += event.delta;
        return {};
      }
      case 'REASONING_MESSAGE_END': {
        if (
          this.activeReasoningMessageId &&
          this.activeReasoningMessageId !== event.messageId
        ) {
          return {};
        }
        this.pendingFinalReasoningBlock =
          this.activeReasoningBuffer.trim() || null;
        this.activeReasoningBuffer = '';
        this.activeReasoningMessageId = null;
        this.emitThinkingSnapshot();
        return {};
      }
      case 'TEXT_MESSAGE_START': {
        this.ensureAssistantMessage('');
        this.syncAssistantMetadata();
        return {};
      }
      case 'TEXT_MESSAGE_CONTENT':
      case 'TEXT_MESSAGE_CHUNK': {
        if (event.delta) {
          this.appendAssistantText(event.delta);
        }
        return {};
      }
      case 'TOOL_CALL_START': {
        const toolText = this.formatToolStartMessage(event.toolCallName);
        if (this.seenStatusMessages.has(toolText)) {
          return {};
        }
        this.seenStatusMessages.add(toolText);
        this.recordThinkingUpdate(toolText, 'tool');
        if (!this.assistantMessageId) {
          this.pushAssistantMessage(toolText, 'tool', {ephemeral: true});
        }
        return {};
      }
      case 'TOOL_CALL_ARGS':
      case 'TOOL_CALL_RESULT': {
        return {};
      }
      case 'ACTIVITY_SNAPSHOT': {
        const changed = this.structuredResponseAdapter?.processEvent(event);
        if (changed) {
          this.ensureAssistantMessage(this.accumulatedContent);
          this.syncAssistantMetadata();
        }
        return {};
      }
      case 'CUSTOM': {
        return this.handleCustomEvent(event.name, event.value);
      }
      case 'UNKNOWN': {
        return {};
      }
    }

    return {};
  }

  handleResponseError(message: string): StreamHandlingResult {
    return this.handleTerminalError(message, false);
  }

  finalizeAfterStream(): StreamHandlingResult {
    this.finalizeAssistantResponse();
    this.updater.finalizeConversation(
      this.resolvedSessionId,
      this.resolvedConversationToken,
    );

    if (!this.turnCompleted && !this.capturedErrorMessage) {
      if (this.structuredResponseAdapter?.hasSyncedContent()) {
        this.turnCompleted = true;
        this.syncAssistantMetadata();
        return {complete: true};
      }

      return this.handleTerminalError(INTERRUPTED_ERROR_MESSAGE, false);
    }

    return this.turnCompleted ? {complete: true} : {};
  }

  getResolvedSessionId() {
    return this.resolvedSessionId;
  }

  getResolvedConversationToken() {
    return this.resolvedConversationToken;
  }

  hasCapturedError() {
    return Boolean(this.capturedErrorMessage);
  }

  private handleCustomEvent(
    name: string,
    value: unknown,
  ): StreamHandlingResult {
    if (name === 'status' || name === 'status_update') {
      const statusText = this.resolveDisplayText(value, DEFAULT_STATUS_MESSAGE);
      if (!statusText || this.seenStatusMessages.has(statusText)) {
        return {};
      }

      this.seenStatusMessages.add(statusText);
      this.recordThinkingUpdate(statusText, 'status');
      if (!this.assistantMessageId) {
        this.pushAssistantMessage(statusText, 'status', {ephemeral: true});
      }
      return {};
    }

    if (name === 'tool_result') {
      const result = parseToolResultPayload(value);
      const successNote =
        result.message ??
        this.resolveDisplayText(value, TOOL_RESULT_FALLBACK_MESSAGE);
      this.recordThinkingUpdate(successNote, 'tool');
      if (!this.assistantMessageId) {
        this.pushAssistantMessage(successNote, 'tool', {ephemeral: true});
      }
    }

    return {};
  }

  private handleTerminalError(
    message: string,
    abort: boolean,
  ): StreamHandlingResult {
    this.capturedErrorMessage = message;
    this.recordThinkingUpdate(message, 'status');
    this.turnCompleted = true;
    this.syncAssistantMetadata();
    this.pushErrorBubble(message);
    return {
      abort,
      complete: true,
      error: message,
    };
  }

  private emitThinkingSnapshot() {
    if (!this.onThinkingUpdate) {
      return;
    }

    const snapshot: ThinkingUpdateSnapshot = {
      updates: [...this.thinkingUpdates],
      isComplete: this.turnCompleted,
      messageId: this.assistantMessageId,
    };

    this.onThinkingUpdate(snapshot);
  }

  private resetThinkingState() {
    this.thinkingUpdates = [];
    this.turnCompleted = false;
    this.emitThinkingSnapshot();
  }

  private syncAssistantMetadata() {
    if (!this.assistantMessageId) {
      this.emitThinkingSnapshot();
      return;
    }

    this.updater.patchAssistantMetadata(
      this.assistantMessageId,
      this.getAssistantMetadataSnapshot(),
    );
    this.emitThinkingSnapshot();
  }

  private getAssistantMetadataSnapshot():
    | ConversationMessage['metadata']
    | undefined {
    const thinkingUpdates =
      this.thinkingUpdates.length > 0
        ? {thinkingUpdates: [...this.thinkingUpdates]}
        : undefined;
    const structuredMetadata = this.structuredResponseAdapter?.getMetadataPatch();

    if (!thinkingUpdates && !structuredMetadata) {
      return undefined;
    }

    return {
      ...(structuredMetadata ?? {}),
      ...(thinkingUpdates ?? {}),
    };
  }

  private recordThinkingUpdate(
    text: string,
    kind: ConversationThinkingUpdate['kind'],
  ) {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    const last = this.thinkingUpdates.at(-1);
    if (last?.text === trimmed && last.kind === kind) {
      return;
    }

    this.thinkingUpdates = [
      ...this.thinkingUpdates.slice(-24),
      {
        id: generateId(),
        text: trimmed,
        kind,
        timestamp: new Date().toISOString(),
      },
    ];
    this.syncAssistantMetadata();
  }

  private ensureAssistantMessage(initialContent = '') {
    if (this.assistantMessageId) {
      return this.assistantMessageId;
    }

    const createdAt = new Date().toISOString();
    const messageId = generateId();
    this.assistantMessageId = messageId;

    this.updater.ensureAssistantMessage({
      id: messageId,
      role: 'assistant',
      content: initialContent,
      createdAt,
      kind: 'text',
      metadata: this.getAssistantMetadataSnapshot(),
    });

    return messageId;
  }

  private setAssistantMessageContent(content: string) {
    const trimmedContent = content.trim();
    this.accumulatedContent = content;

    const messageId = this.ensureAssistantMessage(trimmedContent);
    this.updater.updateAssistantMessage(messageId, {
      content: trimmedContent,
      kind: 'text',
      metadata: this.getAssistantMetadataSnapshot(),
      sessionId: this.resolvedSessionId,
    });
  }

  private appendAssistantText(delta: string) {
    if (!delta) {
      return;
    }

    this.accumulatedContent += delta;
    this.setAssistantMessageContent(this.accumulatedContent);
  }

  private demotePendingReasoningBlock() {
    if (!this.pendingFinalReasoningBlock) {
      return;
    }

    this.recordThinkingUpdate(this.pendingFinalReasoningBlock, 'reasoning');
    this.pendingFinalReasoningBlock = null;
  }

  private finalizeAssistantResponse() {
    if (this.activeReasoningBuffer.trim()) {
      this.pendingFinalReasoningBlock = this.activeReasoningBuffer.trim();
      this.activeReasoningBuffer = '';
      this.activeReasoningMessageId = null;
    }

    if (this.pendingFinalReasoningBlock) {
      this.setAssistantMessageContent(this.pendingFinalReasoningBlock);
    }
  }

  private pushAssistantMessage(
    content: string,
    kind: ConversationMessage['kind'],
    options: AssistantEphemeralMessageOptions = {},
  ) {
    const createdAt = new Date().toISOString();

    this.updater.appendAssistantMessage({
      id: generateId(),
      role: 'assistant',
      content,
      createdAt,
      kind,
      ephemeral: options.ephemeral ?? false,
      metadata: options.metadata,
    });
  }

  private pushErrorBubble(text: string) {
    this.pushAssistantMessage(text, 'error');
  }

  private updateResolvedContinuation(
    sessionId: string | null,
    conversationToken: string | null,
  ) {
    const nextUpdate: {
      sessionId?: string | null;
      conversationToken?: string | null;
    } = {};

    if (sessionId && sessionId !== this.resolvedSessionId) {
      this.resolvedSessionId = sessionId;
      nextUpdate.sessionId = sessionId;
    }

    if (
      conversationToken &&
      conversationToken !== this.resolvedConversationToken
    ) {
      this.resolvedConversationToken = conversationToken;
      nextUpdate.conversationToken = conversationToken;
    }

    if (
      nextUpdate.sessionId === undefined &&
      nextUpdate.conversationToken === undefined
    ) {
      return;
    }

    this.updater.updateConversationContinuation(nextUpdate);
  }

  private readContinuation(value: unknown): {
    sessionId: string | null;
    conversationToken: string | null;
  } {
    if (!value || typeof value !== 'object') {
      return {
        sessionId: null,
        conversationToken: null,
      };
    }

    const record = value as Record<string, unknown>;
    const payload =
      record.payload && typeof record.payload === 'object'
        ? (record.payload as Record<string, unknown>)
        : null;
    const candidates = [
      record.threadId,
      record.sessionId,
      record.conversationSessionId,
      payload?.threadId,
      payload?.sessionId,
      payload?.conversationSessionId,
    ];
    let sessionId: string | null = null;

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        sessionId = candidate.trim();
        break;
      }
    }

    const tokenCandidates = [
      record.conversationToken,
      payload?.conversationToken,
    ];
    let conversationToken: string | null = null;

    for (const candidate of tokenCandidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        conversationToken = candidate.trim();
        break;
      }
    }

    return {
      sessionId,
      conversationToken,
    };
  }

  private resolveContinuationFromEvent(event: AssistantStreamEvent) {
    if (event.type === 'CUSTOM') {
      return this.readContinuation(event.value);
    }

    return this.readContinuation(event);
  }

  private updateSessionFromEvent(event: AssistantStreamEvent) {
    const {sessionId, conversationToken} =
      this.resolveContinuationFromEvent(event);
    this.updateResolvedContinuation(sessionId, conversationToken);
  }

  private resolveDisplayText(value: unknown, fallback: string): string {
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

  private formatToolStartMessage(name: string | undefined) {
    const trimmed = name?.trim();
    if (!trimmed) {
      return DEFAULT_TOOL_PROGRESS_MESSAGE;
    }

    return `Starting ${trimmed}...`;
  }
}
