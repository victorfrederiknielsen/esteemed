import { AnalyticsChart, metrics } from "@/components/admin/AnalyticsChart";
import { DateRangeSelector } from "@/components/admin/DateRangeSelector";
import { LiveEvents } from "@/components/admin/LiveEvents";
import { MetricCard } from "@/components/admin/MetricCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHeader } from "@/contexts/HeaderContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  Activity,
  BarChart3,
  DoorClosed,
  DoorOpen,
  Eye,
  Loader2,
  TriangleAlert,
  Vote,
} from "lucide-react";
import { useEffect } from "react";

function AnalyticsDashboard() {
  const { summary, buckets, dateRange, isLoading, error, setDateRange } =
    useAnalytics();

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <TriangleAlert className="size-5" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Rooms Created"
              value={summary?.totalRooms ?? 0}
              changePercent={summary?.roomsChangePercent}
              icon={DoorOpen}
            />
            <MetricCard
              title="Votes Cast"
              value={summary?.totalVotes ?? 0}
              changePercent={summary?.votesChangePercent}
              icon={Vote}
            />
            <MetricCard
              title="Votes Revealed"
              value={summary?.totalReveals ?? 0}
              icon={Eye}
            />
            <MetricCard
              title="Rooms Closed"
              value={summary?.totalClosures ?? 0}
              icon={DoorClosed}
            />
          </div>

          <Tabs defaultValue="roomsCreated" className="w-full items-stretch">
            <Card>
              <CardHeader className="block">
                <TabsList>
                  {metrics.map((metric) => (
                    <TabsTrigger key={metric.key} value={metric.key}>
                      {metric.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </CardHeader>
              <CardContent>
                {metrics.map((metric) => (
                  <TabsContent
                    key={metric.key}
                    value={metric.key}
                    className="mt-0 w-full"
                  >
                    <AnalyticsChart buckets={buckets} metric={metric.key} />
                  </TabsContent>
                ))}
              </CardContent>
            </Card>
          </Tabs>
        </>
      )}
    </div>
  );
}

export function AdminPage() {
  const { setBreadcrumbs } = useHeader();

  useEffect(() => {
    setBreadcrumbs([{ label: "Esteemed", href: "/" }, { label: "Admin" }]);
  }, [setBreadcrumbs]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-6">
      <Tabs defaultValue="analytics" className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor application activity and events
            </p>
          </div>
          <TabsList>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="size-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="live-events" className="gap-2">
              <Activity className="size-4" />
              Live Events
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="analytics"
          className="mx-auto mt-6 w-full max-w-6xl"
        >
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent
          value="live-events"
          className="mx-auto mt-6 w-full max-w-6xl flex-1"
        >
          <LiveEvents />
        </TabsContent>
      </Tabs>
    </div>
  );
}
