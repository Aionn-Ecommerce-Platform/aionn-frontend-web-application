"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface ConsoleFilterOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function ConsoleFilterDropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
  menuClassName = "w-52",
}: {
  label: string;
  value: T;
  options: ConsoleFilterOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const current = options.find((option) => option.value === value);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-xl border border-gray-500 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-slate-200 shadow-sm transition-all hover:border-gray-400 hover:bg-white/10 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30 disabled:cursor-not-allowed disabled:opacity-40"
        aria-expanded={open}
      >
        <span className="text-slate-400">{label}:</span>
        <span className="max-w-[180px] truncate">{current?.label}</span>
        <ChevronDown
          size={14}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open && !disabled && (
        <div
          className={cn(
            "absolute left-0 z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-gray-500 bg-console-panel-raised py-1 shadow-2xl shadow-black/40",
            menuClassName,
          )}
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-purple-500/20 font-semibold text-purple-200"
                    : "text-slate-300 hover:bg-white/5",
                )}
              >
                <span className="truncate">{option.label}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {option.count != null && (
                    <span
                      className={active ? "text-purple-200" : "text-slate-500"}
                    >
                      ({option.count})
                    </span>
                  )}
                  {active && (
                    <Check size={14} className="shrink-0 text-purple-300" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
