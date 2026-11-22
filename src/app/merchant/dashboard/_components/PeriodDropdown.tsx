"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const close = (event?: Event) => {
      const target = event?.target as Node | null;
      if (target && menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="relative inline-block text-left" ref={buttonRef}>
      <button
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          const rect = buttonRef.current?.getBoundingClientRect();
          if (!rect) return;
          setMenuPosition({
            top: rect.bottom + 8,
            right: Math.max(8, window.innerWidth - rect.right),
          });
          setOpen(true);
        }}
        className="flex items-center gap-1.5 rounded-xl border border-gray-400 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-slate-100 shadow-sm transition-all hover:border-gray-300 hover:bg-white/10 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
        aria-label={label}
        aria-expanded={open}
      >
        <span>{current?.label ?? label}</span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: menuPosition.top,
              right: menuPosition.right,
            }}
            className={`z-[100] max-h-48 ${width} overflow-y-auto rounded-xl border border-gray-500 bg-console-panel-raised py-1 shadow-2xl shadow-black/50`}
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
                  className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-purple-500/20 font-semibold text-purple-200"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <span>{opt.label}</span>
                  {active && (
                    <Check
                      size={14}
                      className="ml-2 shrink-0 text-purple-300"
                    />
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
