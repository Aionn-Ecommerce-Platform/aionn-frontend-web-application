interface LocalizedAddress {
  detailAddress: string;
  wardName?: string | null;
  districtName?: string | null;
  provinceName?: string | null;
  fullAddress?: string | null;
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
    cleaned = cleaned
      .replace(/^(Thành Phố|Thanh Pho)\s+/i, "")
      .replace(/^(Tỉnh|Tinh)\s+/i, "");
    const suffix = /thành phố|thanh pho/i.test(name) ? "City" : "Province";
    return `${removeTones(cleaned)} ${suffix}`;
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
