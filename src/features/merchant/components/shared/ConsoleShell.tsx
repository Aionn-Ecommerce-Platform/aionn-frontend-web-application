"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import StateView from "@/shared/ui/StateView";

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
  iconClassName,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
  iconClassName?: string;
}) {
  return (
    <StateView
      tone="dark"
      icon={icon}
      title={title}
      description={description}
      action={children}
      iconClassName={iconClassName}
      className="rounded-2xl border border-gray-600 bg-white/[0.03]"
    />
  );
}
