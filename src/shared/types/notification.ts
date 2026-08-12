type NotificationCategory =
  | "ORDER"
  | "PROMOTION"
  | "CHAT"
  | "SYSTEM"
  | "SECURITY"
  | string;

export interface NotificationItem {
  notiId: string;
  userId: string;
  templateId: string | null;
  channel: string;
  category: NotificationCategory;
  priority: string;
  subject: string | null;
  content: string | null;
  campaignId: string | null;
  status: string;
  retryCount: number;
  lastFailureReason: string | null;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  readAt: string | null;
  deletedAt: string | null;
}
