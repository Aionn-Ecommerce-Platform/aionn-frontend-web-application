import { useLocaleStore, type Locale } from "@/stores/locale.store";
import en from "./messages/en.json";
import vi from "./messages/vi.json";

type Messages = typeof vi;
export type TranslateVars = Record<string, string | number>;

const MESSAGES: Record<Locale, Messages> = { vi, en };
const FALLBACK_LOCALE: Locale = "vi";

export function translate(
  locale: Locale,
  key: string,
  vars?: TranslateVars,
): string {
  let node: unknown = MESSAGES[locale] ?? MESSAGES[FALLBACK_LOCALE];

  for (const segment of key.split(".")) {
    if (node && typeof node === "object" && segment in node) {
      node = (node as Record<string, unknown>)[segment];
    } else {
      return key;
    }
  }

  if (typeof node !== "string") return key;
  if (!vars) return node;

  return Object.entries(vars).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    node,
  );
}

export function t(key: string, vars?: TranslateVars): string {
  return translate(useLocaleStore.getState().locale, key, vars);
}
