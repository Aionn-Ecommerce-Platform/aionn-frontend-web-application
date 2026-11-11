import api from "@/shared/api";

export interface ProductQuestion {
  questionId: string;
  productId: string;
  userId: string;
  question: string;
  answer: string | null;
  answeredBy: string | null;
  answeredAt: string | null;
  createdAt: string;
  userName?: string | null;
  userDisplayName?: string | null;
  userAvatarUrl?: string | null;
}

export const questionService = {
  list(productId: string, page = 0, size = 10) {
    return api.page<ProductQuestion>(
      `/catalog/products/${productId}/questions`,
      { query: { page, size } },
    );
  },

  ask(productId: string, question: string) {
    return api.post<ProductQuestion>(
      `/catalog/products/${productId}/questions`,
      { question },
    );
  },

  remove(questionId: string) {
    return api.delete<void>(`/catalog/questions/${questionId}`);
  },

  answer(questionId: string, answer: string) {
    return api.post<ProductQuestion>(
      `/catalog/questions/${questionId}/answer`,
      { answer },
    );
  },

  listForMerchant(
    params: { answered?: boolean; page?: number; size?: number } = {},
  ) {
    return api.page<ProductQuestion>("/catalog/merchant/questions", {
      query: {
        answered: params.answered,
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    });
  },
};
