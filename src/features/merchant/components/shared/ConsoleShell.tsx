"use client";

import type { ReactNode } from "react";

export function ConsolePanel({ children }: { children: ReactNode }) {
  return (
    <div className="relative rounded-2xl bg-console-panel p-4 text-white shadow-2xl shadow-purple-950/30 sm:p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute -left-28 -top-28 h-80 w-80 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

export function ConsoleEmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-600 bg-white/[0.03] px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>
      {children}
    </div>
  );
}
