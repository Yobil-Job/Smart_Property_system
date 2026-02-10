import React, { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { apiClient, getFriendlyErrorMessage, getBaseUrl, setCustomApiUrl } from "@/lib/api/client";
import type {
  PropertySummaryDto,
  PropertyDetailDto,
  ApartmentDetailDto,
  PagedResult,
} from "@/lib/api/types";
import { saveResidencyClaim } from "@/lib/api/residency-requests";
import {
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  Loader2,
  Home,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Basic Account State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Optional Property & Apartment Declaration
  const [hasApartmentInfo, setHasApartmentInfo] = useState(false);
  const [propertyId, setPropertyId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [apartmentId, setApartmentId] = useState("");
  const [moveInDate, setMoveInDate] = useState(new Date().toISOString().split("T")[0]);
  const [emergencyContact, setEmergencyContact] = useState("");
  const [residentNotes, setResidentNotes] = useState("");

  // Queries for public property hierarchy (skipAuth: true so anonymous applicants can browse)
  const { data: propertiesData, isLoading: isLoadingProps } = useQuery<PagedResult<PropertySummaryDto>>({
    queryKey: ["propertiesRegister"],
    queryFn: () =>
      apiClient.get<PagedResult<PropertySummaryDto>>("/properties", { pageSize: 100 }, { skipAuth: true }),
    enabled: hasApartmentInfo,
  });

  const { data: propertyDetail, isLoading: isLoadingDetail } = useQuery<PropertyDetailDto>({
    queryKey: ["propertyDetailRegister", propertyId],
    queryFn: () =>
      apiClient.get<PropertyDetailDto>(`/properties/${propertyId}`, undefined, { skipAuth: true }),
    enabled: !!propertyId,
  });

  const { data: apartmentsData, isLoading: isLoadingApts } = useQuery<PagedResult<ApartmentDetailDto>>({
    queryKey: ["buildingApartmentsRegister", buildingId],
    queryFn: () =>
      apiClient.get<PagedResult<ApartmentDetailDto>>(
        `/buildings/${buildingId}/apartments`,
        { pageSize: 100 },
        { skipAuth: true }
      ),
    enabled: !!buildingId,
  });

  const rawApartments: ApartmentDetailDto[] = (apartmentsData as unknown as PagedResult<ApartmentDetailDto>)?.items ??
    (Array.isArray(apartmentsData) ? (apartmentsData as unknown as ApartmentDetailDto[]) : []);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/dashboard" });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !email || !password || !confirmPassword) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter your password.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await register(fullName, email, password, confirmPassword, phoneNumber);

      // If resident declared an apartment claim, save it so Admin/Staff immediately know where to assign them
      if (hasApartmentInfo && propertyId && buildingId && apartmentId) {
        const selectedProp = propertiesData?.items.find((p) => p.id === propertyId);
        const selectedBuilding = propertyDetail?.buildings.find((b) => b.id === buildingId);
        const selectedApt = rawApartments.find((a) => a.id === apartmentId);

        if (selectedProp && selectedBuilding && selectedApt) {
          saveResidencyClaim({
            email: email.trim(),
            fullName: fullName.trim(),
            phoneNumber: phoneNumber.trim() || undefined,
            propertyId,
            propertyName: selectedProp.name,
            buildingId,
            buildingName: selectedBuilding.name,
            apartmentId,
            apartmentNumber: selectedApt.apartmentNumber,
            moveInDate,
            emergencyContact: emergencyContact.trim() || undefined,
            notes: residentNotes.trim() || undefined,
          });
        }
      }

      toast.success("Account created successfully! Welcome to SmartProperty AI.");
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      setErrorMessage(getFriendlyErrorMessage(err, "Registration failed. Please check your information and try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col justify-center items-center px-4 py-8">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-6 text-center space-y-1.5">
        <div className="h-11 w-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
          <Building2 className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          SmartProperty <span className="text-primary">AI</span>
        </h1>
        <p className="text-xs text-muted-foreground max-w-sm">
          Resident Portal Registration & Residence Onboarding
        </p>
      </div>

      <Card className="w-full max-w-lg shadow-lg border-border">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg font-bold">Create Resident Account</CardTitle>
          <CardDescription className="text-xs">
            Join your residential building community to submit maintenance requests and pre-register visitors.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-3">
            {errorMessage && (
              <Alert variant="destructive" className="py-2.5 space-y-2">
                <AlertDescription className="text-xs whitespace-pre-line leading-relaxed">{errorMessage}</AlertDescription>
                <div className="pt-1.5 border-t border-destructive/20 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="opacity-90">API: <code className="font-mono bg-destructive/15 px-1 py-0.5 rounded">{getBaseUrl()}</code></span>
                  <button
                    type="button"
                    onClick={() => {
                      const input = window.prompt("Enter your Render Backend API URL (e.g. https://your-backend.onrender.com/api/v1):", getBaseUrl());
                      if (input && input.trim()) {
                        setCustomApiUrl(input.trim());
                        window.location.reload();
                      }
                    }}
                    className="underline font-bold hover:opacity-100"
                  >
                    Change Backend URL
                  </button>
                </div>
              </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-semibold">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    placeholder="e.g. Jane Doe"
                    className="pl-9 h-8 text-xs"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">Email address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="pl-9 h-8 text-xs"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-semibold">Phone Number (optional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="phone"
                  placeholder="+1 (555) 000-0000"
                  className="pl-9 h-8 text-xs"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9 h-8 text-xs"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold">Confirm Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9 h-8 text-xs"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Optional Apartment Declaration Section */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3 mt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-primary" />
                  <div>
                    <span className="text-xs font-bold text-foreground">
                      Residence Details (Recommended)
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Declare your leased unit so staff can approve your account immediately.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setHasApartmentInfo(!hasApartmentInfo)}
                >
                  {hasApartmentInfo ? (
                    <>
                      <span>Hide</span>
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

              {hasApartmentInfo && (
                <div className="space-y-3 pt-1 border-t border-primary/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium">Property</Label>
                      <Select
                        value={propertyId}
                        onValueChange={(val) => {
                          setPropertyId(val);
                          setBuildingId("");
                          setApartmentId("");
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue placeholder={isLoadingProps ? "Loading properties..." : "Select property"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {(propertiesData?.items ?? []).length === 0 ? (
                            <SelectItem value="none" disabled className="text-xs">
                              {isLoadingProps ? "Loading properties..." : "No properties available"}
                            </SelectItem>
                          ) : (
                            (propertiesData?.items ?? []).map((p) => (
                              <SelectItem key={p.id} value={p.id} className="text-xs">
                                {p.name} ({p.city})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium">Building</Label>
                      <Select
                        value={buildingId}
                        onValueChange={(val) => {
                          setBuildingId(val);
                          setApartmentId("");
                        }}
                        disabled={!propertyId}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue
                            placeholder={
                              !propertyId
                                ? "Pick property first"
                                : isLoadingDetail
                                ? "Loading buildings..."
                                : "Select building"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {(propertyDetail?.buildings ?? []).length === 0 ? (
                            <SelectItem value="none" disabled className="text-xs">
                              No buildings listed
                            </SelectItem>
                          ) : (
                            (propertyDetail?.buildings ?? []).map((b) => (
                              <SelectItem key={b.id} value={b.id} className="text-xs">
                                {b.name} ({b.apartmentCount} units)
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {buildingId && (
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium">Apartment Unit</Label>
                      <Select value={apartmentId} onValueChange={setApartmentId}>
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue placeholder={isLoadingApts ? "Loading units..." : "Select unit number"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {rawApartments.length === 0 ? (
                            <SelectItem value="none" disabled className="text-xs">
                              {isLoadingApts ? "Loading units..." : "No units listed in this building"}
                            </SelectItem>
                          ) : (
                            rawApartments.map((a) => (
                              <SelectItem key={a.id} value={a.id} className="text-xs">
                                Unit {a.apartmentNumber} &bull; Floor {a.floor} ({a.numberOfBedrooms} Bed) — {a.occupancyStatus}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium">Move-in Date</Label>
                      <Input
                        type="date"
                        className="h-8 text-xs bg-background"
                        value={moveInDate}
                        onChange={(e) => setMoveInDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium">Emergency Contact</Label>
                      <Input
                        placeholder="+1 (555) 000-0000"
                        className="h-8 text-xs bg-background"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">Lease Reference or Notes (optional)</Label>
                    <Input
                      placeholder="e.g. Lease #2026-B, signed with building leasing manager"
                      className="h-8 text-xs bg-background"
                      value={residentNotes}
                      onChange={(e) => setResidentNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full mt-2 font-semibold text-xs h-9 shadow-sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Complete Resident Registration"
              )}
            </Button>
          </CardContent>

          <CardFooter className="flex flex-col space-y-2 border-t border-border pt-3">
            <div className="text-center text-xs text-muted-foreground">
              Already registered?{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Sign In to Portal
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
