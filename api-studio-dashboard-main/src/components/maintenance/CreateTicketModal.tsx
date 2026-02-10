import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  MaintenanceCategory,
  Priority,
  VisualDiagnosticResultDto,
  ImageUploadResponseDto,
} from "@/lib/api/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wrench,
  Sparkles,
  Camera,
  Upload,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  ShieldAlert,
  ArrowRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface CreateTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const suggestions = [
  "Leaking Kitchen Sink Pipe",
  "AC Blowing Warm Air",
  "Bathroom Drain Clogged",
  "Hallway Light Flickering",
  "Door Lock Sticking",
];

export function CreateTicketModal({ open, onOpenChange }: CreateTicketModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<MaintenanceCategory>("Plumbing");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [description, setDescription] = useState("");
  const [roomLocation, setRoomLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // AI Diagnostic State
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<VisualDiagnosticResultDto | null>(null);

  const resetForm = () => {
    setTitle("");
    setCategory("Plumbing");
    setPriority("Medium");
    setDescription("");
    setRoomLocation("");
    setImageUrl("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setDiagnosticResult(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      // Auto-trigger scan if description or photo is added
      runVisualDiagnosis(file);
    }
  };

  const runVisualDiagnosis = async (fileOverride?: File) => {
    setIsDiagnosing(true);
    try {
      const res = await apiClient.post<VisualDiagnosticResultDto>("/maintenance/diagnose", {
        description: description || title || "Resident maintenance problem inspection",
        roomLocation: roomLocation || "Unit",
        imageUrl: previewUrl || imageUrl || undefined,
      });

      setDiagnosticResult(res);
      setCategory(res.category);
      setPriority(res.recommendedPriority);
      if (!title && res.detectedIssue) {
        setTitle(res.detectedIssue);
      }
      toast.success("AI Facility Diagnostics completed!");
    } catch (err) {
      console.error(err);
      toast.error("Visual diagnostic could not complete. Proceeding with manual input.");
    } finally {
      setIsDiagnosing(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      let finalImageUrl = imageUrl.trim() || undefined;

      // If a local image file was uploaded, upload it to the backend first
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const uploadRes = await apiClient.post<ImageUploadResponseDto>("/maintenance/upload", formData);
        finalImageUrl = uploadRes.fileUrl;
      }

      return apiClient.post("/maintenance", {
        title,
        category,
        priority,
        description,
        imageUrl: finalImageUrl,
      });
    },
    onSuccess: (res: any) => {
      const ticketNum = res?.ticketNumber ? ` (${res.ticketNumber})` : "";
      toast.success(`Maintenance request submitted${ticketNum}!`);
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["residentDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["staffDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to report issue");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      toast.error("Please enter a title and description.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            <span>Report Maintenance & AI Vision Diagnostics</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Snap or upload a photo for autonomous severity triage, emergency shut-off steps, and technician dispatch.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Quick Suggestion Chips */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground uppercase font-bold flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>Common Issues (Click to populate)</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => {
                    setTitle(sug);
                    if (sug.includes("Sink") || sug.includes("Drain")) setCategory("Plumbing");
                    else if (sug.includes("AC")) setCategory("HVAC");
                    else if (sug.includes("Light")) setCategory("Electrical");
                    else if (sug.includes("Lock")) setCategory("Security");
                  }}
                  className="text-[11px] bg-muted/60 hover:bg-primary/10 hover:text-primary border border-border/80 px-2.5 py-1 rounded-md transition-colors text-muted-foreground text-left"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Photo Dropzone & Visual Diagnostics */}
          <div className="space-y-2 p-3 rounded-xl border border-dashed border-primary/40 bg-primary/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-primary" />
                <span>Photo Attachment & AI Diagnostic Scan</span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px] gap-1 bg-card hover:bg-primary/10"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3 w-3" />
                <span>Upload Photo</span>
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            {previewUrl && (
              <div className="relative rounded-lg overflow-hidden border border-border bg-card max-h-48 flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Inspection Preview"
                  className="object-contain max-h-48 w-full"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setDiagnosticResult(null);
                  }}
                  className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/80 backdrop-blur-md text-foreground flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-muted-foreground">
                AI Vision analyzes damage severity and safety risks automatically.
              </p>
              <Button
                type="button"
                size="sm"
                variant="default"
                className="h-7 text-[11px] gap-1.5 bg-primary text-primary-foreground"
                disabled={isDiagnosing}
                onClick={() => runVisualDiagnosis()}
              >
                {isDiagnosing ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Analyzing Photo...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    <span>Scan with AI</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* AI Diagnostic Result & Emergency Guidance Card */}
          {diagnosticResult && (
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20 space-y-2.5 animate-in fade-in-50 duration-200">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      {diagnosticResult.detectedIssue}
                    </h4>
                    <span className="text-[10px] text-muted-foreground">
                      Confidence: {(diagnosticResult.confidenceScore * 100).toFixed(0)}% &bull; Category: {diagnosticResult.category}
                    </span>
                  </div>
                </div>
                <Badge
                  variant={diagnosticResult.recommendedPriority === "Urgent" ? "destructive" : "outline"}
                  className="text-[10px] font-bold shrink-0"
                >
                  {diagnosticResult.recommendedPriority} Priority
                </Badge>
              </div>

              {diagnosticResult.safetyRiskAssessment && (
                <div className="text-[11px] text-amber-800 dark:text-amber-200 bg-amber-500/15 p-2 rounded-lg font-medium">
                  {diagnosticResult.safetyRiskAssessment}
                </div>
              )}

              {diagnosticResult.immediateActionSteps.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-amber-500/20 text-xs">
                  <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span>Immediate Action Steps (Before Technician Arrives):</span>
                  </span>
                  <ul className="space-y-1 pl-1 text-[11px] text-muted-foreground">
                    {diagnosticResult.immediateActionSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <ArrowRight className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="tkt-title">Issue Title *</Label>
            <Input
              id="tkt-title"
              placeholder="e.g. Water leaking under bathroom vanity"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tkt-cat">Category *</Label>
              <Select
                value={category}
                onValueChange={(val) => setCategory(val as MaintenanceCategory)}
              >
                <SelectTrigger id="tkt-cat">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Plumbing">Plumbing</SelectItem>
                  <SelectItem value="Electrical">Electrical</SelectItem>
                  <SelectItem value="HVAC">HVAC / Heating / AC</SelectItem>
                  <SelectItem value="Cleaning">Cleaning & Waste</SelectItem>
                  <SelectItem value="Security">Security & Locks</SelectItem>
                  <SelectItem value="Structural">Structural & Windows</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tkt-priority">Urgency Level *</Label>
              <Select
                value={priority}
                onValueChange={(val) => setPriority(val as Priority)}
              >
                <SelectTrigger id="tkt-priority">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low — Routine check</SelectItem>
                  <SelectItem value="Medium">Medium — Standard issue</SelectItem>
                  <SelectItem value="High">High — Needs fast fix</SelectItem>
                  <SelectItem value="Urgent">Urgent — Immediate hazard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tkt-location">Room / Location inside Apartment (optional)</Label>
            <Input
              id="tkt-location"
              placeholder="e.g. Master Bathroom, Kitchen under sink, Balcony door"
              value={roomLocation}
              onChange={(e) => setRoomLocation(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tkt-desc">Description of Problem *</Label>
            <Textarea
              id="tkt-desc"
              placeholder="Provide exact details: where is it located, when did it start, is water actively pooling, etc..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              )}
              <span>Submit Request</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
