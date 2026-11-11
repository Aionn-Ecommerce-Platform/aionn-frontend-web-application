/** Shopee-style public product URL: readable slug plus the stable product id. */
export function productPath(product: {
  productId: string;
  slug?: string | null;
}): string {
  const slug = product.slug?.trim();
  return slug
    ? `/products/${encodeURIComponent(slug)}-i.${encodeURIComponent(product.productId)}`
    : `/products/${encodeURIComponent(product.productId)}`;
}

/** Extracts the stable id from `/products/{slug}-i.{id}` or a legacy `/products/{id}`. */
export function productIdFromParam(param: string): string {
  const match = /-i\.([A-Za-z0-9_-]+)$/.exec(param);
  return match?.[1] ?? param;
}
