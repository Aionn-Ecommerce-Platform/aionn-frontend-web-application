"use client";

import type { ComponentType } from "react";
import { cn } from "@/shared/lib/utils";

interface ConsoleStat {
  label: string;
  value: string | number;
  icon: ComponentType<{
    size?: number | string;
    strokeWidth?: number | string;
    className?: string;
  }>;
  iconClass: string;
}

export function ConsoleStatGrid({
  stats,
  columnsClassName = "lg:grid-cols-4",
}: {
  stats: ConsoleStat[];
  columnsClassName?: string;
}) {
  return (
    <div className={cn("mb-5 grid grid-cols-2 gap-3", columnsClassName)}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-2xl border border-gray-600 bg-white/[0.04] p-3.5"
          >
            <Icon
              size={24}
              strokeWidth={2.2}
              className={`shrink-0 ${stat.iconClass}`}
            />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {stat.label}
              </p>
              <p className="truncate text-xl font-extrabold text-white">
                {stat.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
