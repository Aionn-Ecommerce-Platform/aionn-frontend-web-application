import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

type ProductSitemapItem = {
  productId: string;
  slug?: string | null;
  updatedAt?: string;
};

async function loadProducts(): Promise<ProductSitemapItem[]> {
  try {
    const response = await fetch(
      `${API_URL}/catalog/products/search/catalog?size=100`,
      { next: { revalidate: 3600 } },
    );
    if (!response.ok) return [];
    const payload = (await response.json()) as {
      data?: { page?: { content?: ProductSitemapItem[] } };
    };
    return payload.data?.page?.content ?? [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const products = await loadProducts();
  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: product.slug
      ? `${SITE_URL}/products/${encodeURIComponent(product.slug)}-i.${encodeURIComponent(product.productId)}`
      : `${SITE_URL}/products/${encodeURIComponent(product.productId)}`,
    lastModified: product.updatedAt ? new Date(product.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/products`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    ...productEntries,
    {
      url: `${SITE_URL}/categories`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/promotions`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/auth/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/auth/register`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/merchant/register`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
