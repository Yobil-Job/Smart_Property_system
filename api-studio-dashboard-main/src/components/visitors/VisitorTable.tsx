import React from "react";
import type { VisitorDetailDto } from "@/lib/api/types";
import { VisitorStatusBadge } from "./VisitorStatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Phone, Calendar, Clock, Home, User } from "lucide-react";

interface VisitorTableProps {
  visitors: VisitorDetailDto[];
}

export function VisitorTable({ visitors }: VisitorTableProps) {
  if (visitors.length === 0) {
    return (
      <div className="py-16 text-center border border-dashed rounded-xl border-border bg-card/40 p-4">
        <p className="text-xs text-muted-foreground">No visitor records found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Visitor Name</TableHead>
            <TableHead className="text-xs">Destination & Host</TableHead>
            <TableHead className="text-xs">Purpose</TableHead>
            <TableHead className="text-xs">Expected Window</TableHead>
            <TableHead className="text-xs">Check-in / Out</TableHead>
            <TableHead className="text-xs text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visitors.map((vis) => (
            <TableRow key={vis.id} className="hover:bg-accent/40">
              <TableCell>
                <div className="space-y-0.5">
                  <p className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span>{vis.visitorName}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>{vis.visitorPhone}</span>
                  </p>
                </div>
              </TableCell>

              <TableCell>
                <div className="space-y-0.5 text-xs">
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    <Home className="h-3.5 w-3.5 text-primary" />
                    <span>Apt {vis.apartmentNumber}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">Host: {vis.residentName}</p>
                </div>
              </TableCell>

              <TableCell className="text-xs text-foreground font-medium">
                {vis.purpose}
              </TableCell>

              <TableCell className="text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {new Date(vis.expectedArrival).toLocaleDateString([], { month: "short", day: "numeric" })} &bull;{" "}
                    {new Date(vis.expectedArrival).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </TableCell>

              <TableCell className="text-xs text-muted-foreground">
                {vis.checkedInAt ? (
                  <span className="font-mono text-[11px]">
                    In: {new Date(vis.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {vis.checkedOutAt && (
                      <> &bull; Out: {new Date(vis.checkedOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground/60 italic">—</span>
                )}
              </TableCell>

              <TableCell className="text-right">
                <VisitorStatusBadge status={vis.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

