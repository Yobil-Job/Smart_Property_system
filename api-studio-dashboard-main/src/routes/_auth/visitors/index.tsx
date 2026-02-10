import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import type { VisitorDetailDto, PagedResult } from "@/lib/api/types";
import { VisitorStatusBadge } from "@/components/visitors/VisitorStatusBadge";
import { DigitalPassCard } from "@/components/visitors/DigitalPassCard";
import { CreateVisitorModal } from "@/components/visitors/CreateVisitorModal";
import { SecurityDeskView } from "@/components/visitors/SecurityDeskView";
import { VisitorTable } from "@/components/visitors/VisitorTable";
import {
  UserCheck,
  Plus,
  Shield,
  History,
  QrCode,
  Loader2,
  Calendar,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_auth/visitors/")({
  component: VisitorsPage,
});

function VisitorsPage() {
  const { role } = useAuth();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const isStaffOrAdmin = role === "Staff" || role === "Administrator";
  const endpoint = isStaffOrAdmin ? "/visitors" : "/visitors/my-visitors";

  const { data, isLoading } = useQuery<PagedResult<VisitorDetailDto>>({
    queryKey: ["visitors", role],
    queryFn: () => apiClient.get<PagedResult<VisitorDetailDto>>(endpoint, { pageSize: 100 }),
  });

  const visitors = data?.items ?? [];

  // For residents: split into active passes vs past history
  const activePasses = visitors.filter((v) =>
    ["Pending", "Approved", "CheckedIn"].includes(v.status)
  );
  const pastPasses = visitors.filter((v) =>
    ["CheckedOut", "Rejected"].includes(v.status)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            <span>
              {isStaffOrAdmin ? "Visitor Control & Security Desk" : "My Visitor Passes"}
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {isStaffOrAdmin
              ? "Reception terminal for verifying guest passes and recording on-site arrivals"
              : "Pre-register incoming guests and generate shareable digital entry passes"}
          </p>
        </div>

        <Button
          onClick={() => setIsRegisterOpen(true)}
          size="sm"
          className="font-semibold text-xs gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Pre-Register Visitor</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading visitor passes...</p>
        </div>
      ) : isStaffOrAdmin ? (
        /* Staff / Admin Tabbed Terminal */
        <Tabs defaultValue="terminal" className="space-y-4">
          <TabsList className="bg-card border border-border h-9">
            <TabsTrigger value="terminal" className="text-xs font-semibold gap-1.5">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span>Security Terminal (Check-In Desk)</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs font-semibold gap-1.5">
              <History className="h-3.5 w-3.5" />
              <span>Full Access Logs ({visitors.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="terminal" className="space-y-4">
            <SecurityDeskView />
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <VisitorTable visitors={visitors} />
          </TabsContent>
        </Tabs>
      ) : (
        /* Resident Self-Service View */
        <div className="space-y-8">
          {/* Active Passes Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-primary" />
                <span>Active & Upcoming Passes ({activePasses.length})</span>
              </h2>
            </div>

            {activePasses.length === 0 ? (
              <div className="py-16 text-center border border-dashed rounded-2xl border-border bg-card/40 p-6 space-y-2">
                <UserCheck className="h-8 w-8 text-muted-foreground mx-auto" />
                <h3 className="font-semibold text-sm text-foreground">No active visitor passes</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Pre-register your upcoming guests so they can enter smoothly at the reception desk.
                </p>
                <Button
                  onClick={() => setIsRegisterOpen(true)}
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Register a Guest</span>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activePasses.map((vis) => (
                  <DigitalPassCard key={vis.id} visitor={vis} />
                ))}
              </div>
            )}
          </div>

          {/* Past History Archive */}
          {pastPasses.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <History className="h-4 w-4 text-primary" />
                <span>Completed Visits Archive ({pastPasses.length})</span>
              </h2>
              <VisitorTable visitors={pastPasses} />
            </div>
          )}
        </div>
      )}

      {/* Pre-Register Guest Modal */}
      <CreateVisitorModal
        open={isRegisterOpen}
        onOpenChange={setIsRegisterOpen}
      />
    </div>
  );
}

