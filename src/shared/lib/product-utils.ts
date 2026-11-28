import type { Product } from "@/types";
import { getProductCoverImage } from "@/shared/lib/media";
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
    image: getProductCoverImage(product.imageList),
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
