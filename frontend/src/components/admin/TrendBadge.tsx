import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

interface TrendBadgeProps {
  value: number;
  className?: string;
}

export function TrendBadge({ value, className }: TrendBadgeProps) {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        isNeutral && "bg-muted text-muted-foreground",
        isPositive &&
          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        !isPositive &&
          !isNeutral &&
          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        className,
      )}
    >
      {isPositive ? (
        <TrendingUp className="size-3" />
      ) : isNeutral ? null : (
        <TrendingDown className="size-3" />
      )}
      {isPositive ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}
