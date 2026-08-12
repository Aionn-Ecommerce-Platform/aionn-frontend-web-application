import type { PageResult } from "./common";

export type ProductStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "PUBLISHED"
  | "DEACTIVATED"
  | "TAKEN_DOWN"
  | "REJECTED";

export interface ProductVariant {
  skuId: string;
  attributeValues: Record<string, string>;
  price: number;
  originalPrice?: number;
  currency: string;
}

interface FlashSaleSkuOffer {
  skuId: string;
  salePrice: number;
  currency: string;
  saleStock: number;
  soldCount: number;
}

export interface FlashSaleInfo {
  campaignId: string;
  endAt: string;
  salePrice: number;
  currency: string;
  saleStock: number;
  soldCount: number;
  skuOffers: FlashSaleSkuOffer[];
}

interface ActiveFlashSaleItem {
  registrationId: string;
  productId: string;
  skuId: string;
  merchantId: string;
  salePrice: number;
  currency: string;
  saleStock: number;
  soldCount: number;
}

export interface ActiveFlashSale {
  campaignId: string;
  name: string;
  startDate: string;
  endDate: string;
  items: ActiveFlashSaleItem[];
}

export interface Product {
  productId: string;
  merchantId: string;
  name: string;
  brandId: string | null;
  categoryIds: string[];
  imageList: string[];
  tags: string[];
  collectionIds: string[];
  attributes: Record<string, string>;
  variants: ProductVariant[];
  aiDescription: string | null;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  rating?: number;
  reviewCount?: number;
  soldCount?: number;
  flashSale?: FlashSaleInfo | null;
  provinceCode?: string | null;
  provinceName?: string | null;
}

export interface Category {
  categoryId: string;
  parentId: string | null;
  name: string;
  slug: string;
  iconUrl: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTreeNode {
  category: Category;
  children: CategoryTreeNode[];
}

export type MerchantStatus = "ACTIVE" | "SUSPENDED" | "CLOSED";

export interface Merchant {
  merchantId: string;
  ownerId: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  provinceCode: string | null;
  provinceName: string | null;
  status: MerchantStatus;
  commissionRate?: number;
  stripeAccountId?: string | null;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  brandId: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttributeTemplate {
  templateId: string;
  categoryId: string;
  attributes: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

interface ProductSearchFacets {
  brands: Record<string, number>;
  categories: Record<string, number>;
  attributes: Record<string, Record<string, number>>;
  priceRange: { min: number | null; max: number | null } | null;
}

export interface ProductSearchResult {
  page: PageResult<Product>;
  facets: ProductSearchFacets;
}

export type ProductSort =
  | "RELEVANCE"
  | "NEWEST"
  | "PRICE_ASC"
  | "PRICE_DESC"
  | "BEST_SELLER";

export interface ProductSearchParams {
  q?: string;
  merchantId?: string;
  status?: ProductStatus;
  categoryIds?: string[];
  brandIds?: string[];
  priceMin?: number;
  priceMax?: number;

  attributes?: Record<string, string[]>;
  sort?: ProductSort;
  page?: number;
  size?: number;
  ratingMin?: number;
  onSale?: boolean;
  shipping?: string[];

  provinceCodes?: string[];
}
