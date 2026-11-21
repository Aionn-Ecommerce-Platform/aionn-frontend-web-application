"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { merchantService } from "@/lib/services";

/** Maps merchantId to the public store name for order headers. */
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
