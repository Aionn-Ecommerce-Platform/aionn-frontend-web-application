"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { VN, US } from "country-flag-icons/react/3x2";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/hooks";
import { useAuthStore } from "@/stores/auth.store";
import { preferenceService } from "@/lib/services";
import { qk } from "@/lib/query-keys";
import type { UserPreference } from "@/types";

type Locale = "vi" | "en";

const LANGUAGES = [
  { code: "vi", labelKey: "settings.languageVi", Flag: VN },
  { code: "en", labelKey: "settings.languageEn", Flag: US },
] as const satisfies readonly {
  code: Locale;
  labelKey: string;
  Flag: React.ComponentType<{ className?: string; title?: string }>;
}[];

export default function LanguageSwitcher() {
  const { t, locale, setLocale } = useTranslation();
  const qc = useQueryClient();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const updateSeqRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];
  const ordered = [
    current,
    ...LANGUAGES.filter((l) => l.code !== current.code),
  ];
  const CurrentFlag = current.Flag;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-100"
        aria-label="Switch language"
        aria-expanded={open}
      >
        <div className="h-5 w-5 rounded-full overflow-hidden flex items-center justify-center shadow-xs ring-1 ring-gray-200 shrink-0">
          <CurrentFlag className="w-full h-full scale-150" />
        </div>
        <span className="capitalize">{t(current.labelKey)}</span>
        <ChevronDown
          size={14}
          className={`text-gray-700 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-44 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl">
          {ordered.map((lang) => {
            const Flag = lang.Flag;
            const active = lang.code === current.code;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  if (lang.code !== locale) {
                    setLocale(lang.code);

                    if (isAuthenticated) {
                      const seq = ++updateSeqRef.current;
                      void qc
                        .ensureQueryData<UserPreference>({
                          queryKey: qk.preferences,
                          queryFn: () => preferenceService.get(),
                        })
                        .then((base) => {
                          if (seq !== updateSeqRef.current) return;
                          return preferenceService
                            .updateGeneral({
                              language: lang.code,
                              currency: base?.currency ?? "VND",
                              timezone: base?.timezone ?? "Asia/Ho_Chi_Minh",
                              theme: base?.theme ?? "light",
                            })
                            .then((updated) => {
                              if (seq === updateSeqRef.current) {
                                qc.setQueryData(qk.preferences, updated);
                              }
                            });
                        })
                        .catch(() => {});
                    }

                    qc.invalidateQueries();
                    router.refresh();
                  }
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-gray-950 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <div className="h-5 w-5 rounded-full overflow-hidden flex items-center justify-center shadow-xs ring-1 ring-gray-200 shrink-0">
                  <Flag className="w-full h-full scale-150" />
                </div>
                <span className="flex-1 text-left capitalize">
                  {t(lang.labelKey)}
                </span>
                {active && (
                  <Check size={14} className="shrink-0 text-white" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
