"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { geographyService } from "@/lib/services";
import { cleanProvinceName } from "@/shared/lib/address-utils";
import { useTranslation } from "./useTranslation";

/**
 * Resolves a merchant province to the active locale. When a province code is
 * available it is authoritative; otherwise the supplied name is only cleaned.
 */
export function useProvinceDisplayName(
  provinceName?: string | null,
  provinceCode?: string | null,
) {
  const { locale } = useTranslation();

  const { data: provinces } = useQuery({
    queryKey: ["geography", "provinces", "VN"],
    queryFn: () => geographyService.listProvinces("VN"),
    enabled: Boolean(provinceCode),
    staleTime: 60 * 60_000,
  });

  return useMemo(() => {
    if (provinceCode) {
      const province = provinces?.find((item) => item.code === provinceCode);
      if (province) {
        const label =
          locale === "en"
            ? (province.nameEn ?? province.name)
            : province.name;
        return cleanProvinceName(label);
      }
    }
    return provinceName ? cleanProvinceName(provinceName) : undefined;
  }, [provinceName, provinceCode, provinces, locale]);
}
