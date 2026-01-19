import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TrendBadge } from "./TrendBadge";

interface MetricCardProps {
  title: string;
  value: number | bigint;
  changePercent?: number;
  icon: LucideIcon;
  className?: string;
}

export function MetricCard({
  title,
  value,
  changePercent,
  icon: Icon,
  className,
}: MetricCardProps) {
  const displayValue = typeof value === "bigint" ? Number(value) : value;

  return (
    <Card className={cn("py-4", className)}>
      <CardContent className="flex items-center gap-4">
        <div className="rounded-lg bg-primary/10 p-3">
          <Icon className="size-6 text-primary" />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">
              {displayValue.toLocaleString()}
            </span>
            {changePercent !== undefined && (
              <TrendBadge value={changePercent} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
