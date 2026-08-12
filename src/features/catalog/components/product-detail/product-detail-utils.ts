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

export function formatVariantSummary(
  attributeValues?: Record<string, string> | null,
): string {
  if (!attributeValues) return "";
  return Object.values(attributeValues)
    .map(formatVariantValue)
    .filter(Boolean)
    .join(" / ");
}

export function getVariantLabelFromAttributes(
  attributeValues: Record<string, string> | undefined,
  locale: Locale,
): string {
  const keys = Object.keys(attributeValues ?? {}).map((key) =>
    key.trim().toLowerCase(),
  );
  if (keys.includes("color") && keys.includes("size")) {
    return translate(locale, "productDetail.colorAndSize");
  }
  if (keys.includes("storage") && keys.includes("color")) {
    return translate(locale, "productDetail.storageAndColor");
  }
  if (keys.includes("type") && keys.includes("color")) {
    return translate(locale, "productDetail.typeAndColor");
  }
  if (keys.length > 0) {
    return keys.map((key) => formatVariantKey(key, locale)).join(" & ");
  }

  return translate(locale, "productDetail.classification");
}

export function getProductImages(imageList: string[]): string[] {
  if (!imageList || imageList.length === 0) {
    return ["/images/logo.png"];
  }
  return Array.from(new Set(imageList.filter(Boolean)));
}
