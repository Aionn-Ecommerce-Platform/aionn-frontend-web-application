import api from "@/shared/api";
import type { NotificationItem } from "@/types";

export const notificationService = {
  listMine(limit = 50) {
    return api.get<NotificationItem[]>("/notifications", {
      query: { limit },
    });
  },

  get(notiId: string) {
    return api.get<NotificationItem>(`/notifications/${notiId}`);
  },

  markRead(notiId: string) {
    return api.post<NotificationItem>(`/notifications/${notiId}/read`);
  },

  delete(notiId: string) {
    return api.delete<NotificationItem>(`/notifications/${notiId}`);
  },

  dispatch(body: {
    eventType: string;
    userId: string;
    variables: Record<string, string>;
  }) {
    return api.post<void>("/notifications/dispatch", body);
  },
};

export interface ProviderResult {
  providerId: string;
  channel: string;
  providerType: string;
  config: string;
  rateLimitPerMinute: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateResult {
  templateId: string;
  eventType: string;
  channel: string;
  category: string;
  locale: string;
  subject: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export const notificationProviderService = {
  configure(body: {
    channel: string;
    providerType: string;
    config: string;
    rateLimitPerMinute?: number;
  }) {
    return api.post<ProviderResult>("/notifications/providers", body);
  },

  update(
    providerId: string,
    body: { config: string; rateLimitPerMinute?: number; active: boolean },
  ) {
    return api.put<ProviderResult>(
      `/notifications/providers/${providerId}`,
      body,
    );
  },

  list() {
    return api.get<ProviderResult[]>("/notifications/providers");
  },

  analytics(campaignId: string) {
    return api.get<unknown>("/notifications/analytics", {
      query: { campaignId },
    });
  },
};

export const notificationTemplateService = {
  create(body: {
    eventType: string;
    channel: string;
    category: string;
    locale: string;
    subject: string;
    content: string;
  }) {
    return api.post<TemplateResult>("/notifications/templates", body);
  },

  update(templateId: string, body: { subject: string; content: string }) {
    return api.put<TemplateResult>(
      `/notifications/templates/${templateId}`,
      body,
    );
  },

  get(templateId: string) {
    return api.get<TemplateResult>(`/notifications/templates/${templateId}`);
  },

  list(limit = 100) {
    return api.get<TemplateResult[]>("/notifications/templates", {
      query: { limit },
    });
  },
};
