import {
  type AnalyticsSummary,
  DateRange,
  type Granularity,
  type TimeBucket,
} from "@/gen/esteemed/v1/analytics_pb";
import { analyticsClient } from "@/lib/client";
import { useCallback, useEffect, useState } from "react";

interface UseAnalyticsState {
  summary: AnalyticsSummary | null;
  buckets: TimeBucket[];
  granularity: Granularity | null;
  dateRange: DateRange;
  isLoading: boolean;
  error: string | null;
}

interface UseAnalyticsActions {
  setDateRange: (range: DateRange) => void;
  refresh: () => Promise<void>;
}

export function useAnalytics(): UseAnalyticsState & UseAnalyticsActions {
  const [state, setState] = useState<UseAnalyticsState>({
    summary: null,
    buckets: [],
    granularity: null,
    dateRange: DateRange.LAST_7_DAYS,
    isLoading: false,
    error: null,
  });

  const fetchAnalytics = useCallback(async (range: DateRange) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await analyticsClient.getAnalytics({ dateRange: range });
      setState((prev) => ({
        ...prev,
        summary: response.summary ?? null,
        buckets: response.buckets,
        granularity: response.granularity,
        isLoading: false,
      }));
    } catch (err) {
      const error =
        err instanceof Error ? err.message : "Failed to fetch analytics";
      setState((prev) => ({ ...prev, isLoading: false, error }));
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(state.dateRange);
  }, [state.dateRange, fetchAnalytics]);

  const setDateRange = useCallback((range: DateRange) => {
    setState((prev) => ({ ...prev, dateRange: range }));
  }, []);

  const refresh = useCallback(async () => {
    await fetchAnalytics(state.dateRange);
  }, [fetchAnalytics, state.dateRange]);

  return {
    ...state,
    setDateRange,
    refresh,
  };
}

export { DateRange };
