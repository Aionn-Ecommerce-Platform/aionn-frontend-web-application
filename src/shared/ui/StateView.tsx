import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type StateViewTone = "light" | "dark";

interface StateViewProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  meta?: string;
  action?: React.ReactNode;
  eyebrow?: string;
  tone?: StateViewTone;
  iconSize?: number;
  iconClassName?: string;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  actionClassName?: string;
}

/**
 * Shared visual for empty, not-found and error states.
 *
 * The icon intentionally has no background box: pages use one large outline
 * icon, then title, description and optional actions.
 */
export default function StateView({
  icon: Icon,
  title,
  description,
  meta,
  action,
  eyebrow,
  tone = "light",
  iconSize = 56,
  iconClassName,
  className,
  titleClassName,
  descriptionClassName,
  actionClassName,
}: StateViewProps) {
  const dark = tone === "dark";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-16 text-center",
        className,
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            "mb-3 text-xs font-semibold uppercase tracking-[0.3em]",
            dark ? "text-slate-500" : "text-gray-400",
          )}
        >
          {eyebrow}
        </p>
      )}
      <Icon
        size={iconSize}
        strokeWidth={1.5}
        aria-hidden="true"
        className={cn(
          "mb-5",
          dark ? "text-purple-300" : "text-gray-900",
          iconClassName,
        )}
      />
      <h3
        className={cn(
          "text-lg font-semibold",
          dark ? "text-white" : "text-gray-900",
          titleClassName,
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            "mt-1.5 max-w-md text-sm",
            dark ? "text-slate-400" : "text-gray-500",
            descriptionClassName,
          )}
        >
          {description}
        </p>
      )}
      {meta && (
        <p
          className={cn(
            "mt-3 font-mono text-xs",
            dark ? "text-slate-500" : "text-gray-400",
          )}
        >
          {meta}
        </p>
      )}
      {action && (
        <div
          className={cn(
            "mt-6 flex flex-wrap items-center justify-center gap-3",
            actionClassName,
          )}
        >
          {action}
        </div>
      )}
    </div>
  );
}
