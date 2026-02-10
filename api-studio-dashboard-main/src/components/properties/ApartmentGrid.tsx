import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApartmentDetailDto, OccupancyStatus } from "@/lib/api/types";
import {
  Home,
  Plus,
  Bed,
  Bath,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  Loader2,
  MoreVertical,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ApartmentGridProps {
  buildingId: string;
  buildingName: string;
  maxFloors: number;
}

export function ApartmentGrid({ buildingId, buildingName, maxFloors }: ApartmentGridProps) {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [apartmentNumber, setApartmentNumber] = useState("");
  const [floor, setFloor] = useState<number>(1);
  const [numberOfBedrooms, setNumberOfBedrooms] = useState<number>(2);
  const [numberOfBathrooms, setNumberOfBathrooms] = useState<number>(1);

  const { data: apartments, isLoading } = useQuery<ApartmentDetailDto[]>({
    queryKey: ["buildingApartments", buildingId],
    queryFn: () => apiClient.get<ApartmentDetailDto[]>(`/buildings/${buildingId}/apartments`, { pageSize: 100 }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OccupancyStatus }) => {
      return apiClient.patch(`/apartments/${id}/occupancy`, { occupancyStatus: status });
    },
    onSuccess: (_, vars) => {
      toast.success(`Unit status updated to ${vars.status}`);
      queryClient.invalidateQueries({ queryKey: ["buildingApartments", buildingId] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    },
  });

  const addApartmentMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/buildings/${buildingId}/apartments`, {
        apartmentNumber,
        floor: Number(floor),
        numberOfBedrooms: Number(numberOfBedrooms),
        numberOfBathrooms: Number(numberOfBathrooms),
      });
    },
    onSuccess: () => {
      toast.success("Apartment created successfully");
      queryClient.invalidateQueries({ queryKey: ["buildingApartments", buildingId] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      setApartmentNumber("");
      setIsAddOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to add apartment");
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apartmentNumber) {
      toast.error("Please enter an apartment number.");
      return;
    }
    addApartmentMutation.mutate();
  };

  const getStatusBadge = (status: OccupancyStatus) => {
    switch (status) {
      case "Occupied":
        return <Badge className="bg-blue-600 hover:bg-blue-600 text-white font-semibold text-[10px]">Occupied</Badge>;
      case "Vacant":
        return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-semibold text-[10px]">Vacant</Badge>;
      case "UnderMaintenance":
        return <Badge className="bg-amber-600 hover:bg-amber-600 text-white font-semibold text-[10px]">Maintenance</Badge>;
      case "Reserved":
        return <Badge className="bg-purple-600 hover:bg-purple-600 text-white font-semibold text-[10px]">Reserved</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  // Group apartments by floor
  const units: ApartmentDetailDto[] = Array.isArray(apartments)
    ? apartments
    : (apartments as any)?.items ?? [];
  const floorsMap: Record<number, ApartmentDetailDto[]> = {};
  units.forEach((u) => {
    if (!floorsMap[u.floor]) floorsMap[u.floor] = [];
    floorsMap[u.floor]?.push(u);
  });
  const sortedFloors = Object.keys(floorsMap)
    .map(Number)
    .sort((a, b) => b - a); // Top floor down

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card/60">
        <div>
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <span>{buildingName} Units</span>
            <Badge variant="outline" className="text-xs font-semibold">
              {units.length} total
            </Badge>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Floor plan and real-time residential unit occupancy matrix
          </p>
        </div>

        <Button
          size="sm"
          className="font-semibold text-xs gap-1.5 shadow-sm"
          onClick={() => setIsAddOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Unit</span>
        </Button>
      </div>

      {/* Units Grid grouped by Floor */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading building units...</p>
        </div>
      ) : units.length === 0 ? (
        <div className="py-16 text-center border border-dashed rounded-xl border-border bg-card/40 p-6 space-y-2">
          <Home className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold text-foreground">No units in this building yet</p>
          <p className="text-xs text-muted-foreground">
            Create apartments to start assigning residents and tracking occupancy.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => setIsAddOpen(true)}
          >
            Add First Unit
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedFloors.map((fl) => (
            <div key={fl} className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span className="bg-muted px-2 py-0.5 rounded-md">Floor {fl}</span>
                <span className="text-[11px] font-normal lowercase">
                  ({floorsMap[fl]?.length} units)
                </span>
                <div className="flex-1 h-[1px] bg-border/60" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {floorsMap[fl]?.map((unit) => (
                  <div
                    key={unit.id}
                    className="p-3.5 rounded-xl border border-border bg-card/70 hover:shadow-md hover:border-primary/40 transition-all space-y-2 relative group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-base text-foreground flex items-center gap-1">
                          Unit {unit.apartmentNumber}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <Bed className="h-3 w-3" />
                            {unit.numberOfBedrooms}
                          </span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-0.5">
                            <Bath className="h-3 w-3" />
                            {unit.numberOfBathrooms}
                          </span>
                        </div>
                      </div>

                      {/* Status Dropdown Trigger */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="cursor-pointer focus:outline-hidden"
                            title="Click to change occupancy status"
                          >
                            {getStatusBadge(unit.occupancyStatus)}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground">
                            Update Status
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {(
                            [
                              "Vacant",
                              "Occupied",
                              "UnderMaintenance",
                              "Reserved",
                            ] as OccupancyStatus[]
                          ).map((st) => (
                            <DropdownMenuItem
                              key={st}
                              className="text-xs cursor-pointer"
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  id: unit.id,
                                  status: st,
                                })
                              }
                            >
                              {st}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Apartment Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Apartment Unit</DialogTitle>
            <DialogDescription className="text-xs">
              Add a new unit to {buildingName}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-3.5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="u-num">Unit / Apartment # *</Label>
                <Input
                  id="u-num"
                  placeholder="e.g. 101 or 4B"
                  value={apartmentNumber}
                  onChange={(e) => setApartmentNumber(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="u-floor">Floor Number *</Label>
                <Input
                  id="u-floor"
                  type="number"
                  min={1}
                  max={maxFloors || 100}
                  value={floor}
                  onChange={(e) => setFloor(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="u-beds">Bedrooms</Label>
                <Input
                  id="u-beds"
                  type="number"
                  min={0}
                  max={10}
                  value={numberOfBedrooms}
                  onChange={(e) => setNumberOfBedrooms(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="u-baths">Bathrooms</Label>
                <Input
                  id="u-baths"
                  type="number"
                  min={1}
                  max={10}
                  value={numberOfBathrooms}
                  onChange={(e) => setNumberOfBathrooms(Number(e.target.value))}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={addApartmentMutation.isPending}>
                {addApartmentMutation.isPending && (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                )}
                <span>Add Unit</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

