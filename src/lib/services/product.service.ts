import api from "@/shared/api";
import type {
  Product,
  ProductSearchParams,
  ProductSearchResult,
  ProductStatus,
} from "@/types";
import { promotionService } from "./promotion.service";

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
  async getWithActiveFlashSale(productId: string) {
    const [product, campaigns] = await Promise.all([
      this.get(productId),
      promotionService.getActiveFlashSales(100).catch(() => []),
    ]);
    const matches = campaigns.flatMap((campaign) =>
      campaign.items
        .filter((item) => item.productId === productId)
        .map((item) => ({ campaign, item })),
    );
    if (matches.length === 0) return product;

    const cheapest = matches.reduce((best, current) =>
      current.item.salePrice < best.item.salePrice ? current : best,
    );
    const skuOffersMap = new Map<
      string,
      {
        skuId: string;
        salePrice: number;
        currency: string;
        saleStock: number;
        soldCount: number;
      }
    >();
    for (const { item } of matches) {
      const existing = skuOffersMap.get(item.skuId);
      if (!existing || item.salePrice < existing.salePrice) {
        skuOffersMap.set(item.skuId, {
          skuId: item.skuId,
          salePrice: item.salePrice,
          currency: item.currency,
          saleStock: item.saleStock,
          soldCount: item.soldCount,
        });
      }
    }

    return {
      ...product,
      flashSale: {
        campaignId: cheapest.campaign.campaignId,
        endAt: cheapest.campaign.endDate,
        salePrice: cheapest.item.salePrice,
        currency: cheapest.item.currency,
        saleStock: cheapest.item.saleStock,
        soldCount: cheapest.item.soldCount,
        skuOffers: Array.from(skuOffersMap.values()),
      },
    } satisfies Product;
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

  async search(params: ProductSearchParams) {
    if (params.onSale) {
      const campaigns = await promotionService.getActiveFlashSales(100);
      const saleItems = campaigns.flatMap((campaign) =>
        campaign.items.map((item) => ({ campaign, item })),
      );
      const skuIds = [...new Set(saleItems.map(({ item }) => item.skuId))];
      const resolvedProducts =
        skuIds.length > 0 ? await this.resolveBySkuIds(skuIds) : [];

      const products = resolvedProducts.map((product) => {
        const matches = saleItems.filter(
          ({ item }) => item.productId === product.productId,
        );
        const cheapest = matches.reduce((best, current) =>
          current.item.salePrice < best.item.salePrice ? current : best,
        );
        const skuOffersMap = new Map<
          string,
          {
            skuId: string;
            salePrice: number;
            currency: string;
            saleStock: number;
            soldCount: number;
          }
        >();
        for (const { item } of matches) {
          const existing = skuOffersMap.get(item.skuId);
          if (!existing || item.salePrice < existing.salePrice) {
            skuOffersMap.set(item.skuId, {
              skuId: item.skuId,
              salePrice: item.salePrice,
              currency: item.currency,
              saleStock: item.saleStock,
              soldCount: item.soldCount,
            });
          }
        }

        return {
          ...product,
          flashSale: {
            campaignId: cheapest.campaign.campaignId,
            endAt: cheapest.campaign.endDate,
            salePrice: cheapest.item.salePrice,
            currency: cheapest.item.currency,
            saleStock: cheapest.item.saleStock,
            soldCount: cheapest.item.soldCount,
            skuOffers: Array.from(skuOffersMap.values()),
          },
        } satisfies Product;
      });

      const normalizedQuery = params.q?.trim().toLocaleLowerCase();
      const filtered = products.filter((product) => {
        const salePrice = product.flashSale?.salePrice ?? 0;
        return (
          (!normalizedQuery ||
            product.name.toLocaleLowerCase().includes(normalizedQuery)) &&
          (!params.merchantId || product.merchantId === params.merchantId) &&
          (!params.status || product.status === params.status) &&
          (!params.categoryIds?.length ||
            params.categoryIds.some((id) =>
              product.categoryIds.includes(id),
            )) &&
          (!params.brandIds?.length ||
            (product.brandId !== null &&
              params.brandIds.includes(product.brandId))) &&
          (params.priceMin === undefined || salePrice >= params.priceMin) &&
          (params.priceMax === undefined || salePrice <= params.priceMax) &&
          (params.ratingMin === undefined ||
            (product.rating ?? 0) >= params.ratingMin) &&
          (!params.provinceCodes?.length ||
            (product.provinceCode !== null &&
              product.provinceCode !== undefined &&
              params.provinceCodes.includes(product.provinceCode))) &&
          (!params.attributes ||
            Object.entries(params.attributes).every(
              ([attrKey, allowedValues]) => {
                if (!allowedValues || allowedValues.length === 0) return true;
                const productAttrValue = product.attributes?.[attrKey];
                if (
                  productAttrValue !== undefined &&
                  productAttrValue !== null &&
                  allowedValues.includes(productAttrValue)
                ) {
                  return true;
                }
                return (
                  product.variants?.some((variant) => {
                    const val = variant.attributeValues?.[attrKey];
                    return (
                      val !== undefined &&
                      val !== null &&
                      allowedValues.includes(val)
                    );
                  }) ?? false
                );
              },
            ))
        );
      });

      filtered.sort((left, right) => {
        if (params.sort === "PRICE_ASC") {
          return (
            (left.flashSale?.salePrice ?? 0) - (right.flashSale?.salePrice ?? 0)
          );
        }
        if (params.sort === "PRICE_DESC") {
          return (
            (right.flashSale?.salePrice ?? 0) - (left.flashSale?.salePrice ?? 0)
          );
        }
        if (params.sort === "BEST_SELLER") {
          return (right.soldCount ?? 0) - (left.soldCount ?? 0);
        }
        if (params.sort === "NEWEST") {
          return Date.parse(right.createdAt) - Date.parse(left.createdAt);
        }
        return 0;
      });

      const page = params.page ?? 0;
      const size = params.size ?? 20;
      const totalElements = filtered.length;
      const content = filtered.slice(page * size, (page + 1) * size);
      const countBy = (values: Array<string | null>) =>
        values.reduce<Record<string, number>>((counts, value) => {
          if (value) counts[value] = (counts[value] ?? 0) + 1;
          return counts;
        }, {});
      const prices = filtered.map(
        (product) => product.flashSale?.salePrice ?? 0,
      );

      const attributeFacets: Record<string, Record<string, number>> = {};
      for (const product of filtered) {
        if (product.attributes) {
          for (const [key, value] of Object.entries(product.attributes)) {
            if (value) {
              attributeFacets[key] = attributeFacets[key] ?? {};
              attributeFacets[key][value] =
                (attributeFacets[key][value] ?? 0) + 1;
            }
          }
        }
        if (product.variants) {
          for (const variant of product.variants) {
            if (variant.attributeValues) {
              for (const [key, value] of Object.entries(
                variant.attributeValues,
              )) {
                if (value) {
                  attributeFacets[key] = attributeFacets[key] ?? {};
                  attributeFacets[key][value] =
                    (attributeFacets[key][value] ?? 0) + 1;
                }
              }
            }
          }
        }
      }

      return {
        page: {
          content,
          page,
          size,
          totalElements,
          totalPages: size > 0 ? Math.ceil(totalElements / size) : 0,
        },
        facets: {
          brands: countBy(filtered.map((product) => product.brandId)),
          categories: countBy(
            filtered.flatMap((product) => product.categoryIds),
          ),
          attributes: attributeFacets,
          priceRange:
            prices.length > 0
              ? { min: Math.min(...prices), max: Math.max(...prices) }
              : null,
        },
      } satisfies ProductSearchResult;
    }

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
