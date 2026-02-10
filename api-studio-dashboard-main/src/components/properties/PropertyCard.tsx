import React from "react";
import { Link } from "@tanstack/react-router";
import type { PropertySummaryDto, PropertyType } from "@/lib/api/types";
import { Building2, MapPin, Building, Home, ArrowRight } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PropertyCardProps {
  property: PropertySummaryDto;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const getPropertyTypeBadge = (type: PropertyType) => {
    switch (type) {
      case "Commercial":
        return <Badge variant="secondary" className="font-semibold text-[10px]">Commercial</Badge>;
      case "Mixed":
        return <Badge className="bg-purple-600 text-white font-semibold text-[10px]">Mixed-Use</Badge>;
      case "Residential":
      default:
        return <Badge variant="default" className="font-semibold text-[10px]">Residential</Badge>;
    }
  };

  return (
    <Card className="overflow-hidden border-border bg-card/70 hover:shadow-lg hover:border-primary/40 transition-all duration-200 flex flex-col justify-between group">
      <div>
        {/* Visual Banner Header */}
        <div className="h-28 bg-gradient-to-br from-primary/15 via-primary/5 to-muted/40 p-4 flex flex-col justify-between relative border-b border-border/40">
          <div className="flex items-center justify-between">
            {getPropertyTypeBadge(property.propertyType)}
            <div className="h-7 w-7 rounded-lg bg-card/80 backdrop-blur-sm border border-border flex items-center justify-center text-primary shadow-xs">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {property.name}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{property.city}, {property.country}</span>
            </p>
          </div>
        </div>

        {/* Property Stats */}
        <CardContent className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground line-clamp-1">
            {property.address}
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div className="p-2.5 rounded-lg border border-border bg-muted/20 flex items-center gap-2">
              <Building className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Buildings</p>
                <p className="font-bold text-foreground text-sm">{property.buildingCount}</p>
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-border bg-muted/20 flex items-center gap-2">
              <Home className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Units</p>
                <p className="font-bold text-foreground text-sm">{property.totalApartments}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </div>

      <CardFooter className="p-4 pt-0">
        <Link to="/properties/$id" params={{ id: property.id }} className="w-full">
          <Button variant="outline" size="sm" className="w-full text-xs font-semibold gap-1.5 group-hover:border-primary/50 group-hover:bg-primary/5">
            <span>Explore Buildings & Units</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

