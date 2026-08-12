"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useTranslation } from "@/hooks";
import { formatNumber } from "@/shared/lib/utils";

interface Props {
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
  horizontal?: boolean;
  yFormatter?: (value: number) => string;
}

export default function SimpleBarChart({
  data,
  xKey,
  yKey,
  color = "#7c3aed",
  height = 280,
  horizontal = false,
  yFormatter,
}: Props) {
  const { locale } = useTranslation();
  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 24, bottom: 8 }}
        >
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <XAxis
            type="number"
            stroke="#6b7280"
            fontSize={12}
            tickFormatter={yFormatter}
          />
          <YAxis
            type="category"
            dataKey={xKey}
            stroke="#6b7280"
            fontSize={12}
            width={120}
          />
          <Tooltip
            formatter={(value) => {
              const num = typeof value === "number" ? value : Number(value);
              if (Number.isNaN(num)) return String(value);
              return yFormatter ? yFormatter(num) : formatNumber(num, locale);
            }}
            contentStyle={{ borderRadius: 8, borderColor: "#e5e7eb" }}
          />
          <Bar dataKey={yKey} fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
        <XAxis dataKey={xKey} stroke="#6b7280" fontSize={12} />
        <YAxis
          stroke="#6b7280"
          fontSize={12}
          tickFormatter={yFormatter}
          width={yFormatter ? 80 : 50}
        />
        <Tooltip
          formatter={(value) => {
            const num = typeof value === "number" ? value : Number(value);
            if (Number.isNaN(num)) return String(value);
            return yFormatter ? yFormatter(num) : formatNumber(num, locale);
          }}
          contentStyle={{ borderRadius: 8, borderColor: "#e5e7eb" }}
        />
        <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
