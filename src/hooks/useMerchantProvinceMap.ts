"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { geographyService, merchantService } from "@/lib/services";
import { cleanProvinceName } from "@/shared/lib/address-utils";
import { useTranslation } from "./useTranslation";

/**
 * Maps merchantId to a display-ready province name for product cards.
 * Merchants are a small, public dataset; five-minute caching keeps this cheap.
 */
export function useMerchantProvinceMap() {
  const { locale } = useTranslation();

  const { data: merchants } = useQuery({
    queryKey: ["merchants", "province-map"],
    queryFn: () => merchantService.list(0, 100),
    staleTime: 5 * 60_000,
  });

  const { data: provinces } = useQuery({
    queryKey: ["geography", "provinces", "VN"],
    queryFn: () => geographyService.listProvinces("VN"),
    staleTime: 60 * 60_000,
  });

  const provinceNameByCode = useMemo(() => {
    const map = new Map<string, string>();
    (provinces ?? []).forEach((province) => {
      const name =
        locale === "en" && province.nameEn
          ? province.nameEn
          : province.name;
      map.set(province.code, cleanProvinceName(name));
    });
    return map;
  }, [provinces, locale]);

  return useMemo(() => {
    const map = new Map<string, string>();
    (merchants ?? []).forEach((merchant) => {
      const localized = merchant.provinceCode
        ? provinceNameByCode.get(merchant.provinceCode)
        : undefined;
      const fallback = merchant.provinceName
        ? cleanProvinceName(merchant.provinceName)
        : undefined;
      const name = localized ?? fallback;
      if (name) map.set(merchant.merchantId, name);
    });
    return map;
  }, [merchants, provinceNameByCode]);
}
