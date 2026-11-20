"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { merchantService } from "@/lib/services";

/**
 * Province codes that currently have a merchant.
 *
 * The catalogue has no province facet of its own, so the location filter uses
 * the same public merchant list that powers the store page instead of showing
 * all 63 administrative provinces, many of which have no listings.
 */
export function useMerchantProvinceCodes() {
  const { data: merchants } = useQuery({
    queryKey: ["merchants", "province-map"],
    queryFn: () => merchantService.list(0, 100),
    staleTime: 5 * 60_000,
  });

  return useMemo(() => {
    const codes = new Set<string>();
    (merchants ?? []).forEach((merchant) => {
      if (merchant.provinceCode) {
        codes.add(merchant.provinceCode);
      }
    });
    return codes;
  }, [merchants]);
}
