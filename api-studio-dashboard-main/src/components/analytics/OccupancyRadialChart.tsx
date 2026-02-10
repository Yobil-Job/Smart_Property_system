import React from "react";
import type { OccupancyAnalyticsDto } from "@/lib/api/types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, Home, CheckCircle2, AlertTriangle, Key } from "lucide-react";

interface OccupancyRadialChartProps {
  data: OccupancyAnalyticsDto | null | undefined;
  isLoading: boolean;
}

export function OccupancyRadialChart({ data, isLoading }: OccupancyRadialChartProps) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse h-48 bg-muted/40" />
        ))}
      </div>
    );
  }

  const statusBreakdown = [
    { name: "Occupied", count: data.occupiedUnits, color: "#10b981" },
    { name: "Vacant / Reserved", count: data.vacantUnits, color: "#3b82f6" },
    { name: "Under Maintenance", count: data.underMaintenanceUnits, color: "#f59e0b" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Overall Occupancy Score Card */}
      <Card className="lg:col-span-5 shadow-xs flex flex-col justify-between">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Home className="h-4 w-4 text-emerald-500" />
              Overall Portfolio Occupancy
            </span>
            <Badge
              variant="outline"
              className={
                data.occupancyPercentage >= 80
                  ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                  : "border-amber-500/30 text-amber-600 bg-amber-500/10"
              }
            >
              {data.occupancyPercentage}% Occupied
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-baseline justify-between pt-2">
            <div>
              <span className="text-4xl font-extrabold tracking-tight">
                {data.occupiedUnits}
              </span>
              <span className="text-sm font-medium text-muted-foreground ml-2">
                / {data.totalUnits} Units Leased
              </span>
            </div>
            <span className="text-sm font-semibold text-emerald-600">
              {data.occupancyPercentage}% Target
            </span>
          </div>

          <Progress value={data.occupancyPercentage} className="h-3 rounded-full" />

          {/* Quick Metrics Breakdown */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
            <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
              <p className="text-[11px] font-medium text-muted-foreground">Occupied</p>
              <p className="text-lg font-bold text-emerald-600 mt-0.5">{data.occupiedUnits}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-center">
              <p className="text-[11px] font-medium text-muted-foreground">Vacant</p>
              <p className="text-lg font-bold text-blue-600 mt-0.5">{data.vacantUnits}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-center">
              <p className="text-[11px] font-medium text-muted-foreground">Maintenance</p>
              <p className="text-lg font-bold text-amber-600 mt-0.5">{data.underMaintenanceUnits}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Distribution Visualizer */}
      <Card className="lg:col-span-7 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Unit Inventory Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusBreakdown}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
              >
                <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {statusBreakdown.map((entry, index) => (
                    <Cell key={`status-cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

