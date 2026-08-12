import type { ElementType } from "react";

const COLOR_CLASS = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  purple: "bg-purple-50 text-purple-600",
  orange: "bg-orange-50 text-orange-600",
  red: "bg-red-50 text-red-600",
} as const;

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ElementType;
  color?: keyof typeof COLOR_CLASS;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "blue",
}: StatCardProps) {
  return (
    <div className="bg-white rounded-md border border-gray-300 p-5">
      <div
        className={`inline-flex p-2.5 rounded-md mb-3 ${COLOR_CLASS[color]}`}
      >
        <Icon size={20} />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm text-gray-600">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
