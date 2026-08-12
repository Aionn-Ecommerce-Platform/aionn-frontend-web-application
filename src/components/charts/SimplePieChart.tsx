"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { useTranslation } from "@/hooks";
import { formatNumber } from "@/shared/lib/utils";

const PALETTE = [
  "#2563eb",
  "#7c3aed",
  "#059669",
  "#d97706",
  "#dc2626",
  "#0891b2",
  "#9333ea",
  "#65a30d",
];

interface Props {
  data: Array<{ name: string; value: number }>;
  height?: number;
}

export default function SimplePieChart({ data, height = 280 }: Props) {
  const { locale } = useTranslation();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={48}
          outerRadius={88}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => {
            const num = typeof value === "number" ? value : Number(value);
            if (Number.isNaN(num)) return String(value);
            return formatNumber(num, locale);
          }}
          contentStyle={{ borderRadius: 8, borderColor: "#e5e7eb" }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          wrapperStyle={{ fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
