export type AnalyticsPeriod = "7d" | "30d" | "90d";

export function getDateRange(period: AnalyticsPeriod) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(
    to.getDate() - (period === "7d" ? 6 : period === "30d" ? 29 : 89),
  );
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}
