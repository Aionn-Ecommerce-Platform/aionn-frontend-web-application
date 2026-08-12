import api from "@/shared/api";
import type {
  AiPrivacySettings,
  NotificationSettings,
  UserPreference,
} from "@/types";

interface RawUserPreference {
  userId: string;
  language: string | null;
  currency: string | null;
  timezone: string | null;
  theme: string | null;
  notificationSettings: string | null;
  aiPrivacySettings: string | null;
  updatedAt: string | null;
}

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  order: true,
  promotion: true,
  chat: true,
  system: true,
};

const DEFAULT_AI_PRIVACY: AiPrivacySettings = {
  personalizedRecommendation: true,
};

function safeParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(json) as Partial<T>) };
  } catch {
    return fallback;
  }
}

function normalize(raw: RawUserPreference): UserPreference {
  return {
    userId: raw.userId,
    language: raw.language,
    currency: raw.currency,
    timezone: raw.timezone,
    theme: raw.theme,
    notifications: safeParse<NotificationSettings>(
      raw.notificationSettings,
      DEFAULT_NOTIFICATIONS,
    ),
    aiPrivacy: safeParse<AiPrivacySettings>(
      raw.aiPrivacySettings,
      DEFAULT_AI_PRIVACY,
    ),
    updatedAt: raw.updatedAt,
  };
}

interface GeneralPreferenceInput {
  language: string;
  currency: string;
  timezone: string;
  theme: string;
}

export const preferenceService = {
  async get(): Promise<UserPreference> {
    const raw = await api.get<RawUserPreference>("/preferences");
    return normalize(raw);
  },

  async updateGeneral(input: GeneralPreferenceInput): Promise<UserPreference> {
    const raw = await api.put<RawUserPreference>("/preferences/general", input);
    return normalize(raw);
  },

  async updateNotifications(
    current: NotificationSettings,
    patch: Partial<NotificationSettings>,
  ): Promise<UserPreference> {
    const next = { ...current, ...patch };
    const raw = await api.put<RawUserPreference>("/preferences/notifications", {
      notificationSettingsJson: JSON.stringify(next),
    });
    return normalize(raw);
  },

  async updateAiPrivacy(
    current: AiPrivacySettings,
    patch: Partial<AiPrivacySettings>,
  ): Promise<UserPreference> {
    const next = { ...current, ...patch };
    const raw = await api.put<RawUserPreference>("/preferences/ai-privacy", {
      aiPrivacySettingsJson: JSON.stringify(next),
    });
    return normalize(raw);
  },
};
