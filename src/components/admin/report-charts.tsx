"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = [
  "#0f3d3e",
  "#c45c26",
  "#2a6f6c",
  "#8b5e3c",
  "#4a5568",
  "#b45309",
  "#1d4ed8",
  "#be123c",
];

function useMounted() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted;
}

function ChartShell({
  children,
  height = 260,
}: {
  children: React.ReactNode;
  height?: number;
}) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

export function ReportBarChart({
  data,
  dataKey = "count",
  nameKey = "label",
  height = 260,
}: {
  data: Array<Record<string, string | number>>;
  dataKey?: string;
  nameKey?: string;
  height?: number;
}) {
  const mounted = useMounted();
  if (!mounted) {
    return (
      <div
        className="animate-pulse rounded-md bg-[var(--bv-concrete)]"
        style={{ height }}
      />
    );
  }
  if (!data.length) {
    return (
      <p className="py-10 text-center text-sm text-[var(--bv-muted)]">
        Bu dönemde veri yok
      </p>
    );
  }

  return (
    <ChartShell height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e2db" />
        <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={56} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey={dataKey} fill="#0f3d3e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartShell>
  );
}

export function ReportPieChart({
  data,
  nameKey = "label",
  valueKey = "value",
  height = 260,
}: {
  data: Array<Record<string, string | number>>;
  nameKey?: string;
  valueKey?: string;
  height?: number;
}) {
  const mounted = useMounted();
  if (!mounted) {
    return (
      <div
        className="animate-pulse rounded-md bg-[var(--bv-concrete)]"
        style={{ height }}
      />
    );
  }
  if (!data.length) {
    return (
      <p className="py-10 text-center text-sm text-[var(--bv-muted)]">
        Bu dönemde veri yok
      </p>
    );
  }

  return (
    <ChartShell height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey={valueKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          innerRadius={48}
          outerRadius={84}
          paddingAngle={2}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ChartShell>
  );
}

export function ReportDualAreaChart({
  data,
}: {
  data: { day: string; total: number; orders: number }[];
}) {
  const mounted = useMounted();
  if (!mounted) {
    return <div className="h-64 w-full animate-pulse rounded-md bg-[var(--bv-concrete)]" />;
  }
  if (!data.length) {
    return (
      <p className="py-10 text-center text-sm text-[var(--bv-muted)]">
        Bu dönemde satış yok
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e2db" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            formatter={(value, name) => [
              name === "total"
                ? Number(value).toLocaleString("tr-TR", {
                    style: "currency",
                    currency: "TRY",
                    maximumFractionDigits: 0,
                  })
                : value,
              name === "total" ? "Ciro" : "Sipariş",
            ]}
          />
          <Bar yAxisId="left" dataKey="total" fill="#c45c26" radius={[3, 3, 0, 0]} name="total" />
          <Bar yAxisId="right" dataKey="orders" fill="#0f3d3e" radius={[3, 3, 0, 0]} name="orders" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
