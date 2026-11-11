import { translate } from "@/i18n/translate";
import type { Locale } from "@/stores/locale.store";
export function formatVariantKey(key: string, locale: Locale): string {
  const normalized = key.trim().toLowerCase();
  const labels: Record<string, string> = {
    color: "productDetail.attributeColor",
    size: "productDetail.attributeSize",
    type: "productDetail.attributeType",
    storage: "productDetail.attributeStorage",
    ram: "productDetail.attributeRam",
    cpu: "productDetail.attributeCpu",
    screen: "productDetail.attributeScreen",
    material: "productDetail.attributeMaterial",
    volume: "productDetail.attributeVolume",
    pack: "productDetail.attributePack",
  };

  const label = labels[normalized];
  if (label) return translate(locale, label);

  return key
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatVariantValue(value: string): string {
  return String(value).trim();
}

/**
 * Product descriptions arrive with a localized heading. Matching it is content parsing rather than
 * UI copy, so the pattern lives with the other product-detail helpers instead of inside a component.
 */
export const DESCRIPTION_HEADING_PATTERN =
  /^(mô tả sản phẩm|description|product description)\s*\n+/i;

export function getProductImages(imageList: string[]): string[] {
  if (!imageList || imageList.length === 0) {
    return ["/images/logo.png"];
  }
  return Array.from(new Set(imageList.filter(Boolean)));
}
