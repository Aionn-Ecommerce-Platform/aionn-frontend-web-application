import type { GeographyItem } from "@/types";

interface LocalizedAddress {
  detailAddress: string;
  wardName?: string | null;
  districtName?: string | null;
  provinceName?: string | null;
  fullAddress?: string | null;
}

const KNOWN_PROVINCE_EN: Record<string, string> = {
  "ha noi": "Hanoi",
  "ho chi minh": "Ho Chi Minh City",
  "da nang": "Da Nang",
  "hai phong": "Hai Phong",
  "can tho": "Can Tho",
  "hue": "Hue",
};

const ISO_PROVINCE_MAP: Record<string, { vi: string; en: string }> = {
  "VN-HN": { vi: "Thành phố Hà Nội", en: "Hanoi" },
  "VN-SG": { vi: "Thành phố Hồ Chí Minh", en: "Ho Chi Minh City" },
  "VN-HCM": { vi: "Thành phố Hồ Chí Minh", en: "Ho Chi Minh City" },
  "VN-DN": { vi: "Thành phố Đà Nẵng", en: "Da Nang" },
  "VN-DAD": { vi: "Thành phố Đà Nẵng", en: "Da Nang" },
  "VN-DG": { vi: "Tỉnh Đồng Nai", en: "Dong Nai Province" },
  "VN-HP": { vi: "Thành phố Hải Phòng", en: "Hai Phong" },
  "VN-HPH": { vi: "Thành phố Hải Phòng", en: "Hai Phong" },
  "VN-CT": { vi: "Thành phố Cần Thơ", en: "Can Tho" },
  "VN-BD": { vi: "Tỉnh Bình Dương", en: "Binh Duong Province" },
  "VN-KH": { vi: "Tỉnh Khánh Hòa", en: "Khanh Hoa Province" },
  "VN-QN": { vi: "Tỉnh Quảng Ninh", en: "Quang Ninh Province" },
  "01": { vi: "Thành phố Hà Nội", en: "Hanoi" },
  "79": { vi: "Thành phố Hồ Chí Minh", en: "Ho Chi Minh City" },
};

export function resolveProvinceName(
  provinceCode: string | null | undefined,
  provinces?: GeographyItem[],
  locale = "vi",
): string | null {
  if (!provinceCode) return null;
  const normalized = provinceCode.trim();
  if (!normalized) return null;

  if (provinces && provinces.length > 0) {
    const match = provinces.find(
      (p) =>
        p.code.toLowerCase() === normalized.toLowerCase() ||
        p.code.toLowerCase() === normalized.replace(/^vn-/i, "").toLowerCase(),
    );
    if (match) {
      if (locale === "en") {
        const nameEn = match.nameEn?.trim();
        // The seeded GSO rows store a plain transliteration (for example
        // "thanh pho ha noi") in name_en, which is not display-ready English.
        // Only trust a real translation; otherwise derive one from the name.
        if (
          nameEn &&
          nameEn.toLowerCase() !== removeTones(match.name).trim().toLowerCase()
        ) {
          return nameEn;
        }
        return englishProvinceName(match.name);
      }
      return match.name;
    }
  }

  const upperCode = normalized.toUpperCase();
  const isoMatch = ISO_PROVINCE_MAP[upperCode];
  if (isoMatch) {
    return locale === "en" ? isoMatch.en : isoMatch.vi;
  }

  return null;
}

export function cleanProvinceName(name: string): string {
  if (!name) return "";
  let cleaned = name.trim();
  for (const pattern of [
    /^(thành phố|thanh pho)\s+/i,
    /^(tỉnh|tinh)\s+/i,
    /^(province of|province)\s+/i,
    /\s+(city|province|town)$/i,
  ]) {
    cleaned = cleaned.replace(pattern, "");
  }
  return toTitleCase(cleaned.trim());
}

function englishProvinceName(name: string): string {
  if (!name) return "";
  const base = cleanProvinceName(name);
  if (!base) return "";
  const known = KNOWN_PROVINCE_EN[removeTones(base).toLowerCase()];
  if (known) return known;
  const isCity = /thành phố|thanh pho/i.test(name);
  return `${removeTones(base)} ${isCity ? "City" : "Province"}`;
}

/**
 * Checks whether an address line already ends with (or contains) the province,
 * ignoring Vietnamese diacritics, case and administrative prefixes such as
 * "Thành phố" / "Tỉnh". This prevents appending a duplicate province when the
 * stored address snapshot already includes it.
 */
export function addressContainsProvince(
  addressLine: string | null | undefined,
  provinceName: string | null | undefined,
): boolean {
  if (!addressLine || !provinceName) return false;

  const normalize = (value: string) =>
    removeTones(value)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\b(thanh pho|tinh|tp|city|province)\b/g, " ")
      .replace(/\s+/g, "");

  const normalizedLine = normalize(addressLine);
  const normalizedProvince = normalize(provinceName);
  return (
    normalizedProvince.length > 0 && normalizedLine.includes(normalizedProvince)
  );
}

export function getLocalizedAddress(
  address: LocalizedAddress,
  locale: string,
): string {
  if (locale !== "en") {
    return (
      address.fullAddress ||
      [
        address.detailAddress,
        address.wardName,
        address.districtName,
        address.provinceName,
      ]
        .filter(Boolean)
        .join(", ")
    );
  }

  return [
    removeTones(address.detailAddress),
    translateAdministrativeName(address.wardName, "ward"),
    translateAdministrativeName(address.districtName, "district"),
    translateAdministrativeName(address.provinceName, "province"),
  ]
    .filter(Boolean)
    .join(", ");
}

function translateAdministrativeName(
  name: string | null | undefined,
  type: "ward" | "district" | "province",
) {
  if (!name) return "";
  let cleaned = toTitleCase(name.trim());

  if (type === "province") {
    return englishProvinceName(name);
  }

  if (type === "district") {
    cleaned = cleaned
      .replace(/^(Quận|Quan)\s+/i, "")
      .replace(/^(Huyện|Huyen)\s+/i, "")
      .replace(/^(Thị Xã|Thi Xa)\s+/i, "");
    return `${removeTones(cleaned)} District`;
  }

  cleaned = cleaned
    .replace(/^(Phường|Phuong)\s+/i, "")
    .replace(/^(Xã|Xa)\s+/i, "")
    .replace(/^(Thị Trấn|Thi Tran)\s+/i, "");
  return `${removeTones(cleaned)} Ward`;
}

function removeTones(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
