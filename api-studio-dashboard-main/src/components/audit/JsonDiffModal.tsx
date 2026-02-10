import React from "react";
import type { AuditLogDetailDto } from "@/lib/api/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileJson, ArrowRight, User, Calendar, ShieldCheck } from "lucide-react";

interface JsonDiffModalProps {
  log: AuditLogDetailDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JsonDiffModal({ log, open, onOpenChange }: JsonDiffModalProps) {
  if (!log) return null;

  const getActionBadge = (action: string) => {
    switch (action) {
      case "Create":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Create</Badge>;
      case "Update":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">Update</Badge>;
      case "Delete":
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30">Delete</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatJson = (val: string | null) => {
    if (!val) return null;
    try {
      const parsed = JSON.parse(val);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return val;
    }
  };

  const formattedPrev = formatJson(log.previousState);
  const formattedNext = formatJson(log.newState);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="border-b pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <FileJson className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold flex items-center gap-2">
                  <span>Mutation Audit Inspector</span>
                  {getActionBadge(log.action)}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Entity: <span className="font-semibold text-foreground">{log.entityName}</span> (ID:{" "}
                  <span className="font-mono">{log.entityId}</span>)
                </DialogDescription>
              </div>
            </div>

            <div className="text-right text-xs text-muted-foreground hidden sm:block">
              <div className="flex items-center gap-1.5 justify-end">
                <User className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{log.userName}</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end mt-0.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* State Comparison Side-by-Side */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            {/* Previous State */}
            <div className="flex flex-col rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 overflow-hidden">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-rose-500/20 text-xs font-semibold text-rose-600">
                <span>Previous State (Before Mutation)</span>
                {formattedPrev ? <Badge variant="outline" className="text-[10px] border-rose-500/30 text-rose-600">Original</Badge> : null}
              </div>
              {formattedPrev ? (
                <pre className="text-xs font-mono text-foreground/80 overflow-x-auto whitespace-pre-wrap p-2 bg-background/50 rounded-lg flex-1">
                  {formattedPrev}
                </pre>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground italic py-8">
                  None (Record was newly created)
                </div>
              )}
            </div>

            {/* New State */}
            <div className="flex flex-col rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 overflow-hidden">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-500/20 text-xs font-semibold text-emerald-600">
                <span>New State (After Mutation)</span>
                {formattedNext ? <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600">Mutated</Badge> : null}
              </div>
              {formattedNext ? (
                <pre className="text-xs font-mono text-foreground/80 overflow-x-auto whitespace-pre-wrap p-2 bg-background/50 rounded-lg flex-1">
                  {formattedNext}
                </pre>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground italic py-8">
                  None (Record was permanently deleted)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="border-t pt-3 flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Cryptographically sealed compliance log</span>
          </div>
          <span className="font-mono text-[11px]">Log ID: {log.id}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

