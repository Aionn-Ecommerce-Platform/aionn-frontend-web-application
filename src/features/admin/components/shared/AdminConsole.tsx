"use client";

import { type ComponentType, type ReactNode } from "react";

import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";
import StateView from "@/shared/ui/StateView";
import { cn } from "@/shared/lib/utils";

export function AdminHeader({
  icon: Icon,
  title,
  description,
  badge,
  actions,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-purple-300">
          {Icon && <Icon size={22} className="shrink-0 text-purple-300" />}
          <span className="truncate">{title}</span>
          {badge}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      )}
    </div>
  );
}

type AdminTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple"
  | "neutral";

const PILL_TONES: Record<AdminTone, string> = {
  success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  warning: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  danger: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  info: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  purple: "border-purple-400/30 bg-purple-400/10 text-purple-200",
  neutral: "border-slate-500/40 bg-white/5 text-slate-300",
};

export function AdminPill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: AdminTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold",
        PILL_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

interface AdminStat {
  label: string;
  value: string | number;
  icon: ComponentType<{
    size?: number | string;
    strokeWidth?: number | string;
    className?: string;
  }>;
  iconClass?: string;
}

export function AdminStats({
  stats,
  columns = "lg:grid-cols-4",
}: {
  stats: AdminStat[];
  columns?: string;
}) {
  return (
    <div className={cn("mb-5 grid grid-cols-2 gap-3", columns)}>
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
              className={cn("shrink-0 text-purple-300", stat.iconClass)}
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

export function AdminSearch({
  value,
  onChange,
  placeholder,
  className,
  ariaLabel,
  fullWidth = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  ariaLabel?: string;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={cn("relative w-full", !fullWidth && "sm:max-w-sm", className)}
    >
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
      />
      <input
        type="search"
        value={value}
        aria-label={ariaLabel ?? placeholder}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-500 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
      />
    </div>
  );
}

export function AdminSelect({
  value,
  onChange,
  children,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "cursor-pointer rounded-xl border border-gray-500 bg-white/5 px-3 py-2.5 text-sm text-slate-200 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30",
        className,
      )}
    >
      {children}
    </select>
  );
}

export function AdminEmpty({
  icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <StateView
      tone="dark"
      icon={icon}
      title={title}
      description={description}
      action={action}
      className="rounded-2xl border border-gray-600 bg-white/[0.03]"
    />
  );
}

export function AdminTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-2xl border border-gray-600 bg-white/[0.04]",
        className,
      )}
    >
      <table className="w-full min-w-full">{children}</table>
    </div>
  );
}

export const adminTh =
  "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400";

export const adminTd = "px-4 py-3 align-middle text-sm text-slate-200";

export const adminRow =
  "border-b border-slate-600/60 transition-colors last:border-0 hover:bg-white/[0.04]";

export const adminPrimaryClass =
  "inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-900/40 transition-all hover:from-purple-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60";

export function AdminTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "cursor-pointer rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors",
              active
                ? "border-purple-400/50 bg-purple-600 text-white shadow-md shadow-purple-900/40"
                : "border-gray-500 bg-white/5 text-slate-200 hover:border-gray-400 hover:bg-white/10 hover:text-white",
            )}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  active ? "bg-white/20" : "bg-white/10 text-slate-300",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
