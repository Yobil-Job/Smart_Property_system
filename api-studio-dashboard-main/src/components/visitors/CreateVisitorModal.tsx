import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCheck, Phone, Calendar, Clock, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface CreateVisitorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateVisitorModal({ open, onOpenChange }: CreateVisitorModalProps) {
  const queryClient = useQueryClient();

  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [purpose, setPurpose] = useState("Personal Visit");

  // Default times: 1 hour from now for 3 hours
  const now = new Date();
  const defaultArr = new Date(now.getTime() + 3600_000);
  const defaultDep = new Date(now.getTime() + 4 * 3600_000);

  const toInputDate = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [expectedArrival, setExpectedArrival] = useState(toInputDate(defaultArr));
  const [expectedDeparture, setExpectedDeparture] = useState(toInputDate(defaultDep));

  const setPreset = (type: "today" | "tonight" | "tomorrow") => {
    const d = new Date();
    if (type === "today") {
      d.setHours(d.getHours() + 1, 0, 0, 0);
      setExpectedArrival(toInputDate(d));
      setExpectedDeparture(toInputDate(new Date(d.getTime() + 3 * 3600_000)));
    } else if (type === "tonight") {
      d.setHours(18, 0, 0, 0);
      setExpectedArrival(toInputDate(d));
      setExpectedDeparture(toInputDate(new Date(d.getTime() + 4 * 3600_000)));
    } else if (type === "tomorrow") {
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
      setExpectedArrival(toInputDate(d));
      setExpectedDeparture(toInputDate(new Date(d.getTime() + 4 * 3600_000)));
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      return apiClient.post("/visitors", {
        visitorName,
        visitorPhone,
        purpose,
        expectedArrival: new Date(expectedArrival).toISOString(),
        expectedDeparture: new Date(expectedDeparture).toISOString(),
      });
    },
    onSuccess: () => {
      toast.success("Visitor pass registered successfully!");
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["residentDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["staffDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      setVisitorName("");
      setVisitorPhone("");
      setPurpose("Personal Visit");
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to pre-register visitor");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName || !visitorPhone) {
      toast.error("Please enter the visitor's full name and phone number.");
      return;
    }
    if (new Date(expectedDeparture) <= new Date(expectedArrival)) {
      toast.error("Expected departure must be after expected arrival time.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <span>Pre-Register Visitor Pass</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Generate an authorized guest access pass for security desk verification.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Preset Buttons */}
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground uppercase font-bold flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>Quick Arrival Window</span>
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7 flex-1"
                onClick={() => setPreset("today")}
              >
                In 1 Hour
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7 flex-1"
                onClick={() => setPreset("tonight")}
              >
                Tonight (6 PM)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7 flex-1"
                onClick={() => setPreset("tomorrow")}
              >
                Tomorrow Morning
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="v-name">Visitor Full Name *</Label>
            <Input
              id="v-name"
              placeholder="e.g. Alex Johnson"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="v-phone">Mobile Phone *</Label>
              <Input
                id="v-phone"
                placeholder="+1 (555) 000-0000"
                value={visitorPhone}
                onChange={(e) => setVisitorPhone(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="v-purpose">Visit Purpose *</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger id="v-purpose">
                  <SelectValue placeholder="Purpose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Personal Visit">Personal Visit</SelectItem>
                  <SelectItem value="Package Delivery">Package Delivery</SelectItem>
                  <SelectItem value="Contractor / Service">Contractor / Service</SelectItem>
                  <SelectItem value="Family Stay">Family Stay</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="v-arr">Expected Arrival *</Label>
              <Input
                id="v-arr"
                type="datetime-local"
                value={expectedArrival}
                onChange={(e) => setExpectedArrival(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="v-dep">Expected Departure *</Label>
              <Input
                id="v-dep"
                type="datetime-local"
                value={expectedDeparture}
                onChange={(e) => setExpectedDeparture(e.target.value)}
                required
              />
            </div>
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
              <span>Create Pass</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

