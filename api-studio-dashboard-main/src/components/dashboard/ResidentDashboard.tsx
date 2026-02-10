import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { getClaimByEmailOrUserId } from "@/lib/api/residency-requests";
import type { ResidentDashboardDto, MaintenanceStatus, VisitorStatus } from "@/lib/api/types";
import {
  Home,
  Building2,
  Wrench,
  UserCheck,
  Bot,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Loader2,
  User,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ResidentDashboard() {
  const { user } = useAuth();
  const claim = getClaimByEmailOrUserId(user?.email, user?.id);

  const { data, isLoading, error } = useQuery<ResidentDashboardDto>({
    queryKey: ["residentDashboard"],
    queryFn: () => apiClient.get<ResidentDashboardDto>("/dashboard/resident"),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Loading your residence & requests...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 p-6 text-center">
        <CardTitle className="text-destructive text-base font-bold">
          Failed to load resident dashboard
        </CardTitle>
        <CardDescription className="text-xs mt-1">
          {error instanceof Error ? error.message : "Please check your network connection."}
        </CardDescription>
      </Card>
    );
  }

  const {
    residentName,
    apartmentNumber,
    buildingName,
    activeMaintenanceRequests,
    upcomingVisitors,
    unreadNotificationCount,
  } = data;

  const getMaintenanceStatusBadge = (status: MaintenanceStatus) => {
    switch (status) {
      case "Pending":
        return <Badge variant="outline" className="text-amber-600 border-amber-500/40 font-semibold text-[10px]">Pending Triage</Badge>;
      case "Assigned":
        return <Badge variant="secondary" className="font-semibold text-[10px]">Technician Assigned</Badge>;
      case "InProgress":
        return <Badge className="bg-blue-600 text-white font-semibold text-[10px]">Work In Progress</Badge>;
      case "Resolved":
        return <Badge className="bg-emerald-600 text-white font-semibold text-[10px]">Resolved</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  const getVisitorStatusBadge = (status: VisitorStatus) => {
    switch (status) {
      case "Approved":
        return <Badge className="bg-emerald-600 text-white font-semibold text-[10px]">Pass Active</Badge>;
      case "CheckedIn":
        return <Badge className="bg-blue-600 text-white font-semibold text-[10px]">On Site</Badge>;
      case "Pending":
        return <Badge variant="outline" className="text-amber-600 border-amber-500/40 text-[10px]">Pending</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* My Residence Banner */}
      {!apartmentNumber ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                <Clock className="h-6 w-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-bold text-foreground">
                    Welcome, {residentName || user?.fullName || "Resident"}
                  </h1>
                  <Badge variant="outline" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 text-xs font-semibold">
                    {claim && claim.status === "Pending" ? "Residency Under Review" : "Action Needed: Unassigned"}
                  </Badge>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {claim && claim.status === "Pending" ? (
                    <>
                      Verification submitted for <strong className="text-foreground">Unit {claim.apartmentNumber}</strong> in <strong className="text-foreground">{claim.propertyName}</strong>. Property staff will approve your unit shortly.
                    </>
                  ) : (
                    "Your resident profile is active, but not yet linked to an apartment unit. Please declare your residence to enable requests and guest passes."
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/apartment">
                <Button size="sm" className="font-semibold text-xs gap-1.5 shadow-sm">
                  <Home className="h-3.5 w-3.5" />
                  <span>{claim && claim.status === "Pending" ? "View Residence Status" : "Claim Apartment Unit"}</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-gradient-to-r from-card to-card/60 p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
                <Home className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-bold text-foreground">
                    {residentName}
                  </h1>
                  <Badge variant="outline" className="text-xs font-semibold">
                    Resident
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>
                    {buildingName} &bull; Apartment <strong className="text-foreground">{apartmentNumber}</strong>
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/maintenance">
                <Button size="sm" className="font-semibold text-xs gap-1.5 shadow-sm">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Report Issue</span>
                </Button>
              </Link>
              <Link to="/visitors">
                <Button size="sm" variant="outline" className="font-semibold text-xs gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Visitor Pass</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Active Maintenance & Upcoming Visitors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Maintenance Requests */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" />
                  <span>My Maintenance Requests</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Real-time status tracking for your reported issues
                </CardDescription>
              </div>
              <Link to="/maintenance">
                <Button variant="ghost" size="sm" className="text-xs font-semibold gap-1">
                  <span>View All</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent>
            {activeMaintenanceRequests.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-xl border-border bg-muted/10 space-y-2">
                <CheckCircle2 className="h-7 w-7 text-emerald-500 mx-auto" />
                <p className="text-xs font-semibold text-foreground">No active issues</p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  Everything in your unit is operational. Need something fixed?
                </p>
                <Link to="/maintenance" className="inline-block pt-1">
                  <Button size="sm" variant="outline" className="text-xs h-7">
                    Submit Request
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeMaintenanceRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-xl border border-border bg-card/60 hover:bg-accent/40 transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm text-foreground line-clamp-1">
                        {req.title}
                      </h4>
                      {getMaintenanceStatusBadge(req.status)}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-1 border-t border-border/40">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>Tech: {req.assignedStaffName ?? "Pending assignment"}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(req.updatedAt).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Visitors */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <span>Upcoming Visitors</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Pre-registered passes for your guests and deliveries
                </CardDescription>
              </div>
              <Link to="/visitors">
                <Button variant="ghost" size="sm" className="text-xs font-semibold gap-1">
                  <span>View Passes</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent>
            {upcomingVisitors.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-xl border-border bg-muted/10 space-y-2">
                <Calendar className="h-7 w-7 text-muted-foreground mx-auto" />
                <p className="text-xs font-semibold text-foreground">No upcoming visits</p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  Pre-register guests to give them seamless entry at the security desk.
                </p>
                <Link to="/visitors" className="inline-block pt-1">
                  <Button size="sm" variant="outline" className="text-xs h-7">
                    Register a Guest
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingVisitors.map((vis) => (
                  <div
                    key={vis.id}
                    className="p-3.5 rounded-xl border border-border bg-card/60 hover:bg-accent/40 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm text-foreground">
                        {vis.visitorName}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Arrival: {new Date(vis.expectedArrival).toLocaleString()}</span>
                      </div>
                    </div>
                    {getVisitorStatusBadge(vis.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Assistant Quick Prompt Banner */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              SmartProperty AI Resident Copilot
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Describe your maintenance problem or visitor arrival in plain words. Our AI handles the rest.
            </p>
          </div>
        </div>
        <Link to="/assistant">
          <Button size="sm" className="font-semibold text-xs gap-1.5 shadow-sm">
            <span>Ask AI Assistant</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

