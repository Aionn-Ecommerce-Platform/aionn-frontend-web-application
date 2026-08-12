import api from "@/shared/api";
import type { ChatConversation, ChatMessage, ChatMessageType } from "@/types";

interface StartConversationInput {
  merchantId: string;
  buyerDisplayName?: string;
  buyerAvatarUrl?: string;
  merchantDisplayName?: string;
  merchantAvatarUrl?: string;
}

interface SendMessageInput {
  type: ChatMessageType;
  body?: string;
  metadata?: Record<string, unknown>;
}

export const conversationService = {
  start(body: StartConversationInput) {
    return api.post<ChatConversation>("/chat/conversations", body);
  },

  listMine(params: { includeArchived?: boolean; limit?: number } = {}) {
    return api.get<ChatConversation[]>("/chat/conversations", {
      query: {
        includeArchived: params.includeArchived ?? false,
        limit: params.limit ?? 50,
      },
    });
  },

  unreadCounts() {
    return api.get<Record<string, number>>("/chat/conversations/unread-counts");
  },

  get(conversationId: string) {
    return api.get<ChatConversation>(`/chat/conversations/${conversationId}`);
  },

  markRead(conversationId: string) {
    return api.post<ChatConversation>(
      `/chat/conversations/${conversationId}/read`,
    );
  },

  archive(conversationId: string) {
    return api.post<ChatConversation>(
      `/chat/conversations/${conversationId}/archive`,
    );
  },

  unarchive(conversationId: string) {
    return api.post<ChatConversation>(
      `/chat/conversations/${conversationId}/unarchive`,
    );
  },

  requestSupport(conversationId: string) {
    return api.post<ChatConversation>(
      `/chat/conversations/${conversationId}/support`,
    );
  },
};

export const messageService = {
  send(conversationId: string, body: SendMessageInput) {
    return api.post<ChatMessage>(
      `/chat/conversations/${conversationId}/messages`,
      body,
    );
  },

  list(
    conversationId: string,
    params: { before?: string; limit?: number } = {},
  ) {
    return api.get<ChatMessage[]>(
      `/chat/conversations/${conversationId}/messages`,
      {
        query: {
          before: params.before,
          limit: params.limit ?? 30,
        },
      },
    );
  },

  markDelivered(messageId: string) {
    return api.post<ChatMessage>(`/chat/messages/${messageId}/delivered`);
  },

  markRead(messageId: string) {
    return api.post<ChatMessage>(`/chat/messages/${messageId}/read`);
  },

  recall(messageId: string) {
    return api.post<ChatMessage>(`/chat/messages/${messageId}/recall`);
  },

  setTyping(conversationId: string, typing: boolean) {
    return api.post<void>(`/chat/conversations/${conversationId}/typing`, {
      typing,
    });
  },
};

interface BlockResult {
  blockId: string;
  blockerId: string;
  blockedId: string;
  reason: string | null;
  blockedAt: string;
}

interface AutoReplyResult {
  replyId: string;
  merchantId: string;
  enabled: boolean;
  greeting: string | null;
  awayMessage: string | null;
  workingHourStart: string | null;
  workingHourEnd: string | null;
  workingDays: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export const blockService = {
  block(body: { blockedId: string; reason?: string }) {
    return api.post<BlockResult>("/chat/blocks", body);
  },
  unblock(blockedId: string) {
    return api.delete<BlockResult>(`/chat/blocks/${blockedId}`);
  },
  list() {
    return api.get<BlockResult[]>("/chat/blocks");
  },
};

export const autoReplyService = {
  get(merchantId: string) {
    return api.get<AutoReplyResult>(`/chat/merchants/${merchantId}/auto-reply`);
  },
  update(
    merchantId: string,
    body: {
      enabled: boolean;
      greeting?: string;
      awayMessage?: string;
      workingHourStart?: string;
      workingHourEnd?: string;
      workingDays?: string[];
    },
  ) {
    return api.put<AutoReplyResult>(
      `/chat/merchants/${merchantId}/auto-reply`,
      body,
    );
  },
};
