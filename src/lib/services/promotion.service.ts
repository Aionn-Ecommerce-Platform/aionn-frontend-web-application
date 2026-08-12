import api from "@/shared/api";
import type {
  ActiveFlashSale,
  PromotionBanner,
  UploadSignature,
} from "@/types";

export const promotionService = {
  getBanners() {
    return api.get<PromotionBanner[]>("/promotions/banners");
  },
  getActiveFlashSales(limit = 5) {
    return api.get<ActiveFlashSale[]>("/promotions/flash-sales/active", {
      anonymous: true,
      query: { limit },
    });
  },
};

export interface PromotionBannerAdmin extends PromotionBanner {
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBannerInput {
  title: string;
  imageUrl: string;
  linkUrl: string;
  displayOrder: number;
  active?: boolean;
}

interface UpdateBannerInput {
  title?: string;
  imageUrl?: string;
  linkUrl?: string;
  displayOrder?: number;
  active?: boolean;
}

export const adminPromotionBannerService = {
  listAll() {
    return api.get<PromotionBannerAdmin[]>("/promotions/banners/admin");
  },
  get(bannerId: string) {
    return api.get<PromotionBannerAdmin>(
      `/promotions/banners/admin/${bannerId}`,
    );
  },
  create(body: CreateBannerInput) {
    return api.post<PromotionBannerAdmin>("/promotions/banners", body);
  },
  update(bannerId: string, body: UpdateBannerInput) {
    return api.put<PromotionBannerAdmin>(
      `/promotions/banners/${bannerId}`,
      body,
    );
  },
  delete(bannerId: string) {
    return api.delete<void>(`/promotions/banners/${bannerId}`);
  },
  generateUploadSignature() {
    return api.post<UploadSignature>(
      "/promotions/media/upload-signatures/banner",
    );
  },
};
