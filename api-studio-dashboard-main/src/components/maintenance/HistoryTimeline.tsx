import React from "react";
import type { MaintenanceHistoryDto } from "@/lib/api/types";
import { StatusBadge } from "./StatusBadge";
import { History, User, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface HistoryTimelineProps {
  history: MaintenanceHistoryDto[];
}

export function HistoryTimeline({ history }: HistoryTimelineProps) {
  const sorted = (history ?? []).slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <Card className="border-border">
      <CardHeader className="pb-3 border-b border-border/60">
        <CardTitle className="text-sm font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <span>Audit History Trail</span>
          </div>
          <Badge variant="outline" className="text-xs font-semibold">
            {sorted.length} events
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4">
        {sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-4">
            No history recorded yet.
          </p>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
            {sorted.map((item, idx) => (
              <div key={item.id} className="relative group">
                {/* Timeline node icon */}
                <div className="absolute -left-6 top-0.5 h-5 w-5 rounded-full bg-card border-2 border-primary flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.previousStatus && (
                      <>
                        <StatusBadge status={item.previousStatus} />
                        <span className="text-xs text-muted-foreground">&rarr;</span>
                      </>
                    )}
                    <StatusBadge status={item.newStatus} />
                  </div>

                  {item.changeReason && (
                    <p className="text-xs text-foreground/90 font-medium pt-0.5">
                      {item.changeReason}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-0.5">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span>{item.changedBy}</span>
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

