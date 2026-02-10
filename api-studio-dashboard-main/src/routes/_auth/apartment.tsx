import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import type {
  ResidentDetailDto,
  PropertySummaryDto,
  PropertyDetailDto,
  ApartmentDetailDto,
  PagedResult,
} from "@/lib/api/types";
import {
  getClaimByEmailOrUserId,
  saveResidencyClaim,
  ResidencyClaim,
} from "@/lib/api/residency-requests";
import {
  Home,
  Building2,
  Calendar,
  Phone,
  Mail,
  User,
  Wrench,
  UserCheck,
  ShieldCheck,
  Sparkles,
  Loader2,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/apartment")({
  component: MyApartmentPage,
});

function MyApartmentPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check active resident profile
  const { data: profile, isLoading, error } = useQuery<ResidentDetailDto>({
    queryKey: ["myResidentProfile"],
    queryFn: async () => {
      try {
        return await apiClient.get<ResidentDetailDto>("/residents/me");
      } catch {
        return await apiClient.get<ResidentDetailDto>("/residents/my-profile");
      }
    },
    retry: 1,
  });

  // State for claiming an apartment if unassigned
  const [claim, setClaim] = useState<ResidencyClaim | undefined>(() =>
    getClaimByEmailOrUserId(user?.email, user?.id)
  );
  const [isEditingClaim, setIsEditingClaim] = useState(false);

  const [claimPropertyId, setClaimPropertyId] = useState("");
  const [claimBuildingId, setClaimBuildingId] = useState("");
  const [claimApartmentId, setClaimApartmentId] = useState("");
  const [claimMoveInDate, setClaimMoveInDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [claimEmergencyPhone, setClaimEmergencyPhone] = useState("");
  const [claimNotes, setClaimNotes] = useState("");
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  // Queries for claim form
  const { data: propertiesData } = useQuery<PagedResult<PropertySummaryDto>>({
    queryKey: ["claimProperties"],
    queryFn: () =>
      apiClient.get<PagedResult<PropertySummaryDto>>("/properties", {
        pageSize: 100,
      }),
    enabled: (!profile || isEditingClaim) && !claim,
  });

  const { data: propertyDetail } = useQuery<PropertyDetailDto>({
    queryKey: ["claimPropertyDetail", claimPropertyId],
    queryFn: () =>
      apiClient.get<PropertyDetailDto>(`/properties/${claimPropertyId}`),
    enabled: !!claimPropertyId,
  });

  const { data: apartmentsData } = useQuery<PagedResult<ApartmentDetailDto>>({
    queryKey: ["claimBuildingApartments", claimBuildingId],
    queryFn: () =>
      apiClient.get<PagedResult<ApartmentDetailDto>>(
        `/buildings/${claimBuildingId}/apartments`,
        { pageSize: 100 }
      ),
    enabled: !!claimBuildingId,
  });

  const rawApartments: ApartmentDetailDto[] =
    (apartmentsData as unknown as PagedResult<ApartmentDetailDto>)?.items ??
    (Array.isArray(apartmentsData)
      ? (apartmentsData as unknown as ApartmentDetailDto[])
      : []);

  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimPropertyId || !claimBuildingId || !claimApartmentId) {
      toast.error("Please select a property, building, and apartment unit.");
      return;
    }

    const selectedProp = propertiesData?.items.find(
      (p) => p.id === claimPropertyId
    );
    const selectedBuilding = propertyDetail?.buildings.find(
      (b) => b.id === claimBuildingId
    );
    const selectedApt = rawApartments.find((a) => a.id === claimApartmentId);

    if (!selectedProp || !selectedBuilding || !selectedApt) {
      toast.error("Invalid selection. Please choose valid property details.");
      return;
    }

    setIsSubmittingClaim(true);
    try {
      const newClaim = saveResidencyClaim({
        userId: user?.id,
        email: user?.email || "",
        fullName: user?.fullName || "",
        phoneNumber: user?.phoneNumber,
        propertyId: claimPropertyId,
        propertyName: selectedProp.name,
        buildingId: claimBuildingId,
        buildingName: selectedBuilding.name,
        apartmentId: claimApartmentId,
        apartmentNumber: selectedApt.apartmentNumber,
        moveInDate: claimMoveInDate,
        emergencyContact: claimEmergencyPhone.trim() || undefined,
        notes: claimNotes.trim() || undefined,
      });

      setClaim(newClaim);
      setIsEditingClaim(false);
      toast.success(
        `Residency claim for Unit ${selectedApt.apartmentNumber} submitted!`
      );
    } catch {
      toast.error("Failed to submit residency claim.");
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">
          Loading your residence details...
        </p>
      </div>
    );
  }

  // --- UNASSIGNED RESIDENT VIEW ---
  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-4">
        {/* If claim already pending */}
        {claim && !isEditingClaim && claim.status === "Pending" ? (
          <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Clock className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      Residency Verification In Progress
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Your claim has been submitted to property management for lease verification.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs font-semibold">
                  Pending Review
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-1">
              <div className="p-4 rounded-xl border border-border bg-card/60 space-y-2.5">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Home className="h-3.5 w-3.5 text-primary" />
                    Requested Apartment
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    Unit {claim.apartmentNumber} &bull; {claim.buildingName}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    Property Community
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {claim.propertyName}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    Move-in Date
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {claim.moveInDate}
                  </span>
                </div>

                {claim.emergencyContact && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      Emergency Phone
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {claim.emergencyContact}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p>
                  Our management staff will review your declared unit and approve your residency. Once approved, your apartment details, maintenance requests, and digital visitor passes will be activated automatically.
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t border-border/50 pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setIsEditingClaim(true)}
              >
                Change Requested Unit
              </Button>
              <Link to="/dashboard">
                <Button variant="outline" size="sm" className="text-xs">
                  Back to Dashboard
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ) : (
          /* Claim Submission Form */
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Home className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">
                    Claim Your Apartment Unit
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Declare which property and apartment you occupy to unlock resident features.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <form onSubmit={handleClaimSubmit}>
              <CardContent className="space-y-3.5 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Property *</Label>
                    <Select
                      value={claimPropertyId}
                      onValueChange={(val) => {
                        setClaimPropertyId(val);
                        setClaimBuildingId("");
                        setClaimApartmentId("");
                      }}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                      <SelectContent>
                        {(propertiesData?.items ?? []).map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.name} ({p.city})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Building *</Label>
                    <Select
                      value={claimBuildingId}
                      onValueChange={(val) => {
                        setClaimBuildingId(val);
                        setClaimApartmentId("");
                      }}
                      disabled={!claimPropertyId}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder={!claimPropertyId ? "Select property first" : "Select building"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(propertyDetail?.buildings ?? []).map((b) => (
                          <SelectItem key={b.id} value={b.id} className="text-xs">
                            {b.name} ({b.apartmentCount} units)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {claimBuildingId && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Apartment Unit *</Label>
                    <Select
                      value={claimApartmentId}
                      onValueChange={setClaimApartmentId}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select your unit number" />
                      </SelectTrigger>
                      <SelectContent>
                        {rawApartments.map((a) => (
                          <SelectItem key={a.id} value={a.id} className="text-xs">
                            Unit {a.apartmentNumber} &bull; Floor {a.floor} ({a.numberOfBedrooms} Bed, {a.numberOfBathrooms} Bath)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Move-in Date *</Label>
                    <Input
                      type="date"
                      className="text-xs"
                      value={claimMoveInDate}
                      onChange={(e) => setClaimMoveInDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Emergency Contact Phone</Label>
                    <Input
                      placeholder="+1 (555) 000-0000"
                      className="text-xs"
                      value={claimEmergencyPhone}
                      onChange={(e) => setClaimEmergencyPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Lease Reference / Notes (optional)</Label>
                  <Input
                    placeholder="e.g. Lease agreement reference number or leasing agent name"
                    className="text-xs"
                    value={claimNotes}
                    onChange={(e) => setClaimNotes(e.target.value)}
                  />
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between border-t border-border pt-3">
                {isEditingClaim ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setIsEditingClaim(false)}
                  >
                    Cancel
                  </Button>
                ) : (
                  <Link to="/dashboard">
                    <Button type="button" variant="ghost" size="sm" className="text-xs">
                      Skip for Now
                    </Button>
                  </Link>
                )}

                <Button
                  type="submit"
                  size="sm"
                  className="text-xs font-semibold shadow-sm"
                  disabled={isSubmittingClaim || !claimApartmentId}
                >
                  {isSubmittingClaim ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  <span>Submit Residence Claim</span>
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </div>
    );
  }

  // --- ACTIVE RESIDENT VIEW (Assigned to Apartment) ---
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-border bg-gradient-to-r from-card to-card/60 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
                <Home className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-bold text-foreground">
                    Unit {profile.apartmentNumber}
                  </h1>
                  <Badge variant="outline" className="text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                    Active Lease
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {profile.buildingName} &bull; {profile.propertyName}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/maintenance">
              <Button size="sm" className="text-xs font-semibold gap-1.5 shadow-sm">
                <Wrench className="h-3.5 w-3.5" />
                <span>Request Maintenance</span>
              </Button>
            </Link>
            <Link to="/visitors">
              <Button size="sm" variant="outline" className="text-xs font-semibold gap-1.5">
                <UserCheck className="h-3.5 w-3.5" />
                <span>Visitor Pass</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Residence Detail Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Unit Floor Plan & Specs */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Home className="h-4 w-4 text-primary" />
              <span>Unit Specifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Floor Level</span>
              <span className="font-semibold text-foreground">Floor {profile.floor}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Bedrooms</span>
              <span className="font-semibold text-foreground">{profile.numberOfBedrooms} Bedrooms</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Bathrooms</span>
              <span className="font-semibold text-foreground">{profile.numberOfBathrooms} Bathrooms</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Lease Status</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">
                {profile.status}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Building & Address Info */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span>Property Address</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Property Community</span>
              <span className="font-semibold text-foreground">{profile.propertyName}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Building Wing</span>
              <span className="font-semibold text-foreground">{profile.buildingName}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Street Address</span>
              <span className="font-semibold text-foreground">{profile.propertyAddress || "500 Ocean Avenue"}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Move-in Date</span>
              <span className="font-semibold text-foreground">{profile.moveInDate}</span>
            </div>
          </CardContent>
        </Card>

        {/* Occupant & Emergency Contacts */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <span>Registered Occupant</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Full Name</span>
              <span className="font-semibold text-foreground">{profile.fullName}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Email Contact</span>
              <span className="font-semibold text-foreground">{profile.email}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-semibold text-foreground">{profile.phoneNumber || "Not registered"}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Emergency Contact</span>
              <span className="font-semibold text-foreground">{profile.emergencyContact || "None listed"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
