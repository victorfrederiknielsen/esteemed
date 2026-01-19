import type { TimeBucket } from "@/gen/esteemed/v1/analytics_pb";
import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ChartDataPoint {
  label: string;
  roomsCreated: number;
  votesCast: number;
  votesRevealed: number;
  roomsClosed: number;
}

const MAX_DATA_POINTS = 60;

function downsample(data: ChartDataPoint[]): ChartDataPoint[] {
  if (data.length <= MAX_DATA_POINTS) return data;

  const ratio = Math.ceil(data.length / MAX_DATA_POINTS);
  const result: ChartDataPoint[] = [];

  for (let i = 0; i < data.length; i += ratio) {
    const chunk = data.slice(i, Math.min(i + ratio, data.length));
    const aggregated: ChartDataPoint = {
      label: chunk[0].label,
      roomsCreated: chunk.reduce((sum, d) => sum + d.roomsCreated, 0),
      votesCast: chunk.reduce((sum, d) => sum + d.votesCast, 0),
      votesRevealed: chunk.reduce((sum, d) => sum + d.votesRevealed, 0),
      roomsClosed: chunk.reduce((sum, d) => sum + d.roomsClosed, 0),
    };
    result.push(aggregated);
  }

  return result;
}

export type MetricKey =
  | "roomsCreated"
  | "votesCast"
  | "votesRevealed"
  | "roomsClosed";

interface MetricConfig {
  key: MetricKey;
  name: string;
  color: string;
}

export const metrics: MetricConfig[] = [
  { key: "roomsCreated", name: "Rooms Created", color: "#6366f1" },
  { key: "votesCast", name: "Votes Cast", color: "#22c55e" },
  { key: "votesRevealed", name: "Votes Revealed", color: "#f97316" },
  { key: "roomsClosed", name: "Rooms Closed", color: "#a855f7" },
];

interface AnalyticsChartProps {
  buckets: TimeBucket[];
  metric: MetricKey;
}

export function AnalyticsChart({ buckets, metric }: AnalyticsChartProps) {
  const data = useMemo(() => {
    const mapped = buckets.map((bucket) => ({
      label: bucket.label,
      roomsCreated: Number(bucket.roomsCreated) || 0,
      votesCast: Number(bucket.votesCast) || 0,
      votesRevealed: Number(bucket.votesRevealed) || 0,
      roomsClosed: Number(bucket.roomsClosed) || 0,
    }));
    return downsample(mapped);
  }, [buckets]);

  const metricConfig = metrics.find((m) => m.key === metric) ?? metrics[0];

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No data available for the selected period
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
            }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
          />
          <Line
            type="monotone"
            dataKey={metricConfig.key}
            name={metricConfig.name}
            stroke={metricConfig.color}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
