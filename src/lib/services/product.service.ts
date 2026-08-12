import api from "@/shared/api";
import type {
  Product,
  ProductSearchParams,
  ProductSearchResult,
  ProductStatus,
} from "@/types";

interface CreateProductInput {
  name: string;
}

interface DefineVariantInput {
  attributeValues: Record<string, string>;
  price: number;
  currency: string;
}

interface UpdateMediaInput {
  imageList: string[];
}

interface UpdateAiMetadataInput {
  tags?: string[];
  aiDescription?: string;
}

interface BulkPriceUpdateResult {
  updated: number;
  skipped: number;
  failedSkus: string[];
}

export const productService = {
  get(productId: string) {
    return api.get<Product>(`/catalog/products/${productId}`, {
      anonymous: true,
    });
  },
  resolveBySkuIds(skuIds: string[]) {
    return api.get<Product[]>("/catalog/products/by-skus", {
      anonymous: true,
      query: { skuIds: skuIds.join(",") },
    });
  },
  async listByMerchant(merchantId: string, page = 0, size = 20) {
    const result = await this.search({ merchantId, page, size });
    return result.page;
  },

  search(params: ProductSearchParams) {
    const query: Record<string, string | number | boolean | undefined> = {
      q: params.q,
      merchantId: params.merchantId,
      priceMin: params.priceMin,
      priceMax: params.priceMax,
      sort: params.sort,
      page: params.page ?? 0,
      size: params.size ?? 20,
      ratingMin: params.ratingMin,
    };
    if (params.categoryIds && params.categoryIds.length > 0) {
      query.categoryIds = params.categoryIds.join(",");
    }
    if (params.brandIds && params.brandIds.length > 0) {
      query.brandIds = params.brandIds.join(",");
    }
    if (params.attributes) {
      for (const [k, values] of Object.entries(params.attributes)) {
        if (values && values.length > 0) {
          query[`attr.${k}`] = values.join(",");
        }
      }
    }
    return api.get<ProductSearchResult>("/catalog/products/search/catalog", {
      anonymous: true,
      query,
    });
  },

  searchByMerchant(params: {
    merchantId?: string;
    status?: ProductStatus;
    page?: number;
    size?: number;
  }) {
    return api.page<Product>("/catalog/products/admin/reviews", {
      query: { page: params.page ?? 0, size: params.size ?? 20 },
    });
  },
  getRelated(productId: string, limit = 5) {
    return api.get<Product[]>(
      `/catalog/products/${productId}/recommendations`,
      {
        anonymous: true,
        query: { limit },
      },
    );
  },
  getPopular(limit = 5) {
    return api.get<Product[]>("/catalog/products/recommendations/popular", {
      anonymous: true,
      query: { limit },
    });
  },
  getPersonalized(categoryIds: string[], brandIds: string[], limit = 5) {
    return api.get<Product[]>(
      "/catalog/products/recommendations/personalized",
      {
        query: {
          categoryIds:
            categoryIds.length > 0 ? categoryIds.join(",") : undefined,
          brandIds: brandIds.length > 0 ? brandIds.join(",") : undefined,
          limit,
        },
      },
    );
  },
  trackView(productId: string) {
    return api.post<void>(`/catalog/products/${productId}/view`, {});
  },

  create(body: CreateProductInput) {
    return api.post<Product>("/catalog/products", body);
  },
  clone(productId: string) {
    return api.post<Product>(`/catalog/products/${productId}/clone`);
  },
  defineVariant(productId: string, body: DefineVariantInput) {
    return api.post<Product>(`/catalog/products/${productId}/variants`, body);
  },
  removeVariant(productId: string, skuId: string) {
    return api.post<Product>(
      `/catalog/products/${productId}/variants/${skuId}/remove`,
    );
  },
  updateMedia(productId: string, body: UpdateMediaInput) {
    return api.put<Product>(`/catalog/products/${productId}/media`, body);
  },
  assignBrand(productId: string, brandId: string) {
    return api.put<Product>(`/catalog/products/${productId}/brand`, {
      brandId,
    });
  },
  assignCategories(productId: string, categoryIds: string[]) {
    return api.put<Product>(`/catalog/products/${productId}/categories`, {
      categoryIds,
    });
  },
  defineAttributes(productId: string, attributes: Record<string, string>) {
    return api.put<Product>(`/catalog/products/${productId}/attributes`, {
      attributes,
    });
  },
  changeVariantPrice(
    productId: string,
    skuId: string,
    newPrice: number,
    currency: string,
  ) {
    return api.put<Product>(
      `/catalog/products/${productId}/variants/${skuId}/price`,
      { newPrice, currency },
    );
  },
  updateAiMetadata(productId: string, body: UpdateAiMetadataInput) {
    return api.put<Product>(`/catalog/products/${productId}/ai-metadata`, body);
  },
  submitForReview(productId: string) {
    return api.post<Product>(`/catalog/products/${productId}/submit-review`);
  },
  deactivate(productId: string, reason: string) {
    return api.post<Product>(`/catalog/products/${productId}/deactivate`, {
      reason,
    });
  },
  restore(productId: string) {
    return api.post<Product>(`/catalog/products/${productId}/restore`);
  },
  publish(productId: string) {
    return api.post<Product>(`/catalog/products/${productId}/publish`);
  },
  reject(productId: string, body: { reasonCode: string; feedback?: string }) {
    return api.post<Product>(`/catalog/products/${productId}/reject`, body);
  },
  assignCollections(productId: string, body: { collectionIds: string[] }) {
    return api.put<Product>(`/catalog/products/${productId}/collections`, body);
  },
  async bulkPriceUpdate(body: {
    skuIds: string[];
    changeType: string;
    value: number;
    currency: string;
  }) {
    const products = await this.resolveBySkuIds(body.skuIds);
    const variants = new Map(
      products.flatMap((product) =>
        product.variants.map(
          (variant) =>
            [variant.skuId, { productId: product.productId, variant }] as const,
        ),
      ),
    );
    const items = body.skuIds.map((skuId) => {
      const match = variants.get(skuId);
      if (!match) throw new Error(`SKU ${skuId} was not found`);
      const current = match.variant.price;
      const amount = body.value;
      const newPrice =
        body.changeType === "SET"
          ? amount
          : body.changeType === "INCREASE_AMOUNT"
            ? current + amount
            : body.changeType === "DECREASE_AMOUNT"
              ? current - amount
              : body.changeType === "INCREASE_PERCENT"
                ? current * (1 + amount / 100)
                : current * (1 - amount / 100);
      if (newPrice <= 0)
        throw new Error(`New price for SKU ${skuId} must be positive`);
      return {
        productId: match.productId,
        skuId,
        newPrice: Math.round(newPrice),
        currency: body.changeType.includes("PERCENT")
          ? match.variant.currency
          : body.currency,
      };
    });
    return api.put<BulkPriceUpdateResult>("/catalog/products/variants/prices", {
      items,
    });
  },
  emergencyTakedown(productId: string, body: { reason: string }) {
    return api.post<Product>(`/catalog/products/${productId}/takedown`, body);
  },
};
