import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { apiClient } from "@/lib/api/client";
import type { StaffDashboardDto, Priority, MaintenanceStatus } from "@/lib/api/types";
import { StatCard } from "./StatCard";
import {
  Wrench,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Loader2,
  Building,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function StaffDashboard() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<StaffDashboardDto>({
    queryKey: ["staffDashboard"],
    queryFn: () => apiClient.get<StaffDashboardDto>("/dashboard/staff"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, newStatus }: { ticketId: string; newStatus: MaintenanceStatus }) => {
      return apiClient.patch(`/maintenance/${ticketId}/status`, {
        newStatus,
        reason: `Status updated to ${newStatus} from staff dashboard`,
      });
    },
    onSuccess: (_, variables) => {
      toast.success(`Task status updated to ${variables.newStatus}`);
      queryClient.invalidateQueries({ queryKey: ["staffDashboard"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update task status");
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Loading assigned work orders and schedule...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 p-6 text-center">
        <CardTitle className="text-destructive text-base font-bold">
          Failed to load staff dashboard
        </CardTitle>
        <CardDescription className="text-xs mt-1">
          {error instanceof Error ? error.message : "Please check backend connection."}
        </CardDescription>
      </Card>
    );
  }

  const { assignedTasksCount, urgentTasksCount, todaysExpectedVisitorsCount, tasks } = data;

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case "Urgent":
        return <Badge variant="destructive" className="font-bold text-[10px] animate-pulse">Urgent</Badge>;
      case "High":
        return <Badge className="bg-amber-600 text-white font-semibold text-[10px]">High</Badge>;
      case "Medium":
        return <Badge variant="secondary" className="font-semibold text-[10px]">Medium</Badge>;
      default:
        return <Badge variant="outline" className="font-medium text-[10px]">Low</Badge>;
    }
  };

  const getStatusBadge = (status: MaintenanceStatus) => {
    switch (status) {
      case "InProgress":
        return <Badge className="bg-blue-600 text-white font-semibold text-[10px]">In Progress</Badge>;
      case "Assigned":
        return <Badge variant="secondary" className="font-semibold text-[10px]">Assigned</Badge>;
      case "Resolved":
        return <Badge className="bg-emerald-600 text-white font-semibold text-[10px]">Resolved</Badge>;
      default:
        return <Badge variant="outline" className="font-medium text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Daily Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Assigned Tasks"
          value={assignedTasksCount}
          subtitle="Active work orders in your queue"
          icon={Wrench}
          badgeText="Work Queue"
          badgeVariant="default"
        />

        <StatCard
          title="Urgent Priority Tasks"
          value={urgentTasksCount}
          subtitle="Requires immediate attention"
          icon={AlertTriangle}
          badgeText={urgentTasksCount > 0 ? "Action Required" : "All Clear"}
          badgeVariant={urgentTasksCount > 0 ? "destructive" : "outline"}
        />

        <StatCard
          title="Today's Expected Visitors"
          value={todaysExpectedVisitorsCount}
          subtitle="Front desk check-in schedule"
          icon={UserCheck}
        />
      </div>

      {/* Assigned Tasks Work Orders */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <span>My Assigned Maintenance Tasks</span>
                <Badge variant="outline" className="text-xs font-semibold">
                  {tasks.length} active
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Review and update progress on your operational work orders
              </CardDescription>
            </div>
            <Link to="/maintenance">
              <Button variant="ghost" size="sm" className="text-xs font-semibold gap-1">
                <span>View Full Queue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl border-border bg-muted/10 space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-foreground">You have no active tasks!</p>
              <p className="text-xs text-muted-foreground">
                All assigned work orders are resolved or the queue is clear.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 hover:bg-accent/40 transition-colors"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {task.ticketNumber}
                      </span>
                      {getPriorityBadge(task.priority)}
                      {getStatusBadge(task.status)}
                    </div>

                    <h4 className="font-semibold text-sm text-foreground truncate">
                      {task.title}
                    </h4>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>
                        {task.buildingName} &bull; Unit {task.apartmentNumber}
                      </span>
                    </div>
                  </div>

                  {/* Inline Action Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    {task.status === "Assigned" && (
                      <Button
                        size="sm"
                        variant="default"
                        className="text-xs font-medium h-8"
                        disabled={updateStatusMutation.isPending}
                        onClick={() =>
                          updateStatusMutation.mutate({
                            ticketId: task.id,
                            newStatus: "InProgress",
                          })
                        }
                      >
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        Start Work
                      </Button>
                    )}

                    {task.status === "InProgress" && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium h-8"
                        disabled={updateStatusMutation.isPending}
                        onClick={() =>
                          updateStatusMutation.mutate({
                            ticketId: task.id,
                            newStatus: "Resolved",
                          })
                        }
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Mark Resolved
                      </Button>
                    )}

                    <Link to="/maintenance">
                      <Button variant="outline" size="sm" className="text-xs h-8">
                        Details
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Staff Fast Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link to="/visitors">
          <Button variant="secondary" className="w-full h-11 justify-start gap-2 text-xs font-semibold">
            <UserCheck className="h-4 w-4 text-primary" />
            <span>Open Security Check-In Desk</span>
          </Button>
        </Link>
        <Link to="/maintenance">
          <Button variant="secondary" className="w-full h-11 justify-start gap-2 text-xs font-semibold">
            <Wrench className="h-4 w-4 text-primary" />
            <span>Browse All Maintenance Tickets</span>
          </Button>
        </Link>
        <Link to="/assistant">
          <Button variant="secondary" className="w-full h-11 justify-start gap-2 text-xs font-semibold">
            <Clock className="h-4 w-4 text-primary" />
            <span>Ask AI Operations Copilot</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

