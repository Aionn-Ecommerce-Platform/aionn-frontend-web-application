import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProductDetailView } from "@/features/catalog";
import { productIdFromParam, productPath } from "@/shared/lib/product-url";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

type ProductMetadata = {
  productId: string;
  name: string;
  slug?: string | null;
  aiDescription?: string | null;
  imageList?: string[];
};

async function loadProduct(productId: string): Promise<ProductMetadata | null> {
  try {
    const response = await fetch(
      `${API_URL}/catalog/products/${encodeURIComponent(productId)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: ProductMetadata };
    return payload.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const productId = productIdFromParam(decodeURIComponent(id));
  const product = await loadProduct(productId);
  if (!product) {
    return { title: "Aionn" };
  }

  const canonical = productPath(product);
  const description =
    product.aiDescription?.replace(/\s+/g, " ").trim().slice(0, 160) ||
    `Mua ${product.name} chính hãng trên Aionn.`;
  const images = product.imageList?.filter(Boolean).slice(0, 1) ?? [];

  return {
    title: product.name,
    description,
    alternates: { canonical },
    openGraph: {
      title: product.name,
      description,
      url: canonical,
      type: "website",
      images,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  const productId = productIdFromParam(decoded);
  const product = await loadProduct(productId);
  if (product?.slug) {
    const canonicalSegment = `${product.slug}-i.${productId}`;
    if (decoded !== canonicalSegment) {
      redirect(productPath(product));
    }
  }
  return <ProductDetailView params={params} />;
}
