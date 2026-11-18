import type { Product } from "@/types";

export function getProductCardSummary(product: Product) {
  const lowestVariant = product.variants?.reduce<
    Product["variants"][number] | null
  >(
    (lowest, current) =>
      !lowest || current.price < lowest.price ? current : lowest,
    null,
  );

  return {
    price: lowestVariant?.price ?? 0,
    originalPrice: lowestVariant?.originalPrice,
    image: product.imageList?.[0] ?? "/images/logo.png",
  };
}

export function formatVariantLabel(
  attributeValues: Record<string, string> | null | undefined,
  separator = " / ",
) {
  if (!attributeValues) return "";

  const keyOrder = ["color", "size", "storage", "ram", "cpu", "type", "option"];
  return Object.entries(attributeValues)
    .sort(([a], [b]) => {
      const ai = keyOrder.indexOf(a.trim().toLowerCase());
      const bi = keyOrder.indexOf(b.trim().toLowerCase());
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    })
    .filter(([key, value]) => {
      const normalizedKey = key.trim().toLowerCase();
      const normalizedValue = value.trim().toLowerCase();
      return !(
        normalizedKey === "option" && /^option\s+\d+$/.test(normalizedValue)
      );
    })
    .map(([, value]) => value.trim())
    .filter(Boolean)
    .join(separator);
}
