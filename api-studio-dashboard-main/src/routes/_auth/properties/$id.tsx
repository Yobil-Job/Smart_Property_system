import React, { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PropertyDetailDto } from "@/lib/api/types";
import { BuildingList } from "@/components/properties/BuildingList";
import { ApartmentGrid } from "@/components/properties/ApartmentGrid";
import { PropertyFormDialog } from "@/components/properties/PropertyFormDialog";
import {
  Building2,
  MapPin,
  ArrowLeft,
  Edit,
  Loader2,
  Layers,
  Home,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_auth/properties/$id")({
  component: PropertyDetailPage,
});

function PropertyDetailPage() {
  const { id } = useParams({ from: "/_auth/properties/$id" });
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: property, isLoading, error } = useQuery<PropertyDetailDto>({
    queryKey: ["property", id],
    queryFn: () => apiClient.get<PropertyDetailDto>(`/properties/${id}`),
  });

  // Set initial selected building if none is selected
  React.useEffect(() => {
    if (property?.buildings && property.buildings.length > 0 && !selectedBuildingId) {
      setSelectedBuildingId(property.buildings[0]?.id ?? null);
    }
  }, [property, selectedBuildingId]);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Loading property details & hierarchy...</p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
        <p className="font-bold text-destructive text-sm">Failed to load property</p>
        <p className="text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "The requested property could not be found."}
        </p>
        <Link to="/properties">
          <Button variant="outline" size="sm" className="text-xs gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Properties</span>
          </Button>
        </Link>
      </Card>
    );
  }

  const selectedBuilding = property.buildings.find((b) => b.id === selectedBuildingId);

  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
        <Link to="/properties" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Properties</span>
        </Link>
        <span>/</span>
        <span className="text-foreground font-semibold truncate">{property.name}</span>
      </div>

      {/* Property Overview Header Card */}
      <div className="rounded-2xl border border-border bg-gradient-to-r from-card to-card/60 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-bold text-foreground">
                    {property.name}
                  </h1>
                  <Badge variant="outline" className="text-xs font-semibold">
                    {property.propertyType}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {property.address}, {property.city}, {property.country}
                  </span>
                </p>
              </div>
            </div>

            {property.description && (
              <p className="text-xs text-muted-foreground max-w-2xl pt-1">
                {property.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 px-4 py-2 rounded-xl border border-border bg-muted/20 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Buildings</span>
                <p className="font-bold text-foreground text-sm">{property.buildings.length}</p>
              </div>
              <div className="h-6 w-[1px] bg-border" />
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Units</span>
                <p className="font-bold text-foreground text-sm">{property.totalApartments}</p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5 h-9"
              onClick={() => setIsEditOpen(true)}
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Edit Property</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Buildings & Apartments Dual Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Buildings Directory */}
        <div className="lg:col-span-4">
          <BuildingList
            propertyId={property.id}
            buildings={property.buildings}
            selectedBuildingId={selectedBuildingId}
            onSelectBuilding={(bId) => setSelectedBuildingId(bId)}
          />
        </div>

        {/* Right Column: Units & Floor Matrix for selected building */}
        <div className="lg:col-span-8">
          {selectedBuilding ? (
            <ApartmentGrid
              buildingId={selectedBuilding.id}
              buildingName={selectedBuilding.name}
              maxFloors={selectedBuilding.floorCount}
            />
          ) : (
            <div className="py-24 text-center border border-dashed rounded-xl border-border bg-card/40 p-6 space-y-2">
              <Layers className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold text-foreground">No building selected</p>
              <p className="text-xs text-muted-foreground">
                Add or select a building on the left to inspect its apartment floor plan.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Property Modal */}
      <PropertyFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        initialData={{
          id: property.id,
          name: property.name,
          propertyType: property.propertyType,
          address: property.address,
          city: property.city,
          country: property.country,
          description: property.description,
        }}
      />
    </div>
  );
}

