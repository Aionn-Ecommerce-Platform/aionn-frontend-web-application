import { cn } from "@/shared/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  iconWrapperClassName?: string;
  iconClassName?: string;
  iconSize?: number;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  iconWrapperClassName,
  iconClassName,
  iconSize = 40,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        className,
      )}
    >
      <div
        className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-4",
          iconWrapperClassName,
        )}
      >
        <Icon size={iconSize} className={cn("text-gray-950", iconClassName)} />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>
      )}
      {action}
    </div>
  );
}
