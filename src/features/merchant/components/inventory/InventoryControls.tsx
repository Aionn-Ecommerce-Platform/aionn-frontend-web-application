"use client";
import type { ReactNode } from "react";

type ActionTone = "emerald" | "sky" | "amber" | "purple" | "rose";

const TONE_CLASS: Record<ActionTone, string> = {
  emerald: "text-emerald-300 hover:text-emerald-200",
  sky: "text-sky-300 hover:text-sky-200",
  amber: "text-amber-300 hover:text-amber-200",
  purple: "text-purple-300 hover:text-purple-200",
  rose: "text-rose-300 hover:text-rose-200",
};

export function ActionBtn({
  children,
  title,
  tone = "purple",
  onClick,
}: {
  children: ReactNode;
  title: string;
  tone?: ActionTone;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`rounded-lg p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 hover:bg-transparent ${TONE_CLASS[tone]}`}
    >
      {children}
    </button>
  );
}
