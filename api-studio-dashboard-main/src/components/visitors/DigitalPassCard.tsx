import React from "react";
import type { VisitorDetailDto } from "@/lib/api/types";
import { VisitorStatusBadge } from "./VisitorStatusBadge";
import {
  QrCode,
  Calendar,
  Clock,
  Phone,
  Home,
  User,
  ShieldCheck,
  Share2,
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DigitalPassCardProps {
  visitor: VisitorDetailDto;
}

export function DigitalPassCard({ visitor }: DigitalPassCardProps) {
  const arrivalDate = new Date(visitor.expectedArrival);
  const departureDate = new Date(visitor.expectedDeparture);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(
        `SmartProperty Visitor Pass for ${visitor.visitorName} | Apt ${visitor.apartmentNumber} | Valid: ${arrivalDate.toLocaleDateString()}`
      );
      toast.success("Visitor pass information copied to clipboard");
    }
  };

  return (
    <Card className="overflow-hidden border-border bg-card/80 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Pass Top Ribbon */}
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-muted/30 p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-foreground">
              Visitor Access Pass
            </span>
          </div>
          <VisitorStatusBadge status={visitor.status} />
        </div>

        <CardContent className="p-4 space-y-3.5">
          {/* Guest Identity & Unit */}
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <h3 className="font-bold text-base text-foreground flex items-center gap-1.5">
                <User className="h-4 w-4 text-primary shrink-0" />
                <span>{visitor.visitorName}</span>
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <span>{visitor.visitorPhone}</span>
              </p>
            </div>

            {/* QR Code / Access Stamp */}
            <div className="h-12 w-12 rounded-lg border border-border bg-muted/40 p-1 flex items-center justify-center shrink-0">
              <QrCode className="h-full w-full text-foreground/80" />
            </div>
          </div>

          <div className="p-2.5 rounded-lg border border-border bg-muted/20 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Host Resident</span>
              <span className="font-semibold text-foreground">{visitor.residentName}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Destination Unit</span>
              <span className="font-semibold text-foreground">Apt {visitor.apartmentNumber}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Purpose</span>
              <span className="font-semibold text-foreground">{visitor.purpose}</span>
            </div>
          </div>

          {/* Time Window */}
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>
                Arrival: <strong>{arrivalDate.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                Valid Until: <strong>{departureDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
              </span>
            </div>
          </div>

          {/* Timestamp Chips */}
          {(visitor.checkedInAt || visitor.checkedOutAt) && (
            <div className="pt-2 border-t border-border/50 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
              {visitor.checkedInAt && (
                <span className="bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md font-medium">
                  In: {new Date(visitor.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              {visitor.checkedOutAt && (
                <span className="bg-muted px-2 py-0.5 rounded-md font-medium">
                  Out: {new Date(visitor.checkedOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </div>

      <CardFooter className="p-4 pt-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs font-semibold gap-1.5 h-8"
          onClick={handleShare}
        >
          <Share2 className="h-3.5 w-3.5" />
          <span>Share Pass Details</span>
        </Button>
      </CardFooter>
    </Card>
  );
}

