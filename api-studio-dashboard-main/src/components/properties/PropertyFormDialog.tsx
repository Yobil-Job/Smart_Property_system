import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PropertyType } from "@/lib/api/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PropertyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
    id?: string;
    name: string;
    propertyType: PropertyType;
    address: string;
    city: string;
    country: string;
    description?: string;
  };
}

export function PropertyFormDialog({
  open,
  onOpenChange,
  initialData,
}: PropertyFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!initialData?.id;

  const [name, setName] = useState(initialData?.name ?? "");
  const [propertyType, setPropertyType] = useState<PropertyType>(
    initialData?.propertyType ?? "Residential"
  );
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [city, setCity] = useState(initialData?.city ?? "");
  const [country, setCountry] = useState(initialData?.country ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");

  React.useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setPropertyType(initialData.propertyType);
      setAddress(initialData.address);
      setCity(initialData.city);
      setCountry(initialData.country);
      setDescription(initialData.description ?? "");
    } else {
      setName("");
      setPropertyType("Residential");
      setAddress("");
      setCity("");
      setCountry("");
      setDescription("");
    }
  }, [initialData, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        propertyType,
        address,
        city,
        country,
        description,
      };

      if (isEditing && initialData?.id) {
        return apiClient.put(`/properties/${initialData.id}`, payload);
      }
      return apiClient.post("/properties", payload);
    },
    onSuccess: () => {
      toast.success(
        isEditing
          ? "Property updated successfully"
          : "New property created successfully"
      );
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save property");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address || !city || !country) {
      toast.error("Please fill in all required fields.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {isEditing ? "Edit Property" : "Add New Property"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditing
              ? "Update physical and organizational details of this property."
              : "Register a residential, commercial, or mixed-use development into the system."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="prop-name">Property Name *</Label>
              <Input
                id="prop-name"
                placeholder="e.g. Skyline Towers"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="prop-type">Property Type *</Label>
              <Select
                value={propertyType}
                onValueChange={(val) => setPropertyType(val as PropertyType)}
              >
                <SelectTrigger id="prop-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Residential">Residential</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                  <SelectItem value="Mixed">Mixed-Use</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prop-address">Physical Address *</Label>
            <Input
              id="prop-address"
              placeholder="e.g. 100 Innovation Way"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prop-city">City *</Label>
              <Input
                id="prop-city"
                placeholder="e.g. San Francisco"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prop-country">Country *</Label>
              <Input
                id="prop-country"
                placeholder="e.g. USA"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prop-desc">Description</Label>
            <Textarea
              id="prop-desc"
              placeholder="Property background, amenities, or notes..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={mutation.isPending}
              className="gap-1.5"
            >
              {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{isEditing ? "Save Changes" : "Create Property"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

