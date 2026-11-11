import { cn } from "@/shared/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export default function Card({
  children,
  className,
  padding = true,
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-gray-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-gray-300/80 transition-all",
        padding && "p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn("text-lg font-semibold text-gray-900 tracking-tight", className)}>
      {children}
    </h3>
  );
}
