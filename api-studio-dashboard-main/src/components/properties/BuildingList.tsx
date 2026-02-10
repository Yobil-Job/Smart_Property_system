import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { BuildingDetailDto } from "@/lib/api/types";
import {
  Building,
  Plus,
  Layers,
  Home,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface BuildingListProps {
  propertyId: string;
  buildings: BuildingDetailDto[];
  selectedBuildingId: string | null;
  onSelectBuilding: (buildingId: string) => void;
}

export function BuildingList({
  propertyId,
  buildings,
  selectedBuildingId,
  onSelectBuilding,
}: BuildingListProps) {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [floorCount, setFloorCount] = useState<number>(3);
  const [description, setDescription] = useState("");

  const addBuildingMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/properties/${propertyId}/buildings`, {
        name,
        floorCount: Number(floorCount),
        description,
      });
    },
    onSuccess: () => {
      toast.success("Building created successfully");
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      setName("");
      setFloorCount(3);
      setDescription("");
      setIsAddOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to add building");
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || floorCount < 1) {
      toast.error("Please enter a valid building name and floor count.");
      return;
    }
    addBuildingMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm tracking-tight text-foreground flex items-center gap-2">
          <Building className="h-4 w-4 text-primary" />
          <span>Buildings ({buildings.length})</span>
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1"
          onClick={() => setIsAddOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Building</span>
        </Button>
      </div>

      {buildings.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-xl border-border bg-card/40 p-4 space-y-2">
          <p className="text-xs text-muted-foreground">
            No buildings added to this property yet.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={() => setIsAddOpen(true)}
          >
            Add First Building
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {buildings.map((b) => {
            const isSelected = selectedBuildingId === b.id;
            return (
              <div
                key={b.id}
                onClick={() => onSelectBuilding(b.id)}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-xs"
                    : "border-border bg-card/60 hover:bg-accent/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                      <span>{b.name}</span>
                    </h4>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {b.description || "No description provided"}
                    </p>
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${
                      isSelected ? "text-primary translate-x-0.5" : "text-muted-foreground"
                    }`}
                  />
                </div>

                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border/40">
                  <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3 text-primary" />
                    <span>{b.floorCount} Floors</span>
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <Home className="h-3 w-3 text-primary" />
                    <span>{b.apartmentCount} Units</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Building Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Building</DialogTitle>
            <DialogDescription className="text-xs">
              Define a new building block or tower within this property.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="b-name">Building Name *</Label>
              <Input
                id="b-name"
                placeholder="e.g. Tower A / North Wing"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-floors">Total Floor Count *</Label>
              <Input
                id="b-floors"
                type="number"
                min={1}
                max={150}
                value={floorCount}
                onChange={(e) => setFloorCount(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-desc">Description</Label>
              <Textarea
                id="b-desc"
                placeholder="Key details or notes..."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
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
              <Button type="submit" size="sm" disabled={addBuildingMutation.isPending}>
                {addBuildingMutation.isPending && (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                )}
                <span>Add Building</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

