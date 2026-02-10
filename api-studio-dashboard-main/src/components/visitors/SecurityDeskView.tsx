import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { VisitorDetailDto, PagedResult, VisitorStatus } from "@/lib/api/types";
import { VisitorStatusBadge } from "./VisitorStatusBadge";
import {
  Shield,
  Search,
  UserCheck,
  LogOut,
  Check,
  X,
  Phone,
  Home,
  Clock,
  Calendar,
  Loader2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function SecurityDeskView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"All" | "Today" | "OnSite" | "Pending">("All");

  const { data, isLoading } = useQuery<PagedResult<VisitorDetailDto>>({
    queryKey: ["visitors", search],
    queryFn: () =>
      apiClient.get<PagedResult<VisitorDetailDto>>("/visitors", {
        search: search.trim() || undefined,
        pageSize: 100,
      }),
  });

  const checkInMutation = useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/visitors/${id}/check-in`),
    onSuccess: (_, id) => {
      toast.success("Visitor checked in successfully");
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["staffDashboard"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Check-in failed"),
  });

  const checkOutMutation = useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/visitors/${id}/check-out`),
    onSuccess: () => {
      toast.success("Visitor checked out successfully");
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["staffDashboard"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Check-out failed"),
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/visitors/${id}/approve`),
    onSuccess: () => {
      toast.success("Visitor pass approved");
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Approval failed"),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/visitors/${id}/reject`),
    onSuccess: () => {
      toast.success("Visitor pass rejected");
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Rejection failed"),
  });

  const allVisitors = data?.items ?? [];
  const todayStr = new Date().toDateString();

  const onSiteCount = allVisitors.filter((v) => v.status === "CheckedIn").length;
  const expectedTodayCount = allVisitors.filter(
    (v) => new Date(v.expectedArrival).toDateString() === todayStr
  ).length;

  const filteredVisitors = allVisitors.filter((v) => {
    if (filterType === "OnSite") return v.status === "CheckedIn";
    if (filterType === "Pending") return v.status === "Pending";
    if (filterType === "Today") return new Date(v.expectedArrival).toDateString() === todayStr;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Security Terminal Metric Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border bg-card/70">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">
                Currently On Site
              </p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {onSiteCount}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <UserCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/70">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">
                Expected Today
              </p>
              <p className="text-2xl font-black text-foreground mt-1">
                {expectedTodayCount}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/70">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">
                Security Desk Mode
              </p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                Live Verification
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fast Search & Filter Toolbar */}
      <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Instant phone lookup, guest name, unit #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                { label: "All Passes", val: "All" },
                { label: `On Site (${onSiteCount})`, val: "OnSite" },
                { label: "Expected Today", val: "Today" },
                { label: "Pending", val: "Pending" },
              ] as const
            ).map((t) => (
              <Button
                key={t.val}
                variant={filterType === t.val ? "secondary" : "ghost"}
                size="sm"
                className="h-8 text-xs font-semibold px-2.5 shrink-0"
                onClick={() => setFilterType(t.val)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Visitors Action List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading front desk queue...</p>
        </div>
      ) : filteredVisitors.length === 0 ? (
        <div className="py-20 text-center border border-dashed rounded-xl border-border bg-card/40 p-6 space-y-2">
          <Users className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold text-foreground">No visitors found</p>
          <p className="text-xs text-muted-foreground">
            {search ? `No guests match "${search}".` : "No visits scheduled under this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVisitors.map((vis) => (
            <div
              key={vis.id}
              className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                vis.status === "CheckedIn"
                  ? "border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10 shadow-xs"
                  : "border-border bg-card/70 hover:bg-accent/40"
              }`}
            >
              {/* Left Identity Details */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-bold text-sm text-foreground">{vis.visitorName}</h4>
                  <VisitorStatusBadge status={vis.status} />
                  <Badge variant="outline" className="text-[10px] py-0">
                    {vis.purpose}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Phone className="h-3 w-3 text-primary" />
                    <span>{vis.visitorPhone}</span>
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Home className="h-3.5 w-3.5 text-primary" />
                    <span>Apt {vis.apartmentNumber} ({vis.residentName})</span>
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {new Date(vis.expectedArrival).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      &ndash;{" "}
                      {new Date(vis.expectedDeparture).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                </div>
              </div>

              {/* Right Fast Desk Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Check In Action */}
                {(vis.status === "Approved" || vis.status === "Pending") && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8 gap-1 shadow-xs"
                    disabled={checkInMutation.isPending}
                    onClick={() => checkInMutation.mutate(vis.id)}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Check In</span>
                  </Button>
                )}

                {/* Check Out Action */}
                {vis.status === "CheckedIn" && (
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-8 gap-1 shadow-xs"
                    disabled={checkOutMutation.isPending}
                    onClick={() => checkOutMutation.mutate(vis.id)}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Check Out</span>
                  </Button>
                )}

                {/* Approval Actions for Pending */}
                {vis.status === "Pending" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(vis.id)}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                      disabled={rejectMutation.isPending}
                      onClick={() => rejectMutation.mutate(vis.id)}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

