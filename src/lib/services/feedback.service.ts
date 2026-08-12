import api from "@/shared/api";

export type FeedbackCategory =
  | "GENERAL"
  | "BUG"
  | "FEATURE_REQUEST"
  | "COMPLAINT"
  | "CONTACT";

export type FeedbackStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "CLOSED";

export interface FeedbackResponse {
  feedbackId: string;
  userId: string | null;
  category: FeedbackCategory;
  subject: string | null;
  content: string;
  rating: number | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: FeedbackStatus;
  handledBy: string | null;
  handledAt: string | null;
  adminReply: string | null;
  createdAt: string;
}

interface SubmitFeedbackInput {
  category?: FeedbackCategory;
  subject?: string;
  content: string;
  rating?: number;
  contactEmail?: string;
  contactPhone?: string;
}

export const feedbackService = {
  submit(body: SubmitFeedbackInput) {
    return api.post<FeedbackResponse>("/feedbacks", body);
  },
  listMine() {
    return api.get<FeedbackResponse[]>("/feedbacks/me");
  },
};

export const adminFeedbackService = {
  list(params: { status?: FeedbackStatus; page?: number; size?: number }) {
    return api.page<FeedbackResponse>("/admin/feedbacks", {
      query: {
        status: params.status,
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    });
  },
  get(feedbackId: string) {
    return api.get<FeedbackResponse>(`/admin/feedbacks/${feedbackId}`);
  },
  reply(
    feedbackId: string,
    body: { reply: string; newStatus?: FeedbackStatus },
  ) {
    return api.post<FeedbackResponse>(
      `/admin/feedbacks/${feedbackId}/reply`,
      body,
    );
  },
  changeStatus(feedbackId: string, status: FeedbackStatus) {
    return api.put<FeedbackResponse>(`/admin/feedbacks/${feedbackId}/status`, {
      status,
    });
  },
};
