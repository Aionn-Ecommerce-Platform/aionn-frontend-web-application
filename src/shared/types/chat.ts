type ChatParticipantRole = "BUYER" | "MERCHANT" | "SUPPORT";

interface ChatParticipant {
  userId: string;
  role: ChatParticipantRole | string;
  displayName: string | null;
  avatarUrl: string | null;
  joinedAt: string;
  lastReadAt: string | null;
}

export interface ChatConversation {
  conversationId: string;
  buyerId: string;
  merchantId: string;
  participants: ChatParticipant[];
  lastMessageId: string | null;
  lastMessagePreview: string | null;
  lastMessageType: string | null;
  lastMessageSenderId: string | null;
  lastMessageAt: string | null;
  archived: boolean;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ChatMessageType = "TEXT" | "IMAGE" | "FILE" | "PRODUCT" | "SYSTEM";
type ChatMessageStatus = "SENDING" | "SENT" | "DELIVERED" | "READ";

export interface ChatMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderRole: string;
  type: ChatMessageType | string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  status: ChatMessageStatus | string;
  deliveredTo: string[];
  readBy: string[];
  recalled: boolean;
  sentAt: string;
  updatedAt: string;
}
