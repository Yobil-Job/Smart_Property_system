import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PropertySummaryDto, PagedResult, PropertyType } from "@/lib/api/types";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { PropertyFormDialog } from "@/components/properties/PropertyFormDialog";
import {
  Building2,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  Table as TableIcon,
  Loader2,
  Building,
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
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/properties/")({
  component: PropertiesPage,
});

function PropertiesPage() {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data, isLoading } = useQuery<PagedResult<PropertySummaryDto>>({
    queryKey: ["properties", search],
    queryFn: () =>
      apiClient.get<PagedResult<PropertySummaryDto>>("/properties", {
        search: search.trim() || undefined,
        pageSize: 50,
      }),
  });

  const allProperties = data?.items ?? [];
  const filteredProperties =
    selectedType === "All"
      ? allProperties
      : allProperties.filter((p) => p.propertyType === selectedType);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span>Properties Portfolio</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage your developments, multi-family buildings, and residential units
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          size="sm"
          className="font-semibold text-xs gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Add Property</span>
        </Button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card/60">
        <div className="flex items-center gap-2 w-full sm:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by property name, city, address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* PropertyType Filter Pills */}
          <div className="flex items-center gap-1">
            {["All", "Residential", "Commercial", "Mixed"].map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? "secondary" : "ghost"}
                size="sm"
                className="h-8 text-xs px-2.5 font-medium"
                onClick={() => setSelectedType(type)}
              >
                {type}
              </Button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-border mx-1" />

          {/* Grid vs Table Toggle */}
          <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode("table")}
              aria-label="Table view"
            >
              <TableIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading property portfolio...</p>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="py-24 text-center border border-dashed rounded-2xl border-border bg-card/40 p-6 space-y-3">
          <Building className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="font-semibold text-base text-foreground">No properties found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {search
              ? `No properties matched "${search}". Try adjusting your filters.`
              : "Get started by adding your first property development."}
          </p>
          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            variant="outline"
            className="text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Property</span>
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProperties.map((prop) => (
            <PropertyCard key={prop.id} property={prop} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Property Name</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Location</TableHead>
                <TableHead className="text-xs text-center">Buildings</TableHead>
                <TableHead className="text-xs text-center">Total Units</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProperties.map((prop) => (
                <TableRow key={prop.id} className="hover:bg-accent/40">
                  <TableCell className="font-semibold text-xs text-foreground">
                    <Link
                      to="/properties/$id"
                      params={{ id: prop.id }}
                      className="hover:underline flex items-center gap-2"
                    >
                      <Building2 className="h-4 w-4 text-primary" />
                      <span>{prop.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {prop.propertyType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {prop.city}, {prop.country}
                  </TableCell>
                  <TableCell className="text-xs text-center font-bold">
                    {prop.buildingCount}
                  </TableCell>
                  <TableCell className="text-xs text-center font-bold">
                    {prop.totalApartments}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to="/properties/$id" params={{ id: prop.id }}>
                      <Button variant="ghost" size="sm" className="h-8 text-xs font-medium">
                        Explore
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Modal */}
      <PropertyFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </div>
  );
}

