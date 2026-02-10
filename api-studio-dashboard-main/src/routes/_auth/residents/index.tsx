import React, { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  ResidentDetailDto,
  UserSummaryDto,
  PagedResult,
} from "@/lib/api/types";
import { AssignResidentDialog } from "@/components/residents/AssignResidentDialog";
import {
  getResidencyClaims,
  getClaimByEmailOrUserId,
  ResidencyClaim,
} from "@/lib/api/residency-requests";
import {
  Users,
  UserPlus,
  Search,
  Building,
  Home,
  Phone,
  Mail,
  Calendar,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_auth/residents/")({
  component: ResidentsPage,
});

function ResidentsPage() {
  const [activeTab, setActiveTab] = useState<"active" | "onboarding">("active");
  const [search, setSearch] = useState("");
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  // Pre-fill target for assignment dialog
  const [assignTarget, setAssignTarget] = useState<{
    userId?: string;
    propertyId?: string;
    buildingId?: string;
    apartmentId?: string;
    moveInDate?: string;
    emergencyContact?: string;
  }>({});

  // 1. Fetch active assigned residents
  const { data: residentsData, isLoading: isLoadingResidents } = useQuery<PagedResult<ResidentDetailDto>>({
    queryKey: ["residents", search],
    queryFn: () =>
      apiClient.get<PagedResult<ResidentDetailDto>>("/residents", {
        search: search.trim() || undefined,
        pageSize: 100,
      }),
  });

  // 2. Fetch all registered resident user accounts to detect unassigned signups
  const { data: usersData, isLoading: isLoadingUsers } = useQuery<PagedResult<UserSummaryDto>>({
    queryKey: ["residentUsersDirectory"],
    queryFn: () =>
      apiClient.get<PagedResult<UserSummaryDto>>("/users", {
        role: "Resident",
        pageSize: 100,
      }),
  });

  const activeResidents = residentsData?.items ?? [];
  const allResidentAccounts = usersData?.items ?? [];

  // Set of userIds who already possess an active apartment assignment
  const assignedUserIdSet = useMemo(() => {
    return new Set(activeResidents.map((r) => r.userId).filter(Boolean));
  }, [activeResidents]);

  // Unassigned residents waiting for staff assignment
  const unassignedResidents = useMemo(() => {
    return allResidentAccounts
      .filter((u) => !assignedUserIdSet.has(u.id))
      .filter((u) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
        );
      });
  }, [allResidentAccounts, assignedUserIdSet, search]);

  const handleOpenAssignWithTarget = (
    userId?: string,
    claim?: ResidencyClaim
  ) => {
    setAssignTarget({
      userId: userId || claim?.userId,
      propertyId: claim?.propertyId,
      buildingId: claim?.buildingId,
      apartmentId: claim?.apartmentId,
      moveInDate: claim?.moveInDate,
      emergencyContact: claim?.emergencyContact,
    });
    setIsAssignOpen(true);
  };

  const handleOpenGeneralAssign = () => {
    setAssignTarget({});
    setIsAssignOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <span>Resident Directory & Onboarding</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Review occupancy, inspect tenant lease assignments, and verify incoming resident applications
          </p>
        </div>

        <Button
          onClick={handleOpenGeneralAssign}
          size="sm"
          className="font-semibold text-xs gap-1.5 shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          <span>Assign Resident to Unit</span>
        </Button>
      </div>

      {/* Tabs & Search Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "active" | "onboarding")}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-xl border border-border bg-card/60">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="active" className="text-xs gap-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Active Occupants</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold">
                {activeResidents.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger value="onboarding" className="text-xs gap-2">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>Pending Onboarding</span>
              {unassignedResidents.length > 0 && (
                <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 font-bold">
                  {unassignedResidents.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or unit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>
        </div>

        {/* TAB 1: ACTIVE OCCUPANTS */}
        <TabsContent value="active" className="m-0 space-y-4">
          {isLoadingResidents ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading active residents...</p>
            </div>
          ) : activeResidents.length === 0 ? (
            <div className="py-20 text-center border border-dashed rounded-2xl border-border bg-card/40 p-6 space-y-3">
              <Users className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="font-semibold text-base text-foreground">No active residents found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {search
                  ? `No residents matching "${search}".`
                  : "No residents have been assigned to units yet."}
              </p>
              <Button
                onClick={handleOpenGeneralAssign}
                size="sm"
                variant="outline"
                className="text-xs gap-1.5"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Assign First Resident</span>
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Resident Name</TableHead>
                    <TableHead className="text-xs">Apartment Location</TableHead>
                    <TableHead className="text-xs">Move-in Date</TableHead>
                    <TableHead className="text-xs">Emergency Contact</TableHead>
                    <TableHead className="text-xs text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeResidents.map((r) => (
                    <TableRow key={r.id} className="hover:bg-accent/40">
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-semibold text-xs text-foreground">{r.fullName}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span>{r.email}</span>
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Home className="h-3.5 w-3.5 text-primary" />
                            <span>Unit {r.apartmentNumber}</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            <span>{r.buildingName} &bull; {r.propertyName}</span>
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{new Date(r.moveInDate).toLocaleDateString()}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {r.emergencyContact ? (
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{r.emergencyContact}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60 italic">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                          Active Lease
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: PENDING ONBOARDING / UNASSIGNED RESIDENTS */}
        <TabsContent value="onboarding" className="m-0 space-y-4">
          {isLoadingUsers ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Checking unassigned resident queue...</p>
            </div>
          ) : unassignedResidents.length === 0 ? (
            <div className="py-20 text-center border border-dashed rounded-2xl border-border bg-card/40 p-6 space-y-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <h3 className="font-semibold text-base text-foreground">
                All Registered Residents Are Assigned!
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                There are currently no registered residents waiting for unit assignment. When a resident registers or submits a claim, they will appear here for 1-click verification.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs">
                <span className="text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span>
                    <strong>{unassignedResidents.length} resident account(s)</strong> registered without an active apartment unit.
                  </span>
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Review declared units and click "Assign to Unit" to complete onboarding.
                </span>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Registered Resident</TableHead>
                    <TableHead className="text-xs">Declared Residence Preference</TableHead>
                    <TableHead className="text-xs">Intended Move-in</TableHead>
                    <TableHead className="text-xs">Emergency Phone</TableHead>
                    <TableHead className="text-xs text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unassignedResidents.map((u) => {
                    const claim = getClaimByEmailOrUserId(u.email, u.id);

                    return (
                      <TableRow key={u.id} className="hover:bg-accent/40">
                        {/* Resident Info */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                              <span>{u.fullName}</span>
                              <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                                New Signup
                              </Badge>
                            </p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span>{u.email}</span>
                            </p>
                            {u.phoneNumber && (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5" />
                                <span>{u.phoneNumber}</span>
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* Declared Residence */}
                        <TableCell>
                          {claim ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <Badge className="bg-emerald-600 text-white text-[10px] font-semibold gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  <span>Claimed Unit {claim.apartmentNumber}</span>
                                </Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                                <Building className="h-3 w-3 text-primary" />
                                <span>
                                  {claim.buildingName} &bull; {claim.propertyName}
                                </span>
                              </p>
                              {claim.notes && (
                                <p className="text-[10px] text-muted-foreground/80 italic">
                                  Note: "{claim.notes}"
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-0.5 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-[10px] text-muted-foreground bg-muted">
                                Direct Signup &bull; No Unit Declared
                              </Badge>
                              <p className="text-[10px] text-muted-foreground/70">
                                Select property & unit manually during assignment
                              </p>
                            </div>
                          )}
                        </TableCell>

                        {/* Move-in Date */}
                        <TableCell className="text-xs text-muted-foreground">
                          {claim?.moveInDate ? (
                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                              <Calendar className="h-3.5 w-3.5 text-primary" />
                              <span>{new Date(claim.moveInDate).toLocaleDateString()}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60 italic">Immediate / Pending</span>
                          )}
                        </TableCell>

                        {/* Emergency Contact */}
                        <TableCell className="text-xs text-muted-foreground">
                          {claim?.emergencyContact ? (
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{claim.emergencyContact}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60 italic">—</span>
                          )}
                        </TableCell>

                        {/* 1-Click Assign Button */}
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="h-7 text-xs font-semibold gap-1 shadow-sm"
                            onClick={() => handleOpenAssignWithTarget(u.id, claim)}
                          >
                            <span>Assign to Unit</span>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Assign Modal with Pre-fill target */}
      <AssignResidentDialog
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        initialUserId={assignTarget.userId}
        initialPropertyId={assignTarget.propertyId}
        initialBuildingId={assignTarget.buildingId}
        initialApartmentId={assignTarget.apartmentId}
        initialMoveInDate={assignTarget.moveInDate}
        initialEmergencyContact={assignTarget.emergencyContact}
      />
    </div>
  );
}
