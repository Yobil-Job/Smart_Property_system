import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import type {
  AmenityDto,
  AmenityAvailabilityDto,
  AmenityBookingDto,
  BookAmenityRequestDto,
} from "@/lib/api/types";
import {
  Sparkles,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Plus,
  Info,
  ShieldCheck,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/amenities/")({
  component: AmenitiesPage,
});

function AmenitiesPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const isResident = role === "Resident";

  const [activeTab, setActiveTab] = useState<"explore" | "my-bookings">("explore");
  const [selectedAmenity, setSelectedAmenity] = useState<AmenityDto | null>(null);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  // Booking Form State
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const [bookingDate, setBookingDate] = useState<string>(tomorrowStr);
  const [startTime, setStartTime] = useState<string>("14:00");
  const [endTime, setEndTime] = useState<string>("16:00");
  const [guestCount, setGuestCount] = useState<number>(2);
  const [purpose, setPurpose] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // 1. Fetch Amenities
  const { data: amenities = [], isLoading: isLoadingAmenities } = useQuery<AmenityDto[]>({
    queryKey: ["amenities"],
    queryFn: () => apiClient.get<AmenityDto[]>("/amenities"),
  });

  // 2. Fetch Personal Bookings
  const { data: myBookings = [], isLoading: isLoadingBookings } = useQuery<AmenityBookingDto[]>({
    queryKey: ["myBookings"],
    queryFn: () => apiClient.get<AmenityBookingDto[]>("/amenities/my-bookings"),
    enabled: isResident,
  });

  // 3. Fetch Slot Availability for Selected Amenity and Date
  const { data: availability, isLoading: isLoadingAvailability } = useQuery<AmenityAvailabilityDto>({
    queryKey: ["amenityAvailability", selectedAmenity?.id, bookingDate],
    queryFn: () =>
      apiClient.get<AmenityAvailabilityDto>(
        `/amenities/${selectedAmenity?.id}/availability?date=${bookingDate}`
      ),
    enabled: !!selectedAmenity && isBookModalOpen,
  });

  // 4. Booking Mutation
  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAmenity) throw new Error("No amenity selected");
      return apiClient.post(`/amenities/${selectedAmenity.id}/book`, {
        bookingDate,
        startTime,
        endTime,
        guestCount,
        purpose: purpose.trim() || "Social Event",
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Amenity reservation confirmed successfully!");
      queryClient.invalidateQueries({ queryKey: ["myBookings"] });
      queryClient.invalidateQueries({ queryKey: ["amenityAvailability"] });
      setIsBookModalOpen(false);
      setActiveTab("my-bookings");
      setPurpose("");
      setNotes("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to book amenity");
    },
  });

  // 5. Cancel Booking Mutation
  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiClient.delete(`/amenities/bookings/${bookingId}`);
    },
    onSuccess: () => {
      toast.info("Reservation cancelled");
      queryClient.invalidateQueries({ queryKey: ["myBookings"] });
      queryClient.invalidateQueries({ queryKey: ["amenityAvailability"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to cancel reservation");
    },
  });

  const openBookModal = (amenity: AmenityDto) => {
    setSelectedAmenity(amenity);
    setGuestCount(Math.min(2, amenity.capacity));
    setIsBookModalOpen(true);
  };

  const activeReservationsCount = myBookings.filter(
    (b) => b.status === "Confirmed" && new Date(b.bookingDate) >= new Date()
  ).length;

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span>Building Amenities & Shared Spaces</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Reserve community facilities, inspect real-time hourly slot availability, and manage private reservations.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-xl border border-border">
          <Button
            size="sm"
            variant={activeTab === "explore" ? "default" : "ghost"}
            className="text-xs h-8"
            onClick={() => setActiveTab("explore")}
          >
            <Building className="h-3.5 w-3.5 mr-1.5" />
            <span>Explore Amenities</span>
          </Button>

          {isResident && (
            <Button
              size="sm"
              variant={activeTab === "my-bookings" ? "default" : "ghost"}
              className="text-xs h-8 relative"
              onClick={() => setActiveTab("my-bookings")}
            >
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              <span>My Reservations</span>
              {activeReservationsCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-primary-foreground text-primary font-bold">
                  {activeReservationsCount}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* TAB 1: Explore Amenities Grid */}
      {activeTab === "explore" && (
        <div className="space-y-4">
          {isLoadingAmenities ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading building amenities...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {amenities.map((amenity) => (
                <Card
                  key={amenity.id}
                  className="overflow-hidden border border-border bg-card flex flex-col hover:shadow-md transition-shadow rounded-2xl"
                >
                  {/* Amenity Hero Image */}
                  <div className="relative h-48 w-full bg-muted overflow-hidden">
                    <img
                      src={amenity.imageUrl}
                      alt={amenity.name}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <Badge className="bg-background/80 backdrop-blur-md text-foreground border-border text-[10px] font-bold">
                        <Users className="h-3 w-3 mr-1 text-primary" />
                        <span>Up to {amenity.capacity} Guests</span>
                      </Badge>
                    </div>
                  </div>

                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-bold text-foreground">
                        {amenity.name}
                      </CardTitle>
                      <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span>{amenity.openTime} – {amenity.closeTime}</span>
                      </span>
                    </div>
                    <CardDescription className="text-xs line-clamp-2">
                      {amenity.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 flex-1 pb-4">
                    {amenity.rulesSummary && (
                      <div className="text-[11px] p-2.5 rounded-xl border border-border/70 bg-muted/30 text-muted-foreground flex items-start gap-2">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{amenity.rulesSummary}</span>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-0 border-t border-border/50 p-4 bg-muted/10 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Free for residents &bull; Reservation required
                    </span>
                    <Button
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => openBookModal(amenity)}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Check Availability & Book</span>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: My Personal Reservations */}
      {activeTab === "my-bookings" && (
        <div className="space-y-4">
          {isLoadingBookings ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading your reservations...</p>
            </div>
          ) : myBookings.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card space-y-3">
              <Calendar className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="font-bold text-base text-foreground">No Active Reservations</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                You haven't booked any shared spaces yet. Check out the community amenities to reserve rooftop BBQs, cinema screenings, or pool cabanas!
              </p>
              <Button size="sm" onClick={() => setActiveTab("explore")}>
                Explore Amenities
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myBookings.map((b) => (
                <Card key={b.id} className="border border-border bg-card rounded-2xl overflow-hidden shadow-xs">
                  <div className="h-28 w-full bg-muted relative">
                    <img
                      src={b.amenityImageUrl}
                      alt={b.amenityName}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge
                        variant={b.status === "Confirmed" ? "default" : "secondary"}
                        className="text-[10px] font-bold"
                      >
                        {b.status}
                      </Badge>
                    </div>
                  </div>

                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-bold text-foreground">
                      {b.amenityName}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>{new Date(b.bookingDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                      <span>&bull;</span>
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span>{b.startTime} - {b.endTime}</span>
                    </p>
                  </CardHeader>

                  <CardContent className="p-4 pt-1 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Guests:</span>
                      <span className="font-semibold text-foreground">{b.guestCount} people</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Purpose:</span>
                      <span className="font-semibold text-foreground">{b.purpose}</span>
                    </div>
                    {b.notes && (
                      <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-border">
                        Notes: {b.notes}
                      </p>
                    )}
                  </CardContent>

                  {b.status === "Confirmed" && (
                    <CardFooter className="p-3 bg-muted/20 border-t border-border flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                        disabled={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate(b.id)}
                      >
                        Cancel Reservation
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Reserve Amenity & Real-Time Conflict Resolution */}
      {selectedAmenity && (
        <Dialog open={isBookModalOpen} onOpenChange={setIsBookModalOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>Reserve {selectedAmenity.name}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Operating Hours: {selectedAmenity.openTime} – {selectedAmenity.closeTime} &bull; Max Capacity: {selectedAmenity.capacity} guests
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                bookMutation.mutate();
              }}
              className="space-y-4 py-2"
            >
              {/* Date Selector */}
              <div className="space-y-1.5">
                <Label htmlFor="book-date">Reservation Date *</Label>
                <Input
                  id="book-date"
                  type="date"
                  value={bookingDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setBookingDate(e.target.value)}
                  required
                />
              </div>

              {/* Real-time Hourly Slot Visualizer */}
              <div className="space-y-1.5 p-3 rounded-xl border border-border bg-muted/30">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-primary" />
                  <span>Real-Time Slot Availability ({bookingDate})</span>
                </Label>

                {isLoadingAvailability ? (
                  <div className="py-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Checking calendar conflicts...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 pt-1">
                    {availability?.slots.map((slot) => {
                      const isSelected = startTime === slot.startTime;
                      return (
                        <button
                          key={slot.startTime}
                          type="button"
                          disabled={slot.isBooked}
                          onClick={() => {
                            setStartTime(slot.startTime);
                            setEndTime(slot.endTime);
                          }}
                          className={`p-1.5 rounded-lg border text-[11px] font-mono flex flex-col items-center justify-center transition-all ${
                            slot.isBooked
                              ? "bg-destructive/10 text-destructive/80 border-destructive/30 cursor-not-allowed line-through opacity-75"
                              : isSelected
                              ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                              : "bg-card text-foreground hover:bg-primary/10 hover:border-primary/50"
                          }`}
                        >
                          <span>{slot.startTime}</span>
                          <span className="text-[9px] font-sans">
                            {slot.isBooked ? "Reserved" : "Available"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Time Window Steppers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="start-time">Start Time *</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end-time">End Time *</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Guest Count */}
              <div className="space-y-1.5">
                <Label htmlFor="guest-count">
                  Number of Attendees (Max: {selectedAmenity.capacity}) *
                </Label>
                <Input
                  id="guest-count"
                  type="number"
                  min={1}
                  max={selectedAmenity.capacity}
                  value={guestCount}
                  onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
                  required
                />
              </div>

              {/* Event Purpose */}
              <div className="space-y-1.5">
                <Label htmlFor="purpose">Event Purpose / Occasion *</Label>
                <Input
                  id="purpose"
                  placeholder="e.g. Birthday celebration, EV fast charge, Family gathering"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  required
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">Special Requests / Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g. Need gas grill checked, bringing 2 external guests"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBookModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={bookMutation.isPending}>
                  {bookMutation.isPending && (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>Confirm Reservation</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

