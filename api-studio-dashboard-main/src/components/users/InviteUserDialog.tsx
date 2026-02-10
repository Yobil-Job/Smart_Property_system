import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  Role,
  UserSummaryDto,
  PropertySummaryDto,
  PropertyDetailDto,
  ApartmentDetailDto,
  PagedResult,
} from "@/lib/api/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { UserPlus, Loader2, Home, Building2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserDialog({ open, onOpenChange }: InviteUserDialogProps) {
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("TempPass123!");
  const [role, setRole] = useState<Role>("Resident");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Optional Immediate Apartment Assignment
  const [assignNow, setAssignNow] = useState(false);
  const [propertyId, setPropertyId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [apartmentId, setApartmentId] = useState("");
  const [moveInDate, setMoveInDate] = useState(new Date().toISOString().split("T")[0]);
  const [emergencyContact, setEmergencyContact] = useState("");

  // Queries for property hierarchy
  const { data: propertiesData } = useQuery<PagedResult<PropertySummaryDto>>({
    queryKey: ["propertiesInvite"],
    queryFn: () => apiClient.get<PagedResult<PropertySummaryDto>>("/properties", { pageSize: 100 }),
    enabled: open && role === "Resident" && assignNow,
  });

  const { data: propertyDetail } = useQuery<PropertyDetailDto>({
    queryKey: ["propertyDetailInvite", propertyId],
    queryFn: () => apiClient.get<PropertyDetailDto>(`/properties/${propertyId}`),
    enabled: !!propertyId,
  });

  const { data: apartmentsData } = useQuery<PagedResult<ApartmentDetailDto>>({
    queryKey: ["buildingApartmentsInvite", buildingId],
    queryFn: () => apiClient.get<PagedResult<ApartmentDetailDto>>(`/buildings/${buildingId}/apartments`, { pageSize: 100 }),
    enabled: !!buildingId,
  });

  const rawApartments: ApartmentDetailDto[] = (apartmentsData as unknown as PagedResult<ApartmentDetailDto>)?.items ??
    (Array.isArray(apartmentsData) ? (apartmentsData as unknown as ApartmentDetailDto[]) : []);

  const createMutation = useMutation({
    mutationFn: async (payload: {
      fullName: string;
      email: string;
      password: string;
      role: Role;
      phoneNumber?: string;
    }) => {
      let createdUser: UserSummaryDto;
      try {
        createdUser = await apiClient.post<UserSummaryDto>("/api/v1/users", {
          ...payload,
          initialPassword: payload.password,
        });
      } catch {
        createdUser = await apiClient.post<UserSummaryDto>("/api/v1/auth/users", {
          ...payload,
          initialPassword: payload.password,
        });
      }

      // If resident and apartment was chosen, assign immediately
      if (payload.role === "Resident" && assignNow && apartmentId && createdUser?.id) {
        try {
          await apiClient.post("/residents", {
            userId: createdUser.id,
            apartmentId,
            moveInDate,
            emergencyContact: emergencyContact.trim() || undefined,
          });
        } catch (assignErr) {
          console.warn("User created, but apartment assignment failed:", assignErr);
        }
      }

      return createdUser;
    },
    onSuccess: (newUser) => {
      if (assignNow && apartmentId) {
        toast.success(`Resident ${newUser.fullName} created and assigned to unit!`);
      } else {
        toast.success(`User ${newUser.fullName} successfully registered!`);
      }
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["residents"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create user account.");
    },
  });

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPassword("TempPass123!");
    setRole("Resident");
    setPhoneNumber("");
    setAssignNow(false);
    setPropertyId("");
    setBuildingId("");
    setApartmentId("");
    setEmergencyContact("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    createMutation.mutate({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      role,
      phoneNumber: phoneNumber.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <UserPlus className="h-5 w-5" />
            <DialogTitle>Provision New User</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Create an authenticated account with immediate role-based permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="user-name" className="text-xs font-semibold">
              Full Name *
            </Label>
            <Input
              id="user-name"
              placeholder="e.g. Marcus Vance"
              className="text-xs"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-email" className="text-xs font-semibold">
              Email Address *
            </Label>
            <Input
              id="user-email"
              type="email"
              placeholder="marcus.vance@example.com"
              className="text-xs"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-role" className="text-xs font-semibold">
              System Role *
            </Label>
            <Select value={role} onValueChange={(val) => setRole(val as Role)}>
              <SelectTrigger id="user-role" className="text-xs">
                <SelectValue placeholder="Select system role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Resident" className="text-xs">Resident (Tenant portal)</SelectItem>
                <SelectItem value="Staff" className="text-xs">Staff (Operations & Maintenance)</SelectItem>
                <SelectItem value="Administrator" className="text-xs">Administrator (Full control)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-phone" className="text-xs font-semibold">
              Phone Number (Optional)
            </Label>
            <Input
              id="user-phone"
              type="tel"
              placeholder="+1 (555) 019-2834"
              className="text-xs"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-pass" className="text-xs font-semibold">
              Temporary Password *
            </Label>
            <Input
              id="user-pass"
              type="text"
              className="text-xs font-mono"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              User will be prompted to reset upon first login.
            </p>
          </div>

          {/* Optional Direct Apartment Assignment for Residents */}
          {role === "Resident" && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-primary" />
                  <div>
                    <span className="text-xs font-bold text-foreground">
                      Assign to Apartment Now
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      Link tenant to a unit immediately upon provisioning
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 text-[11px] px-2"
                  onClick={() => setAssignNow(!assignNow)}
                >
                  {assignNow ? (
                    <>
                      <span>Skip</span>
                      <ChevronUp className="h-3 w-3 ml-1" />
                    </>
                  ) : (
                    <>
                      <span>Select Unit</span>
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </>
                  )}
                </Button>
              </div>

              {assignNow && (
                <div className="space-y-2.5 pt-1 border-t border-primary/10">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Property</Label>
                      <Select
                        value={propertyId}
                        onValueChange={(val) => {
                          setPropertyId(val);
                          setBuildingId("");
                          setApartmentId("");
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs bg-background">
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                        <SelectContent>
                          {(propertiesData?.items ?? []).map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-[10px] text-muted-foreground">Building</Label>
                      <Select
                        value={buildingId}
                        onValueChange={(val) => {
                          setBuildingId(val);
                          setApartmentId("");
                        }}
                        disabled={!propertyId}
                      >
                        <SelectTrigger className="h-7 text-xs bg-background">
                          <SelectValue placeholder="Select building" />
                        </SelectTrigger>
                        <SelectContent>
                          {(propertyDetail?.buildings ?? []).map((b) => (
                            <SelectItem key={b.id} value={b.id} className="text-xs">
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {buildingId && (
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Apartment Unit</Label>
                      <Select value={apartmentId} onValueChange={setApartmentId}>
                        <SelectTrigger className="h-7 text-xs bg-background">
                          <SelectValue placeholder="Select vacant unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {rawApartments.map((a) => (
                            <SelectItem key={a.id} value={a.id} className="text-xs">
                              Unit {a.apartmentNumber} (Floor {a.floor} &bull; {a.occupancyStatus})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Move-in Date</Label>
                      <Input
                        type="date"
                        className="h-7 text-xs bg-background"
                        value={moveInDate}
                        onChange={(e) => setMoveInDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Emergency Contact</Label>
                      <Input
                        placeholder="+1 (555) 000-0000"
                        className="h-7 text-xs bg-background"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs font-semibold gap-1.5 shadow-sm"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{assignNow && apartmentId ? "Provision & Assign Unit" : "Create Account"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
