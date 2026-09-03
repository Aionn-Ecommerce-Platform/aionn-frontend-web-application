"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { VN, US } from "country-flag-icons/react/3x2";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/hooks";

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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

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
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-white hover:bg-white/15 transition-colors"
        aria-label="Switch language"
        aria-expanded={open}
      >
        <div className="h-5 w-5 rounded-full overflow-hidden flex items-center justify-center shadow-sm ring-1 ring-white/50 shrink-0">
          <CurrentFlag className="w-full h-full scale-150" />
        </div>
        <span className="font-semibold capitalize">{t(current.labelKey)}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl border border-gray-100 shadow-lg py-1 z-50">
          {ordered.map((lang) => {
            const Flag = lang.Flag;
            const active = lang.code === current.code;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  if (lang.code !== locale) {
                    setLocale(lang.code);

                    qc.invalidateQueries();
                    router.refresh();
                  }
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="h-5 w-5 rounded-full overflow-hidden flex items-center justify-center shadow-sm ring-1 ring-black/10 shrink-0">
                  <Flag className="w-full h-full scale-150" />
                </div>
                <span className="flex-1 text-left capitalize">
                  {t(lang.labelKey)}
                </span>
                {active && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
