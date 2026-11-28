"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { merchantService } from "@/lib/services";

/** Maps merchantId to the public store name for order headers. */
export function useMerchantDirectory() {
  const { data: merchants } = useQuery({
    queryKey: ["merchants", "name-map"],
    queryFn: () => merchantService.list(0, 100),
    staleTime: 5 * 60 * 1000,
  });
  return useMemo(() => {
    const map = new Map<string, { name: string; logoUrl: string | null }>();
    (merchants ?? []).forEach((m) => {
      if (m.name)
        map.set(m.merchantId, { name: m.name, logoUrl: m.logoUrl ?? null });
    });
    return map;
  }, [merchants]);
}

export function useMerchantNameMap() {
  const { data: merchants } = useQuery({
    queryKey: ["merchants", "name-map"],
    queryFn: () => merchantService.list(0, 100),
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    const map = new Map<string, string>();
    (merchants ?? []).forEach((merchant) => {
      if (merchant.name) map.set(merchant.merchantId, merchant.name);
    });
    return map;
  }, [merchants]);
}
