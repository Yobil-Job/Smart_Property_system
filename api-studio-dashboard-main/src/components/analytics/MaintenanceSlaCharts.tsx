import React from "react";
import type { MaintenanceAnalyticsDto } from "@/lib/api/types";
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
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, Clock, CheckCircle2, TrendingUp, AlertCircle } from "lucide-react";

interface MaintenanceSlaChartsProps {
  data: MaintenanceAnalyticsDto | null | undefined;
  isLoading: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  Plumbing: "#3b82f6",     // blue
  Electrical: "#eab308",   // yellow
  HVAC: "#06b6d4",         // cyan
  Cleaning: "#10b981",     // green
  Security: "#8b5cf6",     // purple
  Structural: "#f97316",   // orange
  Other: "#64748b",        // slate
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: "#10b981",
  Medium: "#3b82f6",
  High: "#f59e0b",
  Urgent: "#ef4444",
};

export function MaintenanceSlaCharts({ data, isLoading }: MaintenanceSlaChartsProps) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse h-32 bg-muted/40" />
        ))}
      </div>
    );
  }

  // Format category data for chart
  const categoryData = Object.entries(data.byCategory ?? {}).map(([name, count]) => ({
    name,
    count,
    color: CATEGORY_COLORS[name] || "#64748b",
  }));

  // Format priority data for chart
  const priorityData = Object.entries(data.byPriority ?? {}).map(([priority, count]) => ({
    priority,
    count,
    color: PRIORITY_COLORS[priority] || "#64748b",
  }));

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-xs border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Tickets Reported</p>
              <h3 className="text-2xl font-bold mt-1 tracking-tight">{data.totalRequests}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <Wrench className="h-3 w-3 text-primary" /> Across all buildings
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Average Resolution Time</p>
              <h3 className="text-2xl font-bold mt-1 tracking-tight">
                {data.averageResolutionHours}{" "}
                <span className="text-sm font-normal text-muted-foreground">hours</span>
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-500" /> Triage to completion
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Resolution Rate</p>
              <h3 className="text-2xl font-bold mt-1 tracking-tight">
                {data.resolutionRatePercentage}%
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Completed on SLA
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Breakdown (Donut Chart) */}
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Work Order Volume by Category</span>
              <Badge variant="outline" className="text-xs font-normal">
                {categoryData.length} categories
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm">
                <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
                No ticket data recorded for this period
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(val) => <span className="text-xs text-foreground">{val}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Priority Breakdown (Bar Chart) */}
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Ticket Distribution by Priority</span>
              <Badge variant="outline" className="text-xs font-normal">
                Severity Level
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {priorityData.every((p) => p.count === 0) ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm">
                <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
                No priority metrics available
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <XAxis
                      dataKey="priority"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {priorityData.map((entry, index) => (
                        <Cell key={`priority-cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

