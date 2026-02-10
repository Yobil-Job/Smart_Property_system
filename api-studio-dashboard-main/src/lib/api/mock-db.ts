// @ts-nocheck -- mock data layer; strict index checks relaxed here only.
// In-browser mock backend state, persisted to localStorage so demo changes survive reloads.
import type {
  MaintenanceCategory, MaintenanceHistoryDto, MaintenanceNoteDto, MaintenanceStatus, NotificationType,
  OccupancyStatus, PendingAction, Priority, PropertyType, Role, VisitorStatus, ConversationStatus, ConversationMessageDto,
} from "./types";

export interface UserRow { id: string; fullName: string; email: string; password: string; role: Role; isActive: boolean; phoneNumber: string | null; createdAt: string }
export interface PropertyRow { id: string; name: string; description: string; address: string; city: string; country: string; propertyType: PropertyType }
export interface BuildingRow { id: string; propertyId: string; name: string; description: string; floorCount: number }
export interface ApartmentRow { id: string; buildingId: string; apartmentNumber: string; floor: number; numberOfBedrooms: number; numberOfBathrooms: number; occupancyStatus: OccupancyStatus }
export interface ResidentRow { id: string; userId: string; apartmentId: string; moveInDate: string; emergencyContact: string }
export interface StaffRow { id: string; userId: string; propertyId: string; employeeNumber: string; position: string }
export interface TicketRow {
  id: string; ticketNumber: string; residentId: string; apartmentId: string; title: string; description: string;
  category: MaintenanceCategory; priority: Priority; status: MaintenanceStatus; imageUrl: string | null;
  assignedStaffId: string | null; createdAt: string; updatedAt: string; resolvedAt: string | null;
  notes: MaintenanceNoteDto[]; history: MaintenanceHistoryDto[];
}
export interface VisitorRow {
  id: string; residentId: string; visitorName: string; visitorPhone: string; purpose: string; expectedArrival: string;
  expectedDeparture: string; status: VisitorStatus; checkedInAt: string | null; checkedOutAt: string | null; createdAt: string;
}
export interface NotificationRow { id: string; userId: string; title: string; message: string; notificationType: NotificationType; isRead: boolean; readAt: string | null; createdAt: string }
export interface ConversationRow {
  id: string; userId: string; title: string; status: ConversationStatus; createdAt: string; updatedAt: string; deleted: boolean;
  messages: ConversationMessageDto[]; pendingAction: PendingAction | null; executed: boolean; slots: Record<string, string>; intent: string | null;
}
export interface AuditRow { id: string; userId: string; userName: string; entityName: string; entityId: string; action: "Create" | "Update" | "Delete"; timestamp: string; previousState: string | null; newState: string | null }

export interface Db {
  version: number; users: UserRow[]; properties: PropertyRow[]; buildings: BuildingRow[]; apartments: ApartmentRow[];
  residents: ResidentRow[]; staff: StaffRow[]; tickets: TicketRow[]; visitors: VisitorRow[];
  notifications: NotificationRow[]; conversations: ConversationRow[]; auditLogs: AuditRow[]; ticketSeq: number;
}

const KEY = "smartproperty.mockdb.v1";
export const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const hoursAhead = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

