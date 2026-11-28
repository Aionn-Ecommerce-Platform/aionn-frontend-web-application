import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import StateView from "./StateView";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  iconClassName?: string;
  iconSize?: number;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  iconClassName,
  iconSize = 56,
}: EmptyStateProps) {
  return (
    <StateView
      icon={icon}
      title={title}
      description={description}
      action={action}
      iconSize={iconSize}
      iconClassName={cn("text-gray-900", iconClassName)}
      className={className}
    />
  );
}
