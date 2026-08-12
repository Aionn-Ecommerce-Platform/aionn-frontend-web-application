export const CHECKOUT_SELECTION_STORAGE_KEY = "aionn-checkout-sku-ids";

export function getStoredCheckoutSelection(selectedSkuParam: string) {
  const fromUrl = selectedSkuParam
    .split(",")
    .map((skuId) => skuId.trim())
    .filter(Boolean);
  if (fromUrl.length) return fromUrl;
  try {
    const raw = sessionStorage.getItem(CHECKOUT_SELECTION_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}
