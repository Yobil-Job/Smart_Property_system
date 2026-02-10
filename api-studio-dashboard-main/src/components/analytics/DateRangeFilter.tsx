import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PropertySummaryDto, PagedResult } from "@/lib/api/types";
import { Calendar, Building2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DateRangePreset = "7d" | "30d" | "90d" | "1y";

interface DateRangeFilterProps {
  selectedRange: DateRangePreset;
  onRangeChange: (range: DateRangePreset) => void;
  selectedPropertyId: string;
  onPropertyChange: (propertyId: string) => void;
}

export function DateRangeFilter({
  selectedRange,
  onRangeChange,
  selectedPropertyId,
  onPropertyChange,
}: DateRangeFilterProps) {
  const { data: propertiesData } = useQuery({
    queryKey: ["properties", "filter-list"],
    queryFn: () => apiClient.get<PagedResult<PropertySummaryDto>>("/api/v1/properties", { pageSize: 50 }),
  });

  const properties = propertiesData?.items ?? [];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-card border rounded-xl shadow-xs">
      {/* Date Range Presets */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground mr-1 flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          Period:
        </span>
        <Button
          type="button"
          size="sm"
          variant={selectedRange === "7d" ? "default" : "outline"}
          className="h-8 text-xs font-medium px-3"
          onClick={() => onRangeChange("7d")}
        >
          7 Days
        </Button>
        <Button
          type="button"
          size="sm"
          variant={selectedRange === "30d" ? "default" : "outline"}
          className="h-8 text-xs font-medium px-3"
          onClick={() => onRangeChange("30d")}
        >
          30 Days
        </Button>
        <Button
          type="button"
          size="sm"
          variant={selectedRange === "90d" ? "default" : "outline"}
          className="h-8 text-xs font-medium px-3"
          onClick={() => onRangeChange("90d")}
        >
          90 Days
        </Button>
        <Button
          type="button"
          size="sm"
          variant={selectedRange === "1y" ? "default" : "outline"}
          className="h-8 text-xs font-medium px-3"
          onClick={() => onRangeChange("1y")}
        >
          This Year
        </Button>
      </div>

      {/* Property Selector */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
          <Building2 className="h-3.5 w-3.5" />
          <span>Scope:</span>
        </div>
        <Select value={selectedPropertyId} onValueChange={onPropertyChange}>
          <SelectTrigger className="h-8 text-xs w-[200px] bg-background">
            <SelectValue placeholder="All Properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map((prop) => (
              <SelectItem key={prop.id} value={prop.id}>
                {prop.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

