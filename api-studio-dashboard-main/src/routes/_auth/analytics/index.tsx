import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  MaintenanceAnalyticsDto,
  VisitorAnalyticsDto,
  OccupancyAnalyticsDto,
} from "@/lib/api/types";
import { DateRangeFilter, type DateRangePreset } from "@/components/analytics/DateRangeFilter";
import { MaintenanceSlaCharts } from "@/components/analytics/MaintenanceSlaCharts";
import { VisitorTrafficChart } from "@/components/analytics/VisitorTrafficChart";
import { OccupancyRadialChart } from "@/components/analytics/OccupancyRadialChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart3, Wrench, Users, Home, RefreshCw, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_auth/analytics/")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [selectedRange, setSelectedRange] = useState<DateRangePreset>("30d");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");

  const queryParams = {
    range: selectedRange,
    propertyId: selectedPropertyId !== "all" ? selectedPropertyId : undefined,
  };

  // 1. Maintenance Analytics
  const {
    data: maintenanceData,
    isLoading: maintenanceLoading,
    refetch: refetchMaintenance,
    isRefetching: isRefetchingMaintenance,
  } = useQuery({
    queryKey: ["analytics", "maintenance", selectedRange, selectedPropertyId],
    queryFn: () =>
      apiClient.get<MaintenanceAnalyticsDto>("/api/v1/analytics/maintenance", queryParams),
  });

  // 2. Visitor Analytics
  const {
    data: visitorData,
    isLoading: visitorLoading,
    refetch: refetchVisitors,
    isRefetching: isRefetchingVisitors,
  } = useQuery({
    queryKey: ["analytics", "visitors", selectedRange, selectedPropertyId],
    queryFn: () =>
      apiClient.get<VisitorAnalyticsDto>("/api/v1/analytics/visitors", queryParams),
  });

  // 3. Occupancy Analytics
  const {
    data: occupancyData,
    isLoading: occupancyLoading,
    refetch: refetchOccupancy,
    isRefetching: isRefetchingOccupancy,
  } = useQuery({
    queryKey: ["analytics", "occupancy", selectedPropertyId],
    queryFn: () =>
      apiClient.get<OccupancyAnalyticsDto>(
        "/api/v1/analytics/occupancy",
        selectedPropertyId !== "all" ? { propertyId: selectedPropertyId } : undefined
      ),
  });

  const isRefreshing = isRefetchingMaintenance || isRefetchingVisitors || isRefetchingOccupancy;

  const handleRefreshAll = () => {
    refetchMaintenance();
    refetchVisitors();
    refetchOccupancy();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Operational Analytics & SLA Insights
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time performance indicators, visitor traffic patterns, and occupancy rates.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAll}
          disabled={isRefreshing}
          className="h-9 gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Refresh Metrics</span>
        </Button>
      </div>

      {/* Global Date & Scope Filter Bar */}
      <DateRangeFilter
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
        selectedPropertyId={selectedPropertyId}
        onPropertyChange={setSelectedPropertyId}
      />

      {/* Analytics Tabs View */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Comprehensive View
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-1.5 text-xs sm:text-sm">
            <Wrench className="h-3.5 w-3.5" />
            Maintenance SLA
          </TabsTrigger>
          <TabsTrigger value="visitors" className="gap-1.5 text-xs sm:text-sm">
            <Users className="h-3.5 w-3.5" />
            Visitor Throughput
          </TabsTrigger>
          <TabsTrigger value="occupancy" className="gap-1.5 text-xs sm:text-sm">
            <Home className="h-3.5 w-3.5" />
            Unit Occupancy
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Comprehensive View */}
        <TabsContent value="all" className="space-y-8 animate-in fade-in-50 duration-200">
          <section className="space-y-3">
            <div className="border-b pb-2">
              <h2 className="text-base font-semibold">Maintenance & Ticketing SLA</h2>
              <p className="text-xs text-muted-foreground">Response and turnaround benchmarks</p>
            </div>
            <MaintenanceSlaCharts data={maintenanceData} isLoading={maintenanceLoading} />
          </section>

          <section className="space-y-3">
            <div className="border-b pb-2">
              <h2 className="text-base font-semibold">Visitor & Physical Access Patterns</h2>
              <p className="text-xs text-muted-foreground">Throughput and security checkpoint analysis</p>
            </div>
            <VisitorTrafficChart data={visitorData} isLoading={visitorLoading} />
          </section>

          <section className="space-y-3">
            <div className="border-b pb-2">
              <h2 className="text-base font-semibold">Portfolio Occupancy Status</h2>
              <p className="text-xs text-muted-foreground">Leasing distribution and vacancy status</p>
            </div>
            <OccupancyRadialChart data={occupancyData} isLoading={occupancyLoading} />
          </section>
        </TabsContent>

        {/* Tab 2: Maintenance SLA */}
        <TabsContent value="maintenance" className="space-y-4 animate-in fade-in-50 duration-200">
          <MaintenanceSlaCharts data={maintenanceData} isLoading={maintenanceLoading} />
        </TabsContent>

        {/* Tab 3: Visitors */}
        <TabsContent value="visitors" className="space-y-4 animate-in fade-in-50 duration-200">
          <VisitorTrafficChart data={visitorData} isLoading={visitorLoading} />
        </TabsContent>

        {/* Tab 4: Occupancy */}
        <TabsContent value="occupancy" className="space-y-4 animate-in fade-in-50 duration-200">
          <OccupancyRadialChart data={occupancyData} isLoading={occupancyLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

