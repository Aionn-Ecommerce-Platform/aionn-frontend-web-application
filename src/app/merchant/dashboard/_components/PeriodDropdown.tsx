"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
export function PeriodDropdown<T extends string | number>({
  label,
  value,
  options,
  onChange,
  width = "w-40",
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  width?: string;
}) {
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

  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm text-gray-700 bg-gray-50/80 border border-gray-400 hover:bg-white transition-all font-medium shadow-sm focus:border-blue-400 focus:outline-none"
        aria-label={label}
        aria-expanded={open}
      >
        <span>{current?.label ?? label}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className={`absolute right-0 mt-2 ${width} bg-white rounded-xl border border-gray-400 shadow-lg py-1 z-50 overflow-hidden max-h-72 overflow-y-auto`}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={String(opt.value)}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>{opt.label}</span>
                {active && (
                  <Check size={14} className="text-blue-700 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
