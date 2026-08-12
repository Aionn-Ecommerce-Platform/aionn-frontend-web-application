"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
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
  yFormatter?: (value: number) => string;
}

export default function TrendLineChart({
  data,
  xKey,
  yKey,
  color = "#2563eb",
  height = 280,
  yFormatter,
}: Props) {
  const { locale } = useTranslation();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
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
        <Line
          type="monotone"
          dataKey={yKey}
          stroke={color}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
