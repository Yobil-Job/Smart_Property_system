import React from "react";
import { Link } from "@tanstack/react-router";
import type { PendingAction, ConfirmActionResponseDto } from "@/lib/api/types";
import {
  Wrench,
  UserCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ToolConfirmationCardProps {
  action: PendingAction;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  result?: ConfirmActionResponseDto | null;
}

export function ToolConfirmationCard({
  action,
  onConfirm,
  onCancel,
  isLoading,
  result,
}: ToolConfirmationCardProps) {
  const isMaintenance = action.actionType === "CreateMaintenanceRequest";
  const isVisitor = action.actionType === "RegisterVisitor";
  const params = action.parameters || {};

  return (
    <Card className="my-3 border-primary/30 bg-card shadow-md overflow-hidden max-w-[85%] sm:max-w-[75%] rounded-2xl animate-in zoom-in-95 duration-200">
      {/* Header Banner */}
      <CardHeader className="bg-primary/10 border-b border-primary/20 p-3.5 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          {isMaintenance ? (
            <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Wrench className="h-4 w-4" />
            </div>
          ) : (
            <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <UserCheck className="h-4 w-4" />
            </div>
          )}
          <div>
            <CardTitle className="text-xs font-bold text-foreground">
              {isMaintenance ? "Confirm Maintenance Ticket" : "Confirm Visitor Pass"}
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">{action.summary}</p>
          </div>
        </div>

        <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/30 font-bold">
          Action Required
        </Badge>
      </CardHeader>

      <CardContent className="p-3.5 space-y-2.5 text-xs">
        {/* Maintenance Parameters */}
        {isMaintenance && (
          <div className="space-y-1.5 p-2.5 rounded-lg border border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Category</span>
              <Badge variant="secondary" className="text-[10px] font-semibold">{params.category || "Plumbing"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Urgency</span>
              <Badge
                variant={params.priority === "Urgent" ? "destructive" : "outline"}
                className="text-[10px] font-bold"
              >
                {params.priority || "Medium"}
              </Badge>
            </div>
            <div className="pt-1 border-t border-border/50">
              <span className="text-muted-foreground block text-[11px]">Issue Title:</span>
              <p className="font-semibold text-foreground">{params.title}</p>
            </div>
            {params.description && (
              <div>
                <span className="text-muted-foreground block text-[11px]">Details:</span>
                <p className="text-muted-foreground italic text-[11px]">{params.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Visitor Parameters */}
        {isVisitor && (
          <div className="space-y-1.5 p-2.5 rounded-lg border border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Guest Name</span>
              <span className="font-bold text-foreground">{params.visitorName}</span>
            </div>
            {params.visitorPhone ? (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Phone Number</span>
                <span className="font-mono text-foreground">{params.visitorPhone}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Purpose</span>
              <span className="font-medium text-foreground">{params.purpose || "Personal visit"}</span>
            </div>
            {params.expectedArrival && (
              <div className="pt-1 border-t border-border/50 text-[11px]">
                <span className="text-muted-foreground block">Arrival Window:</span>
                <p className="font-medium text-foreground">
                  {new Date(params.expectedArrival).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Execution Result Banner */}
        {result && (
          <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 space-y-1 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{result.message}</span>
            </div>
            {result.ticketNumber && (
              <div className="pt-1">
                <Link
                  to="/maintenance/$id"
                  params={{ id: result.entityId }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  <span>Open Ticket #{result.ticketNumber}</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Action Trigger Buttons */}
      {!result && (
        <CardFooter className="p-3 pt-0 flex items-center justify-end gap-2 border-t border-border/40 bg-muted/10">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-7"
            disabled={isLoading}
            onClick={onCancel}
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-7 gap-1 shadow-xs"
            disabled={isLoading}
            onClick={onConfirm}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            <span>Confirm & Execute</span>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

