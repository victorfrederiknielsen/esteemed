import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRange } from "@/gen/esteemed/v1/analytics_pb";

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
}

const dateRangeLabels: Record<DateRange, string> = {
  [DateRange.UNSPECIFIED]: "Select range",
  [DateRange.TODAY]: "Today",
  [DateRange.LAST_7_DAYS]: "Last 7 days",
  [DateRange.LAST_30_DAYS]: "Last 30 days",
  [DateRange.LAST_90_DAYS]: "Last 90 days",
  [DateRange.ALL_TIME]: "All time",
};

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  return (
    <Select
      value={value.toString()}
      onValueChange={(v) => onChange(Number(v) as DateRange)}
    >
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="Select range" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={DateRange.TODAY.toString()}>
          {dateRangeLabels[DateRange.TODAY]}
        </SelectItem>
        <SelectItem value={DateRange.LAST_7_DAYS.toString()}>
          {dateRangeLabels[DateRange.LAST_7_DAYS]}
        </SelectItem>
        <SelectItem value={DateRange.LAST_30_DAYS.toString()}>
          {dateRangeLabels[DateRange.LAST_30_DAYS]}
        </SelectItem>
        <SelectItem value={DateRange.LAST_90_DAYS.toString()}>
          {dateRangeLabels[DateRange.LAST_90_DAYS]}
        </SelectItem>
        <SelectItem value={DateRange.ALL_TIME.toString()}>
          {dateRangeLabels[DateRange.ALL_TIME]}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