function seed(): Db {
  const users: UserRow[] = [
    { id: "u-admin", fullName: "System Administrator", email: "admin@smartproperty.ai", password: "AdminPassword123!", role: "Administrator", isActive: true, phoneNumber: "+1 555 010 0001", createdAt: hoursAgo(24 * 200) },
    { id: "u-marcus", fullName: "Marcus Webb", email: "marcus@smartproperty.ai", password: "StaffPassword123!", role: "Staff", isActive: true, phoneNumber: "+1 555 010 0102", createdAt: hoursAgo(24 * 150) },
    { id: "u-priya", fullName: "Priya Raman", email: "priya@smartproperty.ai", password: "StaffPassword123!", role: "Staff", isActive: true, phoneNumber: "+1 555 010 0103", createdAt: hoursAgo(24 * 120) },
    { id: "u-diego", fullName: "Diego Alvarez", email: "diego@smartproperty.ai", password: "StaffPassword123!", role: "Staff", isActive: false, phoneNumber: null, createdAt: hoursAgo(24 * 90) },
    { id: "u-clara", fullName: "Clara Resident", email: "clara@smartproperty.ai", password: "ResidentPassword123!", role: "Resident", isActive: true, phoneNumber: "+1 555 020 0801", createdAt: hoursAgo(24 * 60) },
    { id: "u-james", fullName: "James Okafor", email: "james@example.com", password: "ResidentPassword123!", role: "Resident", isActive: true, phoneNumber: "+1 555 020 0402", createdAt: hoursAgo(24 * 45) },
    { id: "u-lena", fullName: "Lena Fischer", email: "lena@example.com", password: "ResidentPassword123!", role: "Resident", isActive: true, phoneNumber: null, createdAt: hoursAgo(24 * 30) },
    { id: "u-tom", fullName: "Tom Nguyen", email: "tom@example.com", password: "ResidentPassword123!", role: "Resident", isActive: true, phoneNumber: null, createdAt: hoursAgo(24 * 8) },
  ];
  const properties: PropertyRow[] = [
    { id: "p-highland", name: "Highland Park Residences", description: "Garden-side residential community with four towers.", address: "742 Evergreen Terrace", city: "Springfield", country: "USA", propertyType: "Residential" },
    { id: "p-emerald", name: "Emerald Bay Luxury Suites", description: "Waterfront residential units with concierge.", address: "500 Ocean Avenue", city: "Miami", country: "USA", propertyType: "Residential" },
    { id: "p-meridian", name: "Meridian Exchange", description: "Mixed-use retail podium with offices and lofts.", address: "18 Market Street", city: "Chicago", country: "USA", propertyType: "Mixed" },
  ];
  const buildings: BuildingRow[] = [
    { id: "b-south", propertyId: "p-highland", name: "Tower South", description: "Main residential tower", floorCount: 12 },
    { id: "b-north", propertyId: "p-highland", name: "Tower North", description: "Family residences", floorCount: 10 },
    { id: "b-alpha", propertyId: "p-emerald", name: "Tower Alpha", description: "Ocean-facing suites", floorCount: 15 },
    { id: "b-loft", propertyId: "p-meridian", name: "Loft Block", description: "Lofts above retail", floorCount: 6 },
  ];
  const statuses: OccupancyStatus[] = ["Occupied", "Occupied", "Occupied", "Occupied", "Vacant", "Occupied", "UnderMaintenance", "Occupied", "Reserved", "Occupied"];
  const apartments: ApartmentRow[] = [];
  let k = 0;
  for (const b of buildings) {
    for (let f = 1; f <= Math.min(b.floorCount, 8); f++) {
      for (let u = 1; u <= 2; u++) {
        apartments.push({ id: `a-${b.id}-${f}0${u}`, buildingId: b.id, apartmentNumber: `${f}0${u}`, floor: f, numberOfBedrooms: 1 + ((f + u) % 3), numberOfBathrooms: 1 + (u % 2), occupancyStatus: statuses[k++ % statuses.length] });
      }
    }
  }
  const apt = (b: string, n: string) => { const a = apartments.find((x) => x.buildingId === b && x.apartmentNumber === n)!; a.occupancyStatus = "Occupied"; return a.id; };
  const residents: ResidentRow[] = [
    { id: "r-clara", userId: "u-clara", apartmentId: apt("b-south", "801"), moveInDate: "2025-03-01", emergencyContact: "+1 555 999 0001" },
    { id: "r-james", userId: "u-james", apartmentId: apt("b-south", "402"), moveInDate: "2025-07-15", emergencyContact: "+1 555 999 0002" },
    { id: "r-lena", userId: "u-lena", apartmentId: apt("b-alpha", "601"), moveInDate: "2026-01-10", emergencyContact: "+1 555 999 0003" },
  ];
  const staff: StaffRow[] = [
    { id: "s-marcus", userId: "u-marcus", propertyId: "p-highland", employeeNumber: "EMP-88392", position: "Senior HVAC Technician" },
    { id: "s-priya", userId: "u-priya", propertyId: "p-highland", employeeNumber: "EMP-88410", position: "Plumbing Lead" },
    { id: "s-diego", userId: "u-diego", propertyId: "p-emerald", employeeNumber: "EMP-88501", position: "Front Desk Security" },
  ];
  const h = (prev: MaintenanceStatus | null, next: MaintenanceStatus, reason: string, by: string, t: number): MaintenanceHistoryDto => ({ id: uid(), previousStatus: prev, newStatus: next, changeReason: reason, changedBy: by, timestamp: hoursAgo(t) });
  const tickets: TicketRow[] = [
    { id: "t-1", ticketNumber: "REQ-000101", residentId: "r-clara", apartmentId: residents[0].apartmentId, title: "AC unit blowing hot air", description: "The living room AC has been blowing warm air since last night, even on the coldest setting.", category: "HVAC", priority: "Urgent", status: "Assigned", imageUrl: null, assignedStaffId: "s-marcus", createdAt: hoursAgo(20), updatedAt: hoursAgo(18), resolvedAt: null,
      notes: [{ id: uid(), authorName: "Marcus Webb", authorRole: "Staff", noteText: "Will inspect compressor first thing tomorrow.", isInternalOnly: false, createdAt: hoursAgo(17) }, { id: uid(), authorName: "Marcus Webb", authorRole: "Staff", noteText: "Likely refrigerant leak — order part R-410A kit.", isInternalOnly: true, createdAt: hoursAgo(16) }],
      history: [h(null, "Pending", "Ticket submitted", "Clara Resident", 20), h("Pending", "Assigned", "Assigned to HVAC specialist", "System Administrator", 18)] },
    { id: "t-2", ticketNumber: "REQ-000102", residentId: "r-james", apartmentId: residents[1].apartmentId, title: "Kitchen sink leaking under cabinet", description: "Water pools under the sink whenever the tap runs.", category: "Plumbing", priority: "High", status: "InProgress", imageUrl: null, assignedStaffId: "s-priya", createdAt: hoursAgo(50), updatedAt: hoursAgo(5), resolvedAt: null, notes: [],
      history: [h(null, "Pending", "Ticket submitted", "James Okafor", 50), h("Pending", "Assigned", "Assigned to plumbing lead", "System Administrator", 40), h("Assigned", "InProgress", "Beginning pipe replacement", "Priya Raman", 5)] },
    { id: "t-3", ticketNumber: "REQ-000103", residentId: "r-lena", apartmentId: residents[2].apartmentId, title: "Hallway light flickering", description: "Ceiling light in the entry hallway flickers constantly.", category: "Electrical", priority: "Medium", status: "Pending", imageUrl: null, assignedStaffId: null, createdAt: hoursAgo(3), updatedAt: hoursAgo(3), resolvedAt: null, notes: [], history: [h(null, "Pending", "Ticket submitted", "Lena Fischer", 3)] },
    { id: "t-4", ticketNumber: "REQ-000104", residentId: "r-clara", apartmentId: residents[0].apartmentId, title: "Bathroom exhaust fan noisy", description: "Rattling noise from the fan.", category: "Other", priority: "Low", status: "Resolved", imageUrl: null, assignedStaffId: "s-marcus", createdAt: hoursAgo(120), updatedAt: hoursAgo(90), resolvedAt: hoursAgo(90), notes: [],
      history: [h(null, "Pending", "Ticket submitted", "Clara Resident", 120), h("Pending", "Assigned", "Assigned", "System Administrator", 110), h("Assigned", "InProgress", "On site", "Marcus Webb", 96), h("InProgress", "Resolved", "Fan mount tightened", "Marcus Webb", 90)] },
    { id: "t-5", ticketNumber: "REQ-000105", residentId: "r-james", apartmentId: residents[1].apartmentId, title: "Front door lock jammed", description: "Key turns but the latch won't retract.", category: "Security", priority: "Urgent", status: "Pending", imageUrl: null, assignedStaffId: null, createdAt: hoursAgo(1), updatedAt: hoursAgo(1), resolvedAt: null, notes: [], history: [h(null, "Pending", "Ticket submitted", "James Okafor", 1)] },
    { id: "t-6", ticketNumber: "REQ-000106", residentId: "r-lena", apartmentId: residents[2].apartmentId, title: "Balcony glass panel cracked", description: "Hairline crack on lower-left panel.", category: "Structural", priority: "High", status: "Closed", imageUrl: null, assignedStaffId: "s-priya", createdAt: hoursAgo(300), updatedAt: hoursAgo(240), resolvedAt: hoursAgo(250), notes: [],
      history: [h(null, "Pending", "Ticket submitted", "Lena Fischer", 300), h("Pending", "InProgress", "Contractor dispatched", "Priya Raman", 280), h("InProgress", "Resolved", "Panel replaced", "Priya Raman", 250), h("Resolved", "Closed", "Confirmed by resident", "System Administrator", 240)] },
  ];
  const visitors: VisitorRow[] = [
    { id: "v-1", residentId: "r-clara", visitorName: "Sarah Connor", visitorPhone: "+1 555 123 4567", purpose: "Dinner guest", expectedArrival: hoursAhead(26), expectedDeparture: hoursAhead(30), status: "Approved", checkedInAt: null, checkedOutAt: null, createdAt: hoursAgo(5) },
    { id: "v-2", residentId: "r-james", visitorName: "Ace Movers Ltd.", visitorPhone: "+1 555 777 0000", purpose: "Furniture delivery", expectedArrival: hoursAhead(2), expectedDeparture: hoursAhead(4), status: "Pending", checkedInAt: null, checkedOutAt: null, createdAt: hoursAgo(2) },
    { id: "v-3", residentId: "r-lena", visitorName: "Hannah Fischer", visitorPhone: "+49 151 2345", purpose: "Family visit", expectedArrival: hoursAgo(2), expectedDeparture: hoursAhead(6), status: "CheckedIn", checkedInAt: hoursAgo(2), checkedOutAt: null, createdAt: hoursAgo(30) },
    { id: "v-4", residentId: "r-clara", visitorName: "Daniel Park", visitorPhone: "+1 555 444 1212", purpose: "Study session", expectedArrival: hoursAgo(28), expectedDeparture: hoursAgo(24), status: "CheckedOut", checkedInAt: hoursAgo(28), checkedOutAt: hoursAgo(25), createdAt: hoursAgo(50) },
    { id: "v-5", residentId: "r-james", visitorName: "Unknown courier", visitorPhone: "—", purpose: "Unscheduled", expectedArrival: hoursAgo(10), expectedDeparture: hoursAgo(9), status: "Rejected", checkedInAt: null, checkedOutAt: null, createdAt: hoursAgo(12) },
  ];
  const n = (userId: string, title: string, message: string, type: NotificationType, t: number, isRead = false): NotificationRow => ({ id: uid(), userId, title, message, notificationType: type, isRead, readAt: isRead ? hoursAgo(t - 1) : null, createdAt: hoursAgo(t) });
  const notifications: NotificationRow[] = [
    n("u-clara", "Maintenance Request Assigned: AC unit blowing hot air", "Marcus Webb has been assigned to your ticket REQ-000101.", "StatusChange", 18),
    n("u-clara", "Visitor pass approved", "Sarah Connor's pass for tomorrow was approved by the front desk.", "Information", 4),
    n("u-clara", "Water shut-off notice", "Tower South water will be off Thursday 10:00–12:00 for valve servicing.", "Alert", 30),
    n("u-clara", "Ticket REQ-000104 resolved", "Your exhaust fan issue was marked resolved.", "StatusChange", 90, true),
    n("u-marcus", "New assignment: AC unit blowing hot air", "Urgent HVAC ticket REQ-000101 in Tower South 801.", "Assignment", 18),
    n("u-marcus", "Shift reminder", "Your on-call shift begins at 18:00.", "Information", 6),
    n("u-admin", "Urgent ticket unassigned", "REQ-000105 (Security, Urgent) is awaiting triage.", "Alert", 1),
    n("u-admin", "New resident registration", "Tom Nguyen created a resident account.", "Information", 190, true),
  ];
  const a = (u: UserRow, entity: string, id: string, action: AuditRow["action"], t: number, prev: object | null, next: object | null): AuditRow => ({ id: uid(), userId: u.id, userName: u.fullName, entityName: entity, entityId: id, action, timestamp: hoursAgo(t), previousState: prev ? JSON.stringify(prev, null, 2) : null, newState: next ? JSON.stringify(next, null, 2) : null });
  const auditLogs: AuditRow[] = [
    a(users[0], "MaintenanceRequest", "t-1", "Update", 18, { status: "Pending", assignedStaffId: null }, { status: "Assigned", assignedStaffId: "s-marcus" }),
    a(users[2], "MaintenanceRequest", "t-2", "Update", 5, { status: "Assigned" }, { status: "InProgress" }),
    a(users[0], "Property", "p-meridian", "Create", 400, null, { name: "Meridian Exchange", propertyType: "Mixed" }),
    a(users[0], "User", "u-diego", "Update", 72, { isActive: true }, { isActive: false }),
  ];
  return { version: 1, users, properties, buildings, apartments, residents, staff, tickets, visitors, notifications, conversations: [], auditLogs, ticketSeq: 106 };
}

let cache: Db | null = null;
export function db(): Db {
  if (cache) return cache;
  if (typeof window !== "undefined") {
    try { const raw = localStorage.getItem(KEY); if (raw) { cache = JSON.parse(raw) as Db; return cache; } } catch { /* ignore corrupt state */ }
  }
  cache = seed();
  return cache;
}
export function save() { if (cache && typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(cache)); }
export function resetDb() { cache = seed(); save(); }
