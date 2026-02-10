import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { apiClient } from "@/lib/api/client";
import type { AdminDashboardDto } from "@/lib/api/types";
import { StatCard } from "./StatCard";
import {
  Building2,
  Building,
  Home,
  Users2,
  UserCheck,
  AlertTriangle,
  Clock,
  Wrench,
  BarChart3,
  ArrowRight,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AdminDashboard() {
  const { data, isLoading, error } = useQuery<AdminDashboardDto>({
    queryKey: ["adminDashboard"],
    queryFn: () => apiClient.get<AdminDashboardDto>("/dashboard/admin"),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Aggregating property operations & metrics...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 p-6 text-center">
        <CardTitle className="text-destructive text-base font-bold">
          Failed to load administrator dashboard
        </CardTitle>
        <CardDescription className="text-xs mt-1">
          {error instanceof Error ? error.message : "Please check backend connection."}
        </CardDescription>
      </Card>
    );
  }

  const {
    totalProperties,
    totalBuildings,
    totalApartments,
    overallOccupancyRate,
    maintenanceSummary,
    activeVisitorsOnSite,
    staffOnDutyCount,
  } = data;

  return (
    <div className="space-y-6">
      {/* Urgent Maintenance Alert Banner if any unassigned urgent tickets exist */}
      {maintenanceSummary.urgentUnassigned > 0 && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-950 dark:text-rose-200">
                {maintenanceSummary.urgentUnassigned} Urgent Ticket
                {maintenanceSummary.urgentUnassigned > 1 ? "s" : ""} Awaiting Immediate Assignment
              </h3>
              <p className="text-xs text-rose-800/80 dark:text-rose-300/80 mt-0.5">
                High-priority resident issues require operational dispatch.
              </p>
            </div>
          </div>
          <Link to="/maintenance">
            <Button
              size="sm"
              variant="destructive"
              className="font-semibold text-xs gap-1.5 shadow-sm"
            >
              <span>Dispatch Now</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Properties Managed"
          value={totalProperties}
          subtitle={`${totalBuildings} buildings total`}
          icon={Building2}
          badgeText="Active"
          badgeVariant="outline"
        />

        <StatCard
          title="Total Units"
          value={totalApartments}
          subtitle={`Occupancy: ${overallOccupancyRate}%`}
          icon={Home}
          trend={{
            direction: overallOccupancyRate >= 80 ? "up" : "neutral",
            text: `${overallOccupancyRate}% Occupied`,
          }}
        />

        <StatCard
          title="Visitors On Site"
          value={activeVisitorsOnSite}
          subtitle="Currently checked in"
          icon={UserCheck}
          badgeText="Live"
          badgeVariant="default"
        />

        <StatCard
          title="Staff On Duty"
          value={staffOnDutyCount}
          subtitle="Active operational personnel"
          icon={Users2}
        />
      </div>

      {/* Operational Overview: Occupancy Progress & Maintenance Triage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unit Occupancy Radial / Progress */}
        <Card className="lg:col-span-1 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Unit Occupancy</span>
              <Badge variant="secondary" className="font-semibold text-xs">
                {overallOccupancyRate}%
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Portfolio residential and commercial utilization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Occupied Units</span>
                <span className="font-semibold text-foreground">
                  {Math.round((overallOccupancyRate / 100) * totalApartments)} / {totalApartments}
                </span>
              </div>
              <Progress value={overallOccupancyRate} className="h-2.5" />
            </div>

            <div className="pt-2 grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-muted-foreground">Vacant Units</p>
                <p className="text-lg font-bold text-foreground mt-0.5">
                  {totalApartments - Math.round((overallOccupancyRate / 100) * totalApartments)}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/20">
                <p className="text-muted-foreground">Buildings</p>
                <p className="text-lg font-bold text-foreground mt-0.5">{totalBuildings}</p>
              </div>
            </div>

            <Link to="/properties" className="block pt-2">
              <Button variant="outline" size="sm" className="w-full text-xs font-semibold gap-1.5">
                <span>View All Properties</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Maintenance Triage Summary */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Maintenance Triage Center</CardTitle>
                <CardDescription className="text-xs">
                  Active issue distribution and assignment pipeline
                </CardDescription>
              </div>
              <Link to="/maintenance">
                <Button variant="ghost" size="sm" className="text-xs font-semibold gap-1">
                  <span>Open Queue</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                    Pending Triage
                  </span>
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-950 dark:text-amber-100">
                  {maintenanceSummary.pendingTriage}
                </div>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                  New resident submissions
                </p>
              </div>

              <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                    In Progress
                  </span>
                  <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-2xl font-black text-blue-950 dark:text-blue-100">
                  {maintenanceSummary.assignedInProgress}
                </div>
                <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80">
                  Assigned to staff technicians
                </p>
              </div>

              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wider">
                    Urgent Unassigned
                  </span>
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="text-2xl font-black text-rose-950 dark:text-rose-100">
                  {maintenanceSummary.urgentUnassigned}
                </div>
                <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80">
                  Critical SLA issues
                </p>
              </div>
            </div>

            {/* Quick Action Link Row */}
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Link to="/properties">
                <Button variant="secondary" size="sm" className="w-full text-xs font-medium">
                  Add Property
                </Button>
              </Link>
              <Link to="/maintenance">
                <Button variant="secondary" size="sm" className="w-full text-xs font-medium">
                  Review Tickets
                </Button>
              </Link>
              <Link to="/visitors">
                <Button variant="secondary" size="sm" className="w-full text-xs font-medium">
                  Visitor Desk
                </Button>
              </Link>
              <Link to="/analytics">
                <Button variant="secondary" size="sm" className="w-full text-xs font-medium gap-1">
                  <BarChart3 className="h-3 w-3" />
                  <span>Analytics</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

