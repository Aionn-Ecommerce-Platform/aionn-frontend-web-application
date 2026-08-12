import { create } from "zustand";

export type Locale = "vi" | "en";

const STORAGE_KEY = "aionn-locale";

function readPersistedLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const locale = parsed?.state?.locale ?? parsed?.locale;
    return locale === "en" ? "en" : locale === "vi" ? "vi" : null;
  } catch {
    return null;
  }
}

function persistLocale(locale: Locale) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { locale }, version: 0 }),
    );
  } catch {}
}

interface LocaleState {
  locale: Locale;
  hydrated: boolean;
  setLocale: (locale: Locale) => void;
  hydrate: () => void;
}

export const useLocaleStore = create<LocaleState>()((set, get) => ({
  locale: "vi",
  hydrated: false,
  setLocale: (locale) => {
    persistLocale(locale);
    set({ locale });
  },
  hydrate: () => {
    if (get().hydrated) return;
    const persisted = readPersistedLocale();
    if (persisted && persisted !== get().locale) {
      set({ locale: persisted, hydrated: true });
    } else {
      set({ hydrated: true });
    }
  },
}));
