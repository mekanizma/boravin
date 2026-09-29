export type ReportPeriod = "7d" | "30d" | "90d" | "month";

export const REPORT_PERIODS: Array<{ id: ReportPeriod; label: string }> = [
  { id: "7d", label: "Son 7 gün" },
  { id: "30d", label: "Son 30 gün" },
  { id: "90d", label: "Son 90 gün" },
  { id: "month", label: "Bu ay" },
];

export function resolveReportRange(period: ReportPeriod) {
  const end = new Date();
  const start = new Date();

  if (period === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else {
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    start.setTime(end.getTime() - days * 86400000);
    start.setHours(0, 0, 0, 0);
  }

  const durationMs = Math.max(1, end.getTime() - start.getTime());
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);

  return { start, end, prevStart, prevEnd, period };
}

export function parseReportPeriod(value?: string | null): ReportPeriod {
  if (value === "7d" || value === "90d" || value === "month") return value;
  return "30d";
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}%`;
}
