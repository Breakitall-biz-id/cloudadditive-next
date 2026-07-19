"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import { formatAdminCurrency } from "@/lib/admin-metrics";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface AdminActivityPoint {
  key: string;
  label: string;
  orders: number;
  paidRevenue: number;
  completed: number;
}

const chartConfig = {
  paidRevenue: {
    label: "Paid revenue",
    color: "#9ac8b6",
  },
  orders: {
    label: "Order volume",
    color: "#075e57",
  },
} satisfies ChartConfig;

export function AdminActivityChart({ series }: { series: AdminActivityPoint[] }) {
  return (
    <ChartContainer
      config={chartConfig}
      initialDimension={{ width: 960, height: 250 }}
      className="h-[250px] w-full aspect-auto"
      aria-label="Paid revenue and order volume for the last twelve months"
    >
      <ComposedChart accessibilityLayer data={series} margin={{ top: 18, right: 12, left: 12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e5e9e6" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tickMargin={12}
          minTickGap={16}
          tick={{ fill: "#7d8883", fontSize: 11 }}
        />
        <YAxis yAxisId="revenue" hide domain={[0, "dataMax + 1"]} />
        <YAxis yAxisId="orders" hide orientation="right" domain={[0, "dataMax + 1"]} />
        <ChartTooltip
          cursor={{ fill: "#edf1ee", opacity: 0.7 }}
          content={
            <ChartTooltipContent
              className="min-w-48 border-[var(--admin-line)] bg-white shadow-[var(--admin-shadow-card)]"
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-[#78847f]">{chartConfig[name as keyof typeof chartConfig]?.label ?? name}</span>
                  <span className="font-semibold tabular-nums text-[#17201d]">
                    {name === "paidRevenue" ? formatAdminCurrency(Number(value)) : Number(value).toLocaleString("id-ID")}
                  </span>
                </div>
              )}
            />
          }
        />
        <Bar
          yAxisId="revenue"
          dataKey="paidRevenue"
          fill="var(--color-paidRevenue)"
          radius={[5, 5, 5, 5]}
          maxBarSize={28}
          animationDuration={650}
        />
        <Line
          yAxisId="orders"
          type="monotone"
          dataKey="orders"
          stroke="var(--color-orders)"
          strokeWidth={3}
          dot={{ r: 3, fill: "#f9faf8", stroke: "#075e57", strokeWidth: 2 }}
          activeDot={{ r: 5, fill: "#075e57", stroke: "#f9faf8", strokeWidth: 2 }}
          animationDuration={900}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
