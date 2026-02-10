import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  UserSummaryDto,
  PropertySummaryDto,
  PropertyDetailDto,
  ApartmentDetailDto,
  ResidentSummaryDto,
  PagedResult,
} from "@/lib/api/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Sparkles, Building2, Home, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { approveResidencyClaim } from "@/lib/api/residency-requests";

interface AssignResidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUserId?: string;
  initialPropertyId?: string;
  initialBuildingId?: string;
  initialApartmentId?: string;
  initialMoveInDate?: string;
  initialEmergencyContact?: string;
}

export function AssignResidentDialog({
  open,
  onOpenChange,
  initialUserId,
  initialPropertyId,
  initialBuildingId,
  initialApartmentId,
  initialMoveInDate,
  initialEmergencyContact,
}: AssignResidentDialogProps) {
  const queryClient = useQueryClient();

  const [userId, setUserId] = useState(initialUserId || "");
  const [propertyId, setPropertyId] = useState(initialPropertyId || "");
  const [buildingId, setBuildingId] = useState(initialBuildingId || "");
  const [apartmentId, setApartmentId] = useState(initialApartmentId || "");
  const [moveInDate, setMoveInDate] = useState(
    initialMoveInDate || new Date().toISOString().split("T")[0]
  );
  const [emergencyContact, setEmergencyContact] = useState(
    initialEmergencyContact || ""
  );

  React.useEffect(() => {
    if (open) {
      if (initialUserId) setUserId(initialUserId);
      if (initialPropertyId) setPropertyId(initialPropertyId);
      if (initialBuildingId) setBuildingId(initialBuildingId);
      if (initialApartmentId) setApartmentId(initialApartmentId);
      if (initialMoveInDate) setMoveInDate(initialMoveInDate);
      if (initialEmergencyContact) setEmergencyContact(initialEmergencyContact);
    }
  }, [
    open,
    initialUserId,
    initialPropertyId,
    initialBuildingId,
    initialApartmentId,
    initialMoveInDate,
    initialEmergencyContact,
  ]);

  // Inline "Quick Add Unit" toggle & state
  const [showQuickAddUnit, setShowQuickAddUnit] = useState(false);
  const [newUnitNumber, setNewUnitNumber] = useState("");
  const [newUnitFloor, setNewUnitFloor] = useState(1);
  const [newUnitBedrooms, setNewUnitBedrooms] = useState(2);
  const [newUnitBathrooms, setNewUnitBathrooms] = useState(1);

  // 1. Fetch registered resident accounts
  const { data: usersData, isLoading: isLoadingUsers } = useQuery<PagedResult<UserSummaryDto>>({
    queryKey: ["residentUsers"],
    queryFn: () => apiClient.get<PagedResult<UserSummaryDto>>("/users", { role: "Resident", pageSize: 100 }),
    enabled: open,
  });

  // 2. Fetch existing active resident profiles to identify assigned vs unassigned accounts
  const { data: activeResidentsData } = useQuery<PagedResult<ResidentSummaryDto>>({
    queryKey: ["existingResidentsAudit"],
    queryFn: () => apiClient.get<PagedResult<ResidentSummaryDto>>("/residents", { pageSize: 200 }),
    enabled: open,
  });

  // Map of userId -> Resident record
  const assignedUsersMap = useMemo(() => {
    const map = new Map<string, ResidentSummaryDto>();
    (activeResidentsData?.items ?? []).forEach((r) => {
      if (r.userId && r.status === "Active") {
        map.set(r.userId, r);
      }
    });
    return map;
  }, [activeResidentsData]);

  // 3. Fetch properties
  const { data: propertiesData } = useQuery<PagedResult<PropertySummaryDto>>({
    queryKey: ["properties"],
    queryFn: () => apiClient.get<PagedResult<PropertySummaryDto>>("/properties", { pageSize: 100 }),
    enabled: open,
  });

  // 4. Fetch property details when property is selected
  const { data: propertyDetail } = useQuery<PropertyDetailDto>({
    queryKey: ["propertyDetail", propertyId],
    queryFn: () => apiClient.get<PropertyDetailDto>(`/properties/${propertyId}`),
    enabled: !!propertyId,
  });

  // 5. Fetch apartments for selected building
  const { data: apartmentsData, isLoading: isLoadingApts } = useQuery<PagedResult<ApartmentDetailDto>>({
    queryKey: ["buildingApartments", buildingId],
    queryFn: () => apiClient.get<PagedResult<ApartmentDetailDto>>(`/buildings/${buildingId}/apartments`, { pageSize: 100 }),
    enabled: !!buildingId,
  });

  const rawApartments: ApartmentDetailDto[] = (apartmentsData as unknown as PagedResult<ApartmentDetailDto>)?.items ??
    (Array.isArray(apartmentsData) ? (apartmentsData as unknown as ApartmentDetailDto[]) : []);

  // Sort apartments: Vacant first, then by unit number
  const sortedApartments = useMemo(() => {
    return [...rawApartments].sort((a, b) => {
      if (a.occupancyStatus === "Vacant" && b.occupancyStatus !== "Vacant") return -1;
      if (a.occupancyStatus !== "Vacant" && b.occupancyStatus === "Vacant") return 1;
      return a.apartmentNumber.localeCompare(b.apartmentNumber, undefined, { numeric: true });
    });
  }, [rawApartments]);

  // Quick Add Unit mutation
  const createUnitMutation = useMutation({
    mutationFn: async () => {
      if (!buildingId) throw new Error("Select a building first");
      return apiClient.post<ApartmentDetailDto>(`/buildings/${buildingId}/apartments`, {
        apartmentNumber: newUnitNumber.trim(),
        floor: Number(newUnitFloor),
        numberOfBedrooms: Number(newUnitBedrooms),
        numberOfBathrooms: Number(newUnitBathrooms),
      });
    },
    onSuccess: (newApt) => {
      toast.success(`Unit ${newUnitNumber} created in this building!`);
      queryClient.invalidateQueries({ queryKey: ["buildingApartments", buildingId] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      setApartmentId(newApt.id);
      setShowQuickAddUnit(false);
      setNewUnitNumber("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to create apartment unit");
    },
  });

  // Assign resident mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post("/residents", {
        userId,
        apartmentId,
        moveInDate,
        emergencyContact,
      });
    },
    onSuccess: () => {
      toast.success("Resident successfully assigned to apartment!");
      if (userId) {
        approveResidencyClaim(userId);
      }
      queryClient.invalidateQueries({ queryKey: ["residents"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["buildingApartments", buildingId] });
      queryClient.invalidateQueries({ queryKey: ["myResidentProfile"] });
      queryClient.invalidateQueries({ queryKey: ["residentUsers"] });
      onOpenChange(false);
      // Reset form
      setUserId("");
      setPropertyId("");
      setBuildingId("");
      setApartmentId("");
      setEmergencyContact("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to assign resident");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("Please select a resident user account.");
      return;
    }
    if (!apartmentId) {
      toast.error("Please select an apartment unit.");
      return;
    }
    if (!moveInDate) {
      toast.error("Please specify a move-in date.");
      return;
    }
    assignMutation.mutate();
  };

  const selectedResidentAssignment = userId ? assignedUsersMap.get(userId) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Home className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Assign Resident to Apartment</DialogTitle>
              <DialogDescription className="text-xs">
                Link a resident user to a residential unit to unlock the resident portal.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* 1. Resident User Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="res-user" className="text-xs font-semibold">
                Resident Account *
              </Label>
              {selectedResidentAssignment && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Currently assigned to Unit {selectedResidentAssignment.apartmentNumber}
                </span>
              )}
            </div>

            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger id="res-user" className="text-xs">
                <SelectValue placeholder={isLoadingUsers ? "Loading users..." : "Select resident account"} />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {(usersData?.items ?? []).map((u) => {
                  const assignment = assignedUsersMap.get(u.id);
                  const isAssigned = !!assignment;

                  return (
                    <SelectItem
                      key={u.id}
                      value={u.id}
                      disabled={isAssigned}
                      className="text-xs"
                    >
                      <div className="flex items-center justify-between w-full gap-2 py-0.5">
                        <span className={isAssigned ? "text-muted-foreground line-through opacity-70" : "font-medium"}>
                          {u.fullName} ({u.email})
                        </span>
                        {isAssigned ? (
                          <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20 shrink-0">
                            Apt {assignment.apartmentNumber}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shrink-0">
                            Ready
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Property & Building Cascade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="res-prop" className="text-xs font-semibold">Property *</Label>
              <Select
                value={propertyId}
                onValueChange={(val) => {
                  setPropertyId(val);
                  setBuildingId("");
                  setApartmentId("");
                }}
              >
                <SelectTrigger id="res-prop" className="text-xs">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {(propertiesData?.items ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name} ({p.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="res-building" className="text-xs font-semibold">Building *</Label>
              <Select
                value={buildingId}
                onValueChange={(val) => {
                  setBuildingId(val);
                  setApartmentId("");
                  setShowQuickAddUnit(false);
                }}
                disabled={!propertyId}
              >
                <SelectTrigger id="res-building" className="text-xs">
                  <SelectValue placeholder={!propertyId ? "Select property first" : "Select building"} />
                </SelectTrigger>
                <SelectContent>
                  {(propertyDetail?.buildings ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">
                      {b.name} ({b.apartmentCount} units)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 3. Apartment Unit Selector */}
          {buildingId && (
            <div className="space-y-2 p-3 rounded-xl border border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <Label htmlFor="res-apt" className="text-xs font-semibold flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span>Select Unit in Building *</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] px-2 text-primary hover:text-primary/80"
                  onClick={() => setShowQuickAddUnit(!showQuickAddUnit)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {showQuickAddUnit ? "Cancel Quick Add" : "New Unit"}
                </Button>
              </div>

              {/* Quick Add Unit Inline Form */}
              {showQuickAddUnit && (
                <div className="p-3 mb-2 rounded-lg border border-primary/20 bg-primary/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      Quick Create Unit
                    </span>
                    <span className="text-[10px] text-muted-foreground">Will be auto-selected</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Unit #</Label>
                      <Input
                        placeholder="e.g. 402"
                        className="h-7 text-xs"
                        value={newUnitNumber}
                        onChange={(e) => setNewUnitNumber(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Floor</Label>
                      <Input
                        type="number"
                        min={1}
                        className="h-7 text-xs"
                        value={newUnitFloor}
                        onChange={(e) => setNewUnitFloor(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Beds</Label>
                      <Input
                        type="number"
                        min={1}
                        className="h-7 text-xs"
                        value={newUnitBedrooms}
                        onChange={(e) => setNewUnitBedrooms(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Baths</Label>
                      <Input
                        type="number"
                        min={1}
                        className="h-7 text-xs"
                        value={newUnitBathrooms}
                        onChange={(e) => setNewUnitBathrooms(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs w-full"
                    disabled={!newUnitNumber || createUnitMutation.isPending}
                    onClick={() => createUnitMutation.mutate()}
                  >
                    {createUnitMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    )}
                    <span>Create & Select Unit</span>
                  </Button>
                </div>
              )}

              <Select value={apartmentId} onValueChange={setApartmentId}>
                <SelectTrigger id="res-apt" className="text-xs bg-background">
                  <SelectValue placeholder={isLoadingApts ? "Loading units..." : "Select apartment unit"} />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {sortedApartments.length === 0 ? (
                    <SelectItem value="none" disabled className="text-xs">
                      No units exist in this building. Use 'New Unit' above.
                    </SelectItem>
                  ) : (
                    sortedApartments.map((a) => {
                      const isVacant = a.occupancyStatus === "Vacant";
                      return (
                        <SelectItem key={a.id} value={a.id} className="text-xs">
                          <div className="flex items-center justify-between w-full gap-3 py-0.5">
                            <span className="font-medium">
                              Unit {a.apartmentNumber} &bull; Floor {a.floor} ({a.numberOfBedrooms} Bed, {a.numberOfBathrooms} Bath)
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] font-semibold shrink-0 ${
                                isVacant
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                              }`}
                            >
                              {a.occupancyStatus}
                            </Badge>
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 4. Move-in Date & Emergency Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="res-movein" className="text-xs font-semibold">Move-in Date *</Label>
              <Input
                id="res-movein"
                type="date"
                className="text-xs"
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="res-emergency" className="text-xs font-semibold">Emergency Phone</Label>
              <Input
                id="res-emergency"
                placeholder="+1 (555) 000-0000"
                className="text-xs"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs font-semibold shadow-sm"
              disabled={assignMutation.isPending || !userId || !apartmentId}
            >
              {assignMutation.isPending && (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              )}
              <span>Assign Resident</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
