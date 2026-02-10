import React, { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient, getMediaUrl } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import type { MaintenanceRequestDetailDto, MaintenanceStatus } from "@/lib/api/types";
import { StatusBadge } from "@/components/maintenance/StatusBadge";
import { PriorityBadge } from "@/components/maintenance/PriorityBadge";
import { StatusChangeDialog } from "@/components/maintenance/StatusChangeDialog";
import { AssignStaffDialog } from "@/components/maintenance/AssignStaffDialog";
import { WorkLogThread } from "@/components/maintenance/WorkLogThread";
import { HistoryTimeline } from "@/components/maintenance/HistoryTimeline";
import {
  Wrench,
  ArrowLeft,
  Calendar,
  Building,
  Home,
  User,
  UserCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ImageIcon,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_auth/maintenance/$id")({
  component: TicketDetailPage,
});

const WORKFLOW_STEPS: MaintenanceStatus[] = [
  "Pending",
  "Assigned",
  "InProgress",
  "Resolved",
  "Closed",
];

function TicketDetailPage() {
  const { id } = useParams({ from: "/_auth/maintenance/$id" });
  const { user, role } = useAuth();

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<MaintenanceStatus>("InProgress");

  const { data: ticket, isLoading, error } = useQuery<MaintenanceRequestDetailDto>({
    queryKey: ["ticket", id],
    queryFn: () => apiClient.get<MaintenanceRequestDetailDto>(`/maintenance/${id}`),
  });

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Loading maintenance ticket details...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
        <p className="font-bold text-destructive text-sm">Failed to load ticket</p>
        <p className="text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "The requested maintenance ticket could not be found."}
        </p>
        <Link to="/maintenance">
          <Button variant="outline" size="sm" className="text-xs gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Maintenance Queue</span>
          </Button>
        </Link>
      </Card>
    );
  }

  const isStaffOrAdmin = role === "Staff" || role === "Administrator";
  const currentStepIdx = WORKFLOW_STEPS.indexOf(ticket.status);

  const openStatusChange = (st: MaintenanceStatus) => {
    setTargetStatus(st);
    setStatusDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
        <Link to="/maintenance" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Maintenance Queue</span>
        </Link>
        <span>/</span>
        <span className="font-mono text-foreground font-bold">
          {ticket.ticketNumber || `REQ-${ticket.id?.slice(0, 8).toUpperCase()}`}
        </span>
      </div>

      {/* Ticket Header Banner */}
      <div className="rounded-2xl border border-border bg-gradient-to-r from-card to-card/60 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-sm md:text-base font-extrabold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">
                {ticket.ticketNumber || `REQ-${ticket.id?.slice(0, 8).toUpperCase()}`}
              </span>
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
              <Badge variant="outline" className="text-xs font-semibold">
                {ticket.category}
              </Badge>
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-foreground">
              {ticket.title}
            </h1>

            <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-3 pt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>Created: {new Date(ticket.createdAt).toLocaleString()}</span>
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Home className="h-3.5 w-3.5 text-primary" />
                <span>
                  {ticket.buildingName} &bull; Unit {ticket.apartmentNumber}
                </span>
              </span>
            </p>
          </div>

          {/* Role-Governed Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {isStaffOrAdmin && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5 h-9"
                  onClick={() => setIsAssignOpen(true)}
                  disabled={ticket.status === "Closed" || ticket.status === "Rejected"}
                >
                  <UserCheck className="h-3.5 w-3.5 text-primary" />
                  <span>{ticket.assignedStaffId ? "Reassign Tech" : "Assign Tech"}</span>
                </Button>

                {(ticket.status === "Pending" || ticket.status === "Assigned") && (
                  <Button
                    size="sm"
                    className="text-xs gap-1.5 h-9"
                    onClick={() => openStatusChange("InProgress")}
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    <span>Start Work</span>
                  </Button>
                )}

                {ticket.status === "InProgress" && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-9 shadow-sm"
                    onClick={() => openStatusChange("Resolved")}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Mark Resolved</span>
                  </Button>
                )}

                {ticket.status !== "Closed" && ticket.status !== "Rejected" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-destructive hover:text-destructive h-9"
                    onClick={() => openStatusChange("Rejected")}
                  >
                    Reject
                  </Button>
                )}
              </>
            )}

            {role === "Resident" && ticket.status === "Resolved" && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-9"
                onClick={() => openStatusChange("Closed")}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Confirm Resolution & Close</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Visual Workflow Stepper */}
      {ticket.status !== "Rejected" && (
        <Card className="border-border p-4 bg-card/60">
          <div className="flex items-center justify-between text-xs">
            {WORKFLOW_STEPS.map((step, idx) => {
              const isPast = currentStepIdx > idx;
              const isCurrent = currentStepIdx === idx;
              return (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                        isPast
                          ? "bg-emerald-600 text-white"
                          : isCurrent
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[11px] font-semibold ${
                        isCurrent
                          ? "text-primary font-bold"
                          : isPast
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-[2px] mx-2 transition-colors ${
                        isPast ? "bg-emerald-600" : "bg-border"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </Card>
      )}

      {/* Content Grid: Left Main Details, Right Feed & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Description, Photos, Personnel */}
        <div className="lg:col-span-7 space-y-6">
          {/* Issue Description Card */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Issue Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </p>

              {/* Photo Preview if attached */}
              {ticket.imageUrl && (
                <div className="pt-2 border-t border-border/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>Resident Photo Attachment</span>
                  </div>
                  <div className="rounded-xl border border-border overflow-hidden bg-muted/20 max-w-md">
                    <img
                      src={getMediaUrl(ticket.imageUrl) || ticket.imageUrl}
                      alt="Issue photo"
                      className="w-full h-auto max-h-72 object-cover"
                      onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unit & Stakeholder Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                  Resident & Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">{ticket.residentName}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Home className="h-4 w-4 text-primary" />
                  <span>
                    Unit {ticket.apartmentNumber} &bull; {ticket.buildingName}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                  Assigned Technician
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {ticket.assignedStaffName ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-emerald-500" />
                      <div>
                        <p className="font-semibold text-foreground">
                          {ticket.assignedStaffName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Operational Staff</p>
                      </div>
                    </div>
                    {isStaffOrAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setIsAssignOpen(true)}
                      >
                        Reassign
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground italic">No technician assigned</span>
                    {isStaffOrAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setIsAssignOpen(true)}
                      >
                        Assign
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column (5 cols): Notes & Timeline */}
        <div className="lg:col-span-5 space-y-6">
          <WorkLogThread ticketId={ticket.id} notes={ticket.notes} />
          <HistoryTimeline history={ticket.history} />
        </div>
      </div>

      {/* Assign Modal */}
      <AssignStaffDialog
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        ticketId={ticket.id}
        ticketNumber={ticket.ticketNumber}
        currentStaffId={ticket.assignedStaffId}
      />

      {/* Status Change Dialog */}
      <StatusChangeDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        ticketId={ticket.id}
        ticketNumber={ticket.ticketNumber}
        targetStatus={targetStatus}
        currentStatus={ticket.status}
      />
    </div>
  );
}

