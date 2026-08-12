"use client";

import { useEffect } from "react";
import { useLocaleStore } from "@/stores/locale.store";

export default function LocaleInitializer() {
  const hydrate = useLocaleStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  return null;
}
