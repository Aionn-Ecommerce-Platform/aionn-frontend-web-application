"use client";

import { useCallback } from "react";
import { translate, type TranslateVars } from "@/i18n/translate";
import { useLocaleStore } from "@/stores";

export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const t = useCallback(
    (key: string, vars?: TranslateVars) => translate(locale, key, vars),
    [locale],
  );

  return { t, locale, setLocale };
}
