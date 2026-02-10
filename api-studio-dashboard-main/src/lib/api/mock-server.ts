// @ts-nocheck -- mock data layer; strict index checks relaxed here only.
// Mock implementation of every endpoint in the SmartProperty AI spec, routed by method + path.
import { db, save, uid, type TicketRow, type UserRow, type VisitorRow, type ConversationRow } from "./mock-db";
import type {
  ApiResponse, MaintenanceStatus, PagedResult, Role, MaintenanceRequestDetailDto, VisitorDetailDto,
  ConversationDetailDto, PendingAction, AiChatResponseDto,
} from "./types";

export class HttpError extends Error {
  constructor(public status: number, message: string, public errors: { field: string; message: string }[] = []) { super(message); }
}
interface Ctx { params: Record<string, string>; query: URLSearchParams; body: any; user: UserRow | null }
type Handler = (c: Ctx) => unknown;
const routes: { method: string; re: RegExp; keys: string[]; roles?: Role[] | "auth"; handler: Handler; msg?: string }[] = [];
function route(method: string, path: string, roles: Role[] | "auth" | undefined, handler: Handler, msg?: string) {
  const keys: string[] = [];
  const re = new RegExp("^" + path.replace(/\{(\w+)\}/g, (_, k) => { keys.push(k); return "([^/]+)"; }) + "$");
  routes.push({ method, re, keys, roles, handler, msg });
}
const ADMIN: Role[] = ["Administrator"]; const STAFF_ADMIN: Role[] = ["Staff", "Administrator"];
const now = () => new Date().toISOString();

function page<T>(items: T[], q: URLSearchParams): PagedResult<T> {
  const pageNumber = Math.max(1, Number(q.get("pageNumber") ?? 1)); const pageSize = Math.max(1, Number(q.get("pageSize") ?? 20));
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  return { items: items.slice((pageNumber - 1) * pageSize, pageNumber * pageSize), totalCount: items.length, pageNumber, pageSize, totalPages, hasNextPage: pageNumber < totalPages, hasPreviousPage: pageNumber > 1 };
}
const byNewest = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt);
const required = (body: any, fields: string[]) => {
  const errors = fields.filter((f) => body?.[f] === undefined || body?.[f] === null || String(body[f]).trim() === "").map((f) => ({ field: f, message: `${f} is required` }));
  if (errors.length) throw new HttpError(422, "Validation failed", errors);
};
const find = <T,>(v: T | undefined, what: string): T => { if (!v) throw new HttpError(404, `${what} not found`); return v; };
function audit(u: UserRow, entityName: string, entityId: string, action: "Create" | "Update" | "Delete", prev: object | null, next: object | null) {
  db().auditLogs.unshift({ id: uid(), userId: u.id, userName: u.fullName, entityName, entityId, action, timestamp: now(), previousState: prev ? JSON.stringify(prev, null, 2) : null, newState: next ? JSON.stringify(next, null, 2) : null });
}
function notify(userId: string, title: string, message: string, notificationType: "Information" | "StatusChange" | "Assignment" | "Alert") {
  db().notifications.unshift({ id: uid(), userId, title, message, notificationType, isRead: false, readAt: null, createdAt: now() });
}
function authPayload(u: UserRow) {
  return { userId: u.id, email: u.email, fullName: u.fullName, role: u.role, accessToken: `mock.${u.id}.${Date.now()}`, refreshToken: `refresh.${u.id}.${uid()}`, expiresAt: new Date(Date.now() + 3600_000).toISOString() };
}
const userDto = (u: UserRow) => ({ id: u.id, fullName: u.fullName, email: u.email, role: u.role, isActive: u.isActive, phoneNumber: u.phoneNumber, createdAt: u.createdAt });

// ---------- helpers for joins ----------
const aptInfo = (apartmentId: string) => {
  const d = db(); const a = d.apartments.find((x) => x.id === apartmentId); const b = d.buildings.find((x) => x.id === a?.buildingId); const p = d.properties.find((x) => x.id === b?.propertyId);
  return { apartmentNumber: a?.apartmentNumber ?? "—", buildingName: b?.name ?? "—", propertyName: p?.name ?? "—", propertyId: p?.id };
};
const staffName = (staffId: string | null) => { if (!staffId) return null; const s = db().staff.find((x) => x.id === staffId); return db().users.find((u) => u.id === s?.userId)?.fullName ?? null; };
const residentOf = (u: UserRow | null) => db().residents.find((r) => r.userId === u?.id);
const staffOf = (u: UserRow | null) => db().staff.find((s) => s.userId === u?.id);
const ticketSummary = (t: TicketRow) => ({ id: t.id, ticketNumber: t.ticketNumber, title: t.title, category: t.category, priority: t.priority, status: t.status, ...aptInfo(t.apartmentId), assignedStaffId: t.assignedStaffId, assignedStaffName: staffName(t.assignedStaffId), createdAt: t.createdAt, updatedAt: t.updatedAt });
function ticketDetail(t: TicketRow, viewer: UserRow | null): MaintenanceRequestDetailDto {
  const r = db().residents.find((x) => x.id === t.residentId); const ru = db().users.find((u) => u.id === r?.userId);
  return { ...ticketSummary(t), residentId: t.residentId, residentName: ru?.fullName ?? "—", apartmentId: t.apartmentId, description: t.description, imageUrl: t.imageUrl, resolvedAt: t.resolvedAt,
    notes: t.notes.filter((n) => viewer?.role !== "Resident" || !n.isInternalOnly), history: t.history };
}
function visitorDto(v: VisitorRow): VisitorDetailDto {
  const r = db().residents.find((x) => x.id === v.residentId); const u = db().users.find((x) => x.id === r?.userId);
  return { ...v, residentName: u?.fullName ?? "—", apartmentNumber: r ? aptInfo(r.apartmentId).apartmentNumber : "—" };
}
const ticketOwner = (t: TicketRow) => db().users.find((u) => u.id === db().residents.find((r) => r.id === t.residentId)?.userId);

// ---------- Auth ----------
route("POST", "/api/v1/auth/register", undefined, ({ body }) => {
  required(body, ["fullName", "email", "password", "confirmPassword"]);
  if (body.password !== body.confirmPassword) throw new HttpError(400, "Validation failed", [{ field: "confirmPassword", message: "Passwords do not match" }]);
  if (String(body.password).length < 8) throw new HttpError(400, "Validation failed", [{ field: "password", message: "Password must be at least 8 characters" }]);
  if (db().users.some((u) => u.email.toLowerCase() === String(body.email).toLowerCase())) throw new HttpError(409, "Email already registered", [{ field: "email", message: "An account with this email already exists" }]);
  const u: UserRow = { id: uid(), fullName: body.fullName, email: body.email, password: body.password, role: "Resident", isActive: true, phoneNumber: null, createdAt: now() };
  db().users.push(u); notify("u-admin", "New resident registration", `${u.fullName} created a resident account.`, "Information");
  return authPayload(u);
}, "Registration successful");
route("POST", "/api/v1/auth/login", undefined, ({ body }) => {
  required(body, ["email", "password"]);
  const u = db().users.find((x) => x.email.toLowerCase() === String(body.email).toLowerCase() && x.password === body.password);
  if (!u) throw new HttpError(401, "Invalid email or password", [{ field: "credentials", message: "Invalid email or password" }]);
  if (!u.isActive) throw new HttpError(403, "Account is deactivated", [{ field: "account", message: "Contact your administrator" }]);
  return authPayload(u);
}, "Login successful");
route("POST", "/api/v1/auth/refresh", undefined, ({ body }) => {
  const id = String(body?.refreshToken ?? "").split(".")[1]; return authPayload(find(db().users.find((u) => u.id === id), "Session"));
});
route("POST", "/api/v1/auth/revoke", "auth", () => null, "Token revoked successfully");

// ---------- Users ----------
route("GET", "/api/v1/users", ADMIN, ({ query }) => {
  let list = db().users.slice(); const role = query.get("role"); const active = query.get("isActive"); const s = query.get("search")?.toLowerCase();
  if (role) list = list.filter((u) => u.role === role); if (active) list = list.filter((u) => String(u.isActive) === active);
  if (s) list = list.filter((u) => u.fullName.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
  return page(list.sort(byNewest).map(userDto), query);
});
route("GET", "/api/v1/users/{id}", ADMIN, ({ params }) => userDto(find(db().users.find((u) => u.id === params.id), "User")));
route("POST", "/api/v1/users", ADMIN, ({ body, user }) => {
  required(body, ["fullName", "email", "password", "role"]);
  if (db().users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) throw new HttpError(409, "Email already registered", [{ field: "email", message: "Email already in use" }]);
  const u: UserRow = { id: uid(), fullName: body.fullName, email: body.email, password: body.password, role: body.role, isActive: true, phoneNumber: body.phoneNumber || null, createdAt: now() };
  db().users.push(u); audit(user!, "User", u.id, "Create", null, userDto(u)); return userDto(u);
}, "User created");
route("PUT", "/api/v1/users/{id}", ADMIN, ({ params, body, user }) => {
  const u = find(db().users.find((x) => x.id === params.id), "User"); const prev = userDto(u);
  Object.assign(u, { fullName: body.fullName ?? u.fullName, email: body.email ?? u.email, role: body.role ?? u.role, phoneNumber: body.phoneNumber ?? u.phoneNumber });
  audit(user!, "User", u.id, "Update", prev, userDto(u)); return userDto(u);
}, "User updated");
route("PATCH", "/api/v1/users/{id}/toggle-status", ADMIN, ({ params, user }) => {
  const u = find(db().users.find((x) => x.id === params.id), "User"); if (u.id === user!.id) throw new HttpError(400, "You cannot deactivate your own account");
  u.isActive = !u.isActive; audit(user!, "User", u.id, "Update", { isActive: !u.isActive }, { isActive: u.isActive }); return userDto(u);
}, "User status updated");
route("DELETE", "/api/v1/users/{id}", ADMIN, ({ params, user }) => {
  const d = db(); const u = find(d.users.find((x) => x.id === params.id), "User"); if (u.id === user!.id) throw new HttpError(400, "You cannot delete your own account");
  d.users = d.users.filter((x) => x.id !== u.id); audit(user!, "User", u.id, "Delete", userDto(u), null); return null;
}, "User deleted");

// ---------- Properties ----------
const propSummary = (p: (ReturnType<typeof db>)["properties"][number]) => {
  const bs = db().buildings.filter((b) => b.propertyId === p.id);
  return { id: p.id, name: p.name, address: p.address, city: p.city, country: p.country, propertyType: p.propertyType, buildingCount: bs.length, totalApartments: db().apartments.filter((a) => bs.some((b) => b.id === a.buildingId)).length };
};
const buildingDto = (b: (ReturnType<typeof db>)["buildings"][number]) => ({ ...b, apartmentCount: db().apartments.filter((a) => a.buildingId === b.id).length });
route("GET", "/api/v1/properties", "auth", ({ query }) => {
  const s = query.get("search")?.toLowerCase(); let list = db().properties;
  if (s) list = list.filter((p) => [p.name, p.city, p.address].some((x) => x.toLowerCase().includes(s)));
  return page(list.map(propSummary), query);
});
route("GET", "/api/v1/properties/{id}", "auth", ({ params }) => {
  const p = find(db().properties.find((x) => x.id === params.id), "Property");
  return { ...propSummary(p), description: p.description, buildings: db().buildings.filter((b) => b.propertyId === p.id).map(buildingDto) };
});
route("POST", "/api/v1/properties", ADMIN, ({ body, user }) => {
  required(body, ["name", "address", "city", "country", "propertyType"]);
  const p = { id: uid(), name: body.name, description: body.description ?? "", address: body.address, city: body.city, country: body.country, propertyType: body.propertyType };
  db().properties.push(p); audit(user!, "Property", p.id, "Create", null, p); return { ...propSummary(p), description: p.description, buildings: [] };
}, "Property created");
route("GET", "/api/v1/properties/{propertyId}/buildings", "auth", ({ params }) => db().buildings.filter((b) => b.propertyId === params.propertyId).map(buildingDto));
route("POST", "/api/v1/properties/{propertyId}/buildings", ADMIN, ({ params, body, user }) => {
  find(db().properties.find((p) => p.id === params.propertyId), "Property"); required(body, ["name", "floorCount"]);
  const b = { id: uid(), propertyId: params.propertyId, name: body.name, description: body.description ?? "", floorCount: Number(body.floorCount) };
  db().buildings.push(b); audit(user!, "Building", b.id, "Create", null, b); return buildingDto(b);
}, "Building created");
route("GET", "/api/v1/buildings/{buildingId}/apartments", "auth", ({ params }) => db().apartments.filter((a) => a.buildingId === params.buildingId).sort((a, b) => a.floor - b.floor || a.apartmentNumber.localeCompare(b.apartmentNumber)));
route("POST", "/api/v1/buildings/{buildingId}/apartments", ADMIN, ({ params, body, user }) => {
  const b = find(db().buildings.find((x) => x.id === params.buildingId), "Building"); required(body, ["apartmentNumber", "floor"]);
  if (Number(body.floor) > b.floorCount) throw new HttpError(400, "Validation failed", [{ field: "floor", message: `Building only has ${b.floorCount} floors` }]);
  if (db().apartments.some((a) => a.buildingId === b.id && a.apartmentNumber === body.apartmentNumber)) throw new HttpError(409, "Apartment number already exists");
  const a = { id: uid(), buildingId: b.id, apartmentNumber: String(body.apartmentNumber), floor: Number(body.floor), numberOfBedrooms: Number(body.numberOfBedrooms ?? 1), numberOfBathrooms: Number(body.numberOfBathrooms ?? 1), occupancyStatus: "Vacant" as const };
  db().apartments.push(a); audit(user!, "Apartment", a.id, "Create", null, a); return a;
}, "Apartment created");
route("GET", "/api/v1/apartments/{id}", "auth", ({ params }) => find(db().apartments.find((a) => a.id === params.id), "Apartment"));
route("PATCH", "/api/v1/apartments/{id}/status", ADMIN, ({ params, body, user }) => {
  const a = find(db().apartments.find((x) => x.id === params.id), "Apartment");
  const prev = { occupancyStatus: a.occupancyStatus };
  a.occupancyStatus = body.status ?? body.occupancyStatus ?? a.occupancyStatus;
  audit(user!, "Apartment", a.id, "Update", prev, { occupancyStatus: a.occupancyStatus });
  return a;
}, "Apartment status updated");
route("PUT", "/api/v1/apartments/{id}/status", ADMIN, ({ params, body, user }) => {
  const a = find(db().apartments.find((x) => x.id === params.id), "Apartment");
  const prev = { occupancyStatus: a.occupancyStatus };
  a.occupancyStatus = body.status ?? body.occupancyStatus ?? a.occupancyStatus;
  audit(user!, "Apartment", a.id, "Update", prev, { occupancyStatus: a.occupancyStatus });
  return a;
}, "Apartment status updated");

// ---------- Residents & Staff ----------
const residentDto = (r: (ReturnType<typeof db>)["residents"][number]) => { const u = db().users.find((x) => x.id === r.userId); const i = aptInfo(r.apartmentId); return { ...r, fullName: u?.fullName ?? "—", email: u?.email ?? "—", apartmentNumber: i.apartmentNumber, buildingName: i.buildingName, propertyName: i.propertyName }; };
const staffDto = (s: (ReturnType<typeof db>)["staff"][number]) => { const u = db().users.find((x) => x.id === s.userId); return { ...s, fullName: u?.fullName ?? "—", email: u?.email ?? "—", propertyName: db().properties.find((p) => p.id === s.propertyId)?.name ?? "—" }; };
route("POST", "/api/v1/residents", ADMIN, ({ body, user }) => {
  required(body, ["userId", "apartmentId", "moveInDate"]); const d = db();
  const u = find(d.users.find((x) => x.id === body.userId), "User"); if (u.role !== "Resident") throw new HttpError(400, "User must have the Resident role");
  if (d.residents.some((r) => r.userId === u.id)) throw new HttpError(409, "User is already assigned to an apartment");
  const a = find(d.apartments.find((x) => x.id === body.apartmentId), "Apartment"); if (a.occupancyStatus === "Occupied") throw new HttpError(409, "Apartment is already occupied");
  const r = { id: uid(), userId: u.id, apartmentId: a.id, moveInDate: body.moveInDate, emergencyContact: body.emergencyContact ?? "" };
  a.occupancyStatus = "Occupied"; d.residents.push(r); audit(user!, "Resident", r.id, "Create", null, r);
  notify(u.id, "Welcome home!", `You've been assigned to apartment ${a.apartmentNumber}.`, "Information"); return residentDto(r);
}, "Resident assigned");
route("GET", "/api/v1/residents", STAFF_ADMIN, ({ query }) => {
  let list = db().residents.map(residentDto); const p = query.get("propertyId"); const b = query.get("buildingId");
  if (p) list = list.filter((r) => aptInfo(r.apartmentId).propertyId === p);
  if (b) list = list.filter((r) => db().apartments.find((a) => a.id === r.apartmentId)?.buildingId === b);
  return page(list, query);
});
route("GET", "/api/v1/residents/my-profile", ["Resident"], ({ user }) => residentDto(find(residentOf(user), "Resident profile")));
route("GET", "/api/v1/residents/me", ["Resident"], ({ user }) => residentDto(find(residentOf(user), "Resident profile")));
route("GET", "/api/v1/staff/me", ["Staff"], ({ user }) => staffDto(find(staffOf(user), "Staff profile")));
route("POST", "/api/v1/staff", ADMIN, ({ body, user }) => {
  required(body, ["userId", "propertyId", "employeeNumber", "position"]); const d = db();
  const u = find(d.users.find((x) => x.id === body.userId), "User"); if (u.role !== "Staff") throw new HttpError(400, "User must have the Staff role");
  if (d.staff.some((s) => s.userId === u.id)) throw new HttpError(409, "User is already onboarded");
  const s = { id: uid(), userId: u.id, propertyId: body.propertyId, employeeNumber: body.employeeNumber, position: body.position };
  d.staff.push(s); audit(user!, "Staff", s.id, "Create", null, s); return staffDto(s);
}, "Staff onboarded");
route("GET", "/api/v1/staff", ADMIN, ({ query }) => { let list = db().staff.map(staffDto); const p = query.get("propertyId"); if (p) list = list.filter((s) => s.propertyId === p); return page(list, query); });
route("GET", "/api/v1/staff/my-profile", ["Staff"], ({ user }) => staffDto(find(staffOf(user), "Staff profile")));

// ---------- Maintenance ----------
const TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  Pending: ["Assigned", "Rejected", "InProgress"], Assigned: ["InProgress", "Rejected"], InProgress: ["Resolved", "Assigned"], Resolved: ["Closed", "InProgress"], Closed: [], Rejected: [],
};
export const allowedTransitions = (s: MaintenanceStatus) => TRANSITIONS[s];
function filterTickets(list: TicketRow[], q: URLSearchParams) {
  for (const k of ["status", "priority", "category", "assignedStaffId"] as const) { const v = q.get(k); if (v) list = list.filter((t) => t[k] === v); }
  const s = q.get("search")?.toLowerCase(); if (s) list = list.filter((t) => t.title.toLowerCase().includes(s) || t.ticketNumber.toLowerCase().includes(s));
  return list.sort(byNewest);
}
export function createTicket(user: UserRow, body: any) {
  required(body, ["title", "description", "category", "priority"]); const d = db();
  const r = residentOf(user); if (!r) throw new HttpError(400, "You are not assigned to an apartment yet");
  d.ticketSeq += 1; const t: TicketRow = { id: uid(), ticketNumber: `REQ-${String(d.ticketSeq).padStart(6, "0")}`, residentId: r.id, apartmentId: r.apartmentId, title: body.title, description: body.description, category: body.category, priority: body.priority, status: "Pending", imageUrl: body.imageUrl || null, assignedStaffId: null, createdAt: now(), updatedAt: now(), resolvedAt: null, notes: [], history: [{ id: uid(), previousStatus: null, newStatus: "Pending", changeReason: "Ticket submitted", changedBy: user.fullName, timestamp: now() }] };
  d.tickets.unshift(t); audit(user, "MaintenanceRequest", t.id, "Create", null, { ticketNumber: t.ticketNumber, title: t.title, priority: t.priority });
  notify("u-admin", `${t.priority === "Urgent" ? "Urgent ticket" : "New ticket"}: ${t.title}`, `${t.ticketNumber} · ${t.category} · ${aptInfo(t.apartmentId).buildingName} ${aptInfo(t.apartmentId).apartmentNumber}`, t.priority === "Urgent" ? "Alert" : "Information");
  return t;
}
route("POST", "/api/v1/maintenance", "auth", ({ body, user }) => ticketDetail(createTicket(user!, body), user), "Maintenance request submitted");
route("GET", "/api/v1/maintenance", "auth", ({ query, user }) => {
  let list = db().tickets.slice();
  if (user?.role === "Resident") {
    list = list.filter((t) => t.residentId === residentOf(user)?.id);
  }
  return page(filterTickets(list, query).map(ticketSummary), query);
});
route("GET", "/api/v1/maintenance/my-requests", ["Resident"], ({ query, user }) => page(filterTickets(db().tickets.filter((t) => t.residentId === residentOf(user)?.id), query).map(ticketSummary), query));
route("GET", "/api/v1/maintenance/assigned-to-me", ["Staff"], ({ query, user }) => page(filterTickets(db().tickets.filter((t) => t.assignedStaffId === staffOf(user)?.id), query).map(ticketSummary), query));
const getTicket = (id: string, user: UserRow | null) => {
  const t = find(db().tickets.find((x) => x.id === id), "Maintenance request");
  if (user?.role === "Resident" && t.residentId !== residentOf(user)?.id) throw new HttpError(403, "You do not have access to this ticket");
  return t;
};
route("GET", "/api/v1/maintenance/{id}", "auth", ({ params, user }) => ticketDetail(getTicket(params.id, user), user));
route("PATCH", "/api/v1/maintenance/{id}/assign", ADMIN, ({ params, body, user }) => {
  const t = getTicket(params.id, user); required(body, ["staffId"]); const s = find(db().staff.find((x) => x.id === body.staffId), "Staff member");
  if (["Closed", "Rejected", "Resolved"].includes(t.status)) throw new HttpError(400, `Cannot assign a ${t.status} ticket`);
  const prev = t.status; t.assignedStaffId = s.id; t.status = "Assigned"; t.updatedAt = now();
  t.history.push({ id: uid(), previousStatus: prev, newStatus: "Assigned", changeReason: body.assignmentNotes || `Assigned to ${staffName(s.id)}`, changedBy: user!.fullName, timestamp: now() });
  notify(s.userId, `New assignment: ${t.title}`, `${t.priority} ${t.category} ticket ${t.ticketNumber}.`, "Assignment");
  const owner = ticketOwner(t); if (owner) notify(owner.id, `Maintenance Request Assigned: ${t.title}`, `${staffName(s.id)} has been assigned to ${t.ticketNumber}.`, "StatusChange");
  audit(user!, "MaintenanceRequest", t.id, "Update", { status: prev }, { status: "Assigned", assignedStaffId: s.id }); return ticketDetail(t, user);
}, "Staff assigned");
route("PATCH", "/api/v1/maintenance/{id}/status", "auth", ({ params, body, user }) => {
  const t = getTicket(params.id, user);
  const next = (body.status ?? body.newStatus) as MaintenanceStatus;
  if (!next) throw new HttpError(400, "Validation failed", [{ field: "status", message: "status is required" }]);
  if (!TRANSITIONS[t.status].includes(next)) throw new HttpError(400, `Invalid transition from ${t.status} to ${next}`, [{ field: "status", message: `Allowed: ${TRANSITIONS[t.status].join(", ") || "none"}` }]);
  const prev = t.status; t.status = next; t.updatedAt = now(); if (next === "Resolved") t.resolvedAt = now();
  t.history.push({ id: uid(), previousStatus: prev, newStatus: next, changeReason: body.reason || body.comment || `Status changed to ${next}`, changedBy: user!.fullName, timestamp: now() });
  const owner = ticketOwner(t); if (owner) notify(owner.id, `Ticket ${t.ticketNumber} is now ${next}`, body.reason || body.comment || t.title, "StatusChange");
  audit(user!, "MaintenanceRequest", t.id, "Update", { status: prev }, { status: next }); return ticketDetail(t, user);
}, "Status updated");
route("POST", "/api/v1/maintenance/{id}/work-logs", "auth", ({ params, body, user }) => {
  const t = getTicket(params.id, user); required(body, ["noteText"]);
  const n = { id: uid(), authorName: user!.fullName, authorRole: user!.role, noteText: body.noteText, isInternalOnly: user!.role !== "Resident" && !!body.isInternalOnly, createdAt: now() };
  t.notes.push(n); t.updatedAt = now(); return n;
}, "Work log added");
route("POST", "/api/v1/maintenance/{id}/notes", "auth", ({ params, body, user }) => {
  const t = getTicket(params.id, user); required(body, ["noteText"]);
  const n = { id: uid(), authorName: user!.fullName, authorRole: user!.role, noteText: body.noteText, isInternalOnly: user!.role !== "Resident" && !!body.isInternalOnly, createdAt: now() };
  t.notes.push(n); t.updatedAt = now(); return n;
}, "Note added");
route("GET", "/api/v1/maintenance/{id}/history", "auth", ({ params, user }) => getTicket(params.id, user).history);

// ---------- Visitors ----------
export function createVisitor(user: UserRow, body: any) {
  required(body, ["visitorName", "visitorPhone", "purpose", "expectedArrival", "expectedDeparture"]);
  if (new Date(body.expectedDeparture) <= new Date(body.expectedArrival)) throw new HttpError(400, "Validation failed", [{ field: "expectedDeparture", message: "Departure must be after arrival" }]);
  const r = residentOf(user); if (!r) throw new HttpError(400, "You are not assigned to an apartment yet");
  const v: VisitorRow = { id: uid(), residentId: r.id, visitorName: body.visitorName, visitorPhone: body.visitorPhone, purpose: body.purpose, expectedArrival: new Date(body.expectedArrival).toISOString(), expectedDeparture: new Date(body.expectedDeparture).toISOString(), status: "Pending", checkedInAt: null, checkedOutAt: null, createdAt: now() };
  db().visitors.unshift(v); audit(user, "VisitorPass", v.id, "Create", null, { visitorName: v.visitorName }); return v;
}
route("POST", "/api/v1/visitors", "auth", ({ body, user }) => visitorDto(createVisitor(user!, body)), "Visitor pass created");
const filterVisitors = (list: VisitorRow[], q: URLSearchParams) => {
  const s = q.get("status");
  const search = q.get("search")?.toLowerCase();
  let res = list;
  if (s && s !== "All") res = res.filter((v) => v.status === s);
  if (search) res = res.filter((v) => v.visitorName.toLowerCase().includes(search) || v.visitorPhone.includes(search));
  return res.sort(byNewest).map(visitorDto);
};
route("GET", "/api/v1/visitors", "auth", ({ query, user }) => {
  let list = db().visitors.slice();
  if (user?.role === "Resident") {
    list = list.filter((v) => v.residentId === residentOf(user)?.id);
  }
  return page(filterVisitors(list, query), query);
});
route("GET", "/api/v1/visitors/my-visitors", ["Resident"], ({ query, user }) => page(filterVisitors(db().visitors.filter((v) => v.residentId === residentOf(user)?.id), query), query));
route("GET", "/api/v1/visitors/{id}", "auth", ({ params }) => visitorDto(find(db().visitors.find((x) => x.id === params.id), "Visitor pass")));
const visitorAction = (from: string[], to: VisitorRow["status"], stamp?: "checkedInAt" | "checkedOutAt") => ({ params, user }: Ctx) => {
  const v = find(db().visitors.find((x) => x.id === params.id), "Visitor pass");
  if (!from.includes(v.status)) throw new HttpError(400, `Cannot change a ${v.status} pass to ${to}`);
  const prev = v.status; v.status = to; if (stamp) v[stamp] = now();
  const r = db().residents.find((x) => x.id === v.residentId); if (r) notify(r.userId, `Visitor ${v.visitorName}: ${to.replace(/([A-Z])/g, " $1").trim()}`, v.purpose, to === "Rejected" ? "Alert" : "Information");
  audit(user!, "VisitorPass", v.id, "Update", { status: prev }, { status: to }); return visitorDto(v);
};
route("PATCH", "/api/v1/visitors/{id}/approve", STAFF_ADMIN, visitorAction(["Pending"], "Approved"), "Visitor approved");
route("PATCH", "/api/v1/visitors/{id}/reject", STAFF_ADMIN, visitorAction(["Pending", "Approved"], "Rejected"), "Visitor rejected");
route("PATCH", "/api/v1/visitors/{id}/check-in", STAFF_ADMIN, visitorAction(["Pending", "Approved"], "CheckedIn", "checkedInAt"), "Visitor checked in");
route("PATCH", "/api/v1/visitors/{id}/check-out", STAFF_ADMIN, visitorAction(["CheckedIn"], "CheckedOut", "checkedOutAt"), "Visitor checked out");

// ---------- Dashboards ----------
route("GET", "/api/v1/dashboard/admin", ADMIN, () => {
  const d = db(); const occ = d.apartments.filter((a) => a.occupancyStatus === "Occupied").length;
  return { totalProperties: d.properties.length, totalBuildings: d.buildings.length, totalApartments: d.apartments.length, overallOccupancyRate: Math.round((occ / Math.max(1, d.apartments.length)) * 1000) / 10,
    maintenanceSummary: { pendingTriage: d.tickets.filter((t) => t.status === "Pending").length, assignedInProgress: d.tickets.filter((t) => ["Assigned", "InProgress"].includes(t.status)).length, urgentUnassigned: d.tickets.filter((t) => t.priority === "Urgent" && !t.assignedStaffId && !["Closed", "Rejected", "Resolved"].includes(t.status)).length },
    activeVisitorsOnSite: d.visitors.filter((v) => v.status === "CheckedIn").length, staffOnDutyCount: d.staff.filter((s) => d.users.find((u) => u.id === s.userId)?.isActive).length };
}, "Admin dashboard loaded");
route("GET", "/api/v1/dashboard/staff", ["Staff"], ({ user }) => {
  const d = db(); const s = staffOf(user); const mine = d.tickets.filter((t) => t.assignedStaffId === s?.id && ["Assigned", "InProgress"].includes(t.status));
  const today = new Date().toDateString();
  return { assignedTasksCount: mine.length, urgentTasksCount: mine.filter((t) => t.priority === "Urgent").length, todaysExpectedVisitorsCount: d.visitors.filter((v) => new Date(v.expectedArrival).toDateString() === today && v.status !== "Rejected").length,
    tasks: mine.map((t) => { const x = ticketSummary(t); return { id: x.id, ticketNumber: x.ticketNumber, title: x.title, apartmentNumber: x.apartmentNumber, buildingName: x.buildingName, priority: x.priority, status: x.status }; }) };
}, "Staff dashboard loaded");
route("GET", "/api/v1/dashboard/resident", ["Resident"], ({ user }) => {
  const d = db(); const r = residentOf(user); const info = r ? aptInfo(r.apartmentId) : { apartmentNumber: "—", buildingName: "Not assigned" };
  return { residentName: user!.fullName, apartmentNumber: info.apartmentNumber, buildingName: info.buildingName, unreadNotificationCount: d.notifications.filter((n) => n.userId === user!.id && !n.isRead).length,
    activeMaintenanceRequests: d.tickets.filter((t) => t.residentId === r?.id && !["Closed", "Rejected"].includes(t.status)).sort(byNewest).map((t) => ({ id: t.id, title: t.title, status: t.status, assignedStaffName: staffName(t.assignedStaffId), updatedAt: t.updatedAt })),
    upcomingVisitors: d.visitors.filter((v) => v.residentId === r?.id && ["Pending", "Approved", "CheckedIn"].includes(v.status)).map((v) => ({ id: v.id, visitorName: v.visitorName, expectedArrival: v.expectedArrival, status: v.status })) };
}, "Resident dashboard loaded");

// ---------- Analytics ----------
const inProperty = (apartmentId: string, q: URLSearchParams) => { const p = q.get("propertyId"); return !p || aptInfo(apartmentId).propertyId === p; };
route("GET", "/api/v1/analytics/maintenance", ADMIN, ({ query }) => {
  const ts = db().tickets.filter((t) => inProperty(t.apartmentId, query)); const byCategory: Record<string, number> = {}; const byPriority: Record<string, number> = { Urgent: 0, High: 0, Medium: 0, Low: 0 };
  ts.forEach((t) => { byCategory[t.category] = (byCategory[t.category] ?? 0) + 1; byPriority[t.priority]++; });
  const resolved = ts.filter((t) => t.resolvedAt); const avg = resolved.length ? resolved.reduce((s, t) => s + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()) / 3600_000, 0) / resolved.length : 0;
  return { totalRequests: ts.length, averageResolutionHours: Math.round(avg * 10) / 10, byCategory, byPriority, resolutionRatePercentage: ts.length ? Math.round((resolved.length / ts.length) * 1000) / 10 : 0 };
});
route("GET", "/api/v1/analytics/visitors", ADMIN, () => {
  const vs = db().visitors; const done = vs.filter((v) => v.checkedInAt && v.checkedOutAt);
  return { totalVisitors: vs.length, approvedCount: vs.filter((v) => v.status !== "Rejected" && v.status !== "Pending").length, rejectedCount: vs.filter((v) => v.status === "Rejected").length, peakHour: "14:00 - 16:00",
    averageDurationMinutes: done.length ? Math.round(done.reduce((s, v) => s + (new Date(v.checkedOutAt!).getTime() - new Date(v.checkedInAt!).getTime()) / 60000, 0) / done.length * 10) / 10 : 0 };
});
route("GET", "/api/v1/analytics/occupancy", ADMIN, ({ query }) => {
  const as = db().apartments.filter((a) => inProperty(a.id, query)); const c = (s: string) => as.filter((a) => a.occupancyStatus === s).length;
  return { totalUnits: as.length, occupiedUnits: c("Occupied"), vacantUnits: c("Vacant") + c("Reserved"), underMaintenanceUnits: c("UnderMaintenance"), occupancyPercentage: as.length ? Math.round((c("Occupied") / as.length) * 10000) / 100 : 0 };
});

// ---------- Notifications ----------
route("GET", "/api/v1/notifications", "auth", ({ query, user }) => { let list = db().notifications.filter((n) => n.userId === user!.id); if (query.get("unreadOnly") === "true") list = list.filter((n) => !n.isRead); return page(list.sort(byNewest), query); });
const myNote = (id: string, user: UserRow | null) => { const n = find(db().notifications.find((x) => x.id === id), "Notification"); if (n.userId !== user?.id) throw new HttpError(403, "Forbidden"); return n; };
route("PATCH", "/api/v1/notifications/read-all", "auth", ({ user }) => { let markedCount = 0; db().notifications.forEach((n) => { if (n.userId === user!.id && !n.isRead) { n.isRead = true; n.readAt = now(); markedCount++; } }); return { markedCount }; }, "All notifications marked as read");
route("GET", "/api/v1/notifications/{id}", "auth", ({ params, user }) => myNote(params.id, user));
route("PATCH", "/api/v1/notifications/{id}/read", "auth", ({ params, user }) => { const n = myNote(params.id, user); n.isRead = true; n.readAt = n.readAt ?? now(); return n; });

// ---------- AI conversations (rule-based mock orchestration) ----------
const TOOLS: Record<Role, { name: string; description: string; schema: object }[]> = {
  Resident: [
    { name: "create_maintenance_request", description: "Report a new maintenance issue for the resident's apartment.", schema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, category: { enum: ["Plumbing", "Electrical", "HVAC", "Cleaning", "Security", "Structural", "Other"] }, priority: { enum: ["Low", "Medium", "High", "Urgent"] } }, required: ["title", "category", "priority"] } },
    { name: "register_visitor", description: "Pre-register a guest visitor pass.", schema: { type: "object", properties: { visitorName: { type: "string" }, visitorPhone: { type: "string" }, purpose: { type: "string" }, expectedArrival: { type: "string", format: "date-time" } }, required: ["visitorName", "visitorPhone", "expectedArrival"] } },
    { name: "get_my_requests", description: "Summarize the resident's open maintenance tickets.", schema: { type: "object", properties: {} } },
  ],
  Staff: [
    { name: "get_assigned_tasks", description: "List work orders assigned to the current technician.", schema: { type: "object", properties: {} } },
    { name: "get_expected_visitors", description: "List visitors expected on site today.", schema: { type: "object", properties: {} } },
  ],
  Administrator: [
    { name: "get_portfolio_summary", description: "Summarize occupancy, maintenance backlog and visitors.", schema: { type: "object", properties: {} } },
    { name: "list_urgent_unassigned", description: "List urgent tickets awaiting assignment.", schema: { type: "object", properties: {} } },
  ],
};
route("GET", "/api/v1/ai/tools", "auth", ({ user }) => TOOLS[user!.role].map((t) => ({ name: t.name, description: t.description, jsonParametersSchema: JSON.stringify(t.schema) })));
const convDto = (c: ConversationRow, role: Role): ConversationDetailDto => ({ id: c.id, title: c.title, status: c.status, createdAt: c.createdAt, updatedAt: c.updatedAt, role, currentWorkflow: c.pendingAction, messages: c.messages });
const myConv = (id: string, user: UserRow | null) => { const c = find(db().conversations.find((x) => x.id === id && !x.deleted), "Conversation"); if (c.userId !== user?.id) throw new HttpError(403, "Forbidden"); return c; };
route("POST", "/api/v1/ai/conversations", "auth", ({ body, user }) => {
  const c: ConversationRow = { id: uid(), userId: user!.id, title: body?.title || "New conversation", status: "Active", createdAt: now(), updatedAt: now(), deleted: false, messages: [], pendingAction: null, executed: false, slots: {}, intent: null };
  db().conversations.unshift(c); return convDto(c, user!.role);
}, "Conversation started");
route("GET", "/api/v1/ai/conversations", "auth", ({ query, user }) => page(db().conversations.filter((c) => c.userId === user!.id && !c.deleted).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(({ id, title, status, createdAt, updatedAt }) => ({ id, title, status, createdAt, updatedAt })), query));
route("GET", "/api/v1/ai/conversations/{id}", "auth", ({ params, user }) => convDto(myConv(params.id, user), user!.role));
route("DELETE", "/api/v1/ai/conversations/{id}", "auth", ({ params, user }) => { myConv(params.id, user).deleted = true; return { deleted: true }; });
route("POST", "/api/v1/ai/conversations/{id}/cancel", "auth", ({ params, body, user }) => {
  const c = myConv(params.id, user); c.pendingAction = null; c.slots = {}; c.intent = null; c.status = "Cancelled"; c.updatedAt = now();
  c.messages.push({ id: uid(), sender: "System", content: `Action cancelled${body?.reason ? `: ${body.reason}` : "."}`, createdAt: now() }); return { cancelled: true, reason: body?.reason ?? null };
});
route("POST", "/api/v1/ai/conversations/{id}/confirm", "auth", ({ params, body, user }) => {
  const c = myConv(params.id, user); if (c.executed && !c.pendingAction) throw new HttpError(409, "This action has already been executed");
  if (!c.pendingAction) throw new HttpError(400, "There is no pending action to confirm");
  if (!body?.confirmed) { c.pendingAction = null; c.status = "Cancelled"; return { actionExecuted: "None", entityId: "", status: "Declined", message: "Action declined." }; }
  const a = c.pendingAction; let result;
  if (a.actionType === "CreateMaintenanceRequest") { const t = createTicket(user!, a.parameters); result = { actionExecuted: a.actionType, entityId: t.id, status: "Created", ticketNumber: t.ticketNumber, message: `Ticket ${t.ticketNumber} has been created. Our team will triage it shortly.` }; }
  else { const v = createVisitor(user!, a.parameters); result = { actionExecuted: a.actionType, entityId: v.id, status: "Created", message: `Visitor pass for ${v.visitorName} created and sent to the front desk for approval.` }; }
  c.executed = true; c.pendingAction = null; c.slots = {}; c.intent = null; c.status = "Completed"; c.updatedAt = now();
  c.messages.push({ id: uid(), sender: "Assistant", content: `✅ ${result.message}`, createdAt: now() }); return result;
}, "Action executed");
route("POST", "/api/v1/ai/conversations/{id}/confirm-action", "auth", ({ params, body, user }) => {
  const c = myConv(params.id, user); if (c.executed && !c.pendingAction) throw new HttpError(409, "This action has already been executed");
  if (!c.pendingAction) throw new HttpError(400, "There is no pending action to confirm");
  if (!body?.confirmed) { c.pendingAction = null; c.status = "Cancelled"; return { actionExecuted: "None", entityId: "", status: "Declined", message: "Action declined." }; }
  const a = c.pendingAction; let result;
  if (a.actionType === "CreateMaintenanceRequest") { const t = createTicket(user!, a.parameters); result = { actionExecuted: a.actionType, entityId: t.id, status: "Created", ticketNumber: t.ticketNumber, message: `Ticket ${t.ticketNumber} has been created. Our team will triage it shortly.` }; }
  else { const v = createVisitor(user!, a.parameters); result = { actionExecuted: a.actionType, entityId: v.id, status: "Created", message: `Visitor pass for ${v.visitorName} created and sent to the front desk for approval.` }; }
  c.executed = true; c.pendingAction = null; c.slots = {}; c.intent = null; c.status = "Completed"; c.updatedAt = now();
  c.messages.push({ id: uid(), sender: "Assistant", content: `✅ ${result.message}`, createdAt: now() }); return result;
}, "Action executed");
route("POST", "/api/v1/ai/conversations/{id}/messages", "auth", ({ params, body, user }) => {
  const c = myConv(params.id, user); required(body, ["message"]); const text = String(body.message);
  c.messages.push({ id: uid(), sender: "User", content: text, createdAt: now() });
  if (c.title === "New conversation") c.title = text.slice(0, 42) + (text.length > 42 ? "…" : "");
  const res = orchestrate(c, user!, text); c.status = res.status; c.pendingAction = res.pendingAction; c.updatedAt = now();
  c.messages.push({ id: uid(), sender: "Assistant", content: res.replyMessage, createdAt: now() });
  return { conversationId: c.id, ...res };
});

function orchestrate(c: ConversationRow, user: UserRow, text: string): Omit<AiChatResponseDto, "conversationId"> {
  const t = text.toLowerCase(); const d = db();
  const reply = (replyMessage: string, status: AiChatResponseDto["status"] = "Active", pendingAction: PendingAction | null = null) => ({ replyMessage, status, requiresConfirmation: !!pendingAction, pendingAction });
  if (/^(yes|confirm|go ahead|do it)\b/.test(t) && c.pendingAction) return reply("Please press **Confirm** below to execute the action.", "AwaitingConfirmation", c.pendingAction);
  if (user.role === "Administrator") {
    const urgent = d.tickets.filter((x) => x.priority === "Urgent" && !x.assignedStaffId && !["Closed", "Rejected", "Resolved"].includes(x.status));
    if (/urgent|unassigned|triage/.test(t)) return reply(urgent.length ? `There are ${urgent.length} urgent unassigned ticket(s):\n${urgent.map((x) => `• ${x.ticketNumber} — ${x.title}`).join("\n")}\n\nOpen Maintenance to assign a technician.` : "Great news — no urgent tickets are awaiting assignment.");
    const occ = d.apartments.filter((a) => a.occupancyStatus === "Occupied").length;
    return reply(`Here's your portfolio snapshot:\n• ${d.properties.length} properties · ${d.buildings.length} buildings · ${d.apartments.length} units\n• Occupancy: ${Math.round((occ / d.apartments.length) * 100)}%\n• Open tickets: ${d.tickets.filter((x) => !["Closed", "Rejected", "Resolved"].includes(x.status)).length} (${urgent.length} urgent unassigned)\n• Visitors on site: ${d.visitors.filter((v) => v.status === "CheckedIn").length}`);
  }
  if (user.role === "Staff") {
    const s = staffOf(user); const mine = d.tickets.filter((x) => x.assignedStaffId === s?.id && ["Assigned", "InProgress"].includes(x.status));
    if (/visitor|guest/.test(t)) { const today = d.visitors.filter((v) => ["Pending", "Approved"].includes(v.status)); return reply(today.length ? `Expected visitors:\n${today.map((v) => `• ${v.visitorName} — ${v.purpose} (${v.status})`).join("\n")}` : "No visitors are expected right now."); }
    return reply(mine.length ? `You have ${mine.length} active work order(s):\n${mine.map((x) => `• ${x.ticketNumber} [${x.priority}] ${x.title} — ${aptInfo(x.apartmentId).buildingName} ${aptInfo(x.apartmentId).apartmentNumber}`).join("\n")}` : "Your queue is clear. Nice work!");
  }
  // Resident slot-filling
  if (!c.intent) {
    if (/visitor|guest|friend|coming over|pass/.test(t)) c.intent = "visitor";
    else if (/leak|broken|fix|repair|not working|noise|light|ac\b|heat|clog|lock|door|mold|crack|clean|toilet|sink|power|outlet|smell|issue|problem/.test(t)) c.intent = "maintenance";
    else if (/my (tickets|requests)|status/.test(t)) {
      const r = residentOf(user); const open = d.tickets.filter((x) => x.residentId === r?.id && !["Closed", "Rejected"].includes(x.status));
      return reply(open.length ? `Your open requests:\n${open.map((x) => `• ${x.ticketNumber} — ${x.title} (${x.status})`).join("\n")}` : "You have no open maintenance requests.");
    } else return reply("Hi! I can help you **report a maintenance issue**, **register a visitor**, or **check your open requests**. Just describe what you need — e.g. \"My kitchen sink is leaking\".");
  }
  const s = c.slots;
  if (c.intent === "maintenance") {
    if (!s.description) s.description = text;
    const cat = /leak|sink|toilet|pipe|clog|water|drain/.test(t) ? "Plumbing" : /light|power|outlet|electric|switch/.test(t) ? "Electrical" : /ac\b|air con|heat|hvac|cold|hot air|thermostat/.test(t) ? "HVAC" : /lock|door|security|alarm/.test(t) ? "Security" : /crack|wall|ceiling|window|structural/.test(t) ? "Structural" : /clean|trash|mold|smell/.test(t) ? "Cleaning" : null;
    if (cat && !s.category) s.category = cat;
    const pr = /urgent|emergency|flood|asap|immediately|danger/.test(t) ? "Urgent" : /\bhigh\b|heavily|bad|severe/.test(t) ? "High" : /\bmedium\b|moderate/.test(t) ? "Medium" : /\blow\b|minor|whenever|no rush/.test(t) ? "Low" : null;
    if (pr) s.priority = pr;
    if (!s.category) { const m = ["plumbing", "electrical", "hvac", "cleaning", "security", "structural", "other"].find((x) => t.includes(x)); if (m) s.category = m === "hvac" ? "HVAC" : m[0].toUpperCase() + m.slice(1); }
    if (!s.category) return reply("Got it. Which category best fits this issue? (Plumbing, Electrical, HVAC, Cleaning, Security, Structural, Other)", "AwaitingInformation");
    if (!s.priority) return reply(`Thanks — I've classified this as **${s.category}**. How urgent is it? (Low, Medium, High, Urgent)`, "AwaitingInformation");
    const title = s.description.replace(/^(hi|hello|hey)[,!.\s]*/i, "").split(/[.!?]/)[0].slice(0, 70);
    const params = { category: s.category, priority: s.priority, title: title.charAt(0).toUpperCase() + title.slice(1), description: s.description };
    const action = { actionType: "CreateMaintenanceRequest", summary: `${s.priority}-priority ${s.category} ticket: ${params.title}`, parameters: params };
    return reply(`I have prepared your maintenance ticket:\n• Category: ${s.category}\n• Priority: ${s.priority}\n• Issue: ${params.title}\n\nShall I submit it?`, "AwaitingConfirmation", action);
  }
  // visitor
  const name = text.match(/(?:named|name is|guest is|visitor is|friend)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/)?.[1] ?? (c.messages.length > 2 && !s.visitorName && /^[A-Z][a-z]+(\s[A-Z][a-z]+)?$/.test(text.trim()) ? text.trim() : null);
  if (name && !s.visitorName) s.visitorName = name;
  const phone = text.match(/\+?\d[\d\s-]{6,}/)?.[0]; if (phone && !s.visitorPhone) s.visitorPhone = phone.trim();
  const when = /tomorrow/.test(t) ? 24 : /tonight|this evening/.test(t) ? 6 : /today/.test(t) ? 2 : /next week/.test(t) ? 24 * 7 : null;
  if (when && !s.expectedArrival) { const dt = new Date(Date.now() + when * 3600_000); dt.setMinutes(0, 0, 0); s.expectedArrival = dt.toISOString(); s.expectedDeparture = new Date(dt.getTime() + 4 * 3600_000).toISOString(); }
  if (!s.purpose) { const p = text.match(/for (?:a |an )?([a-z ]{3,30})/i)?.[1]; if (p) s.purpose = p.trim(); }
  if (!s.visitorName) return reply("Happy to set up a visitor pass. What's your guest's full name?", "AwaitingInformation");
  if (!s.visitorPhone) return reply(`What's ${s.visitorName}'s phone number?`, "AwaitingInformation");
  if (!s.expectedArrival) return reply("When are they arriving? (e.g. today, tonight, tomorrow, next week)", "AwaitingInformation");
  s.purpose = s.purpose || "Personal visit";
  const action = { actionType: "RegisterVisitor", summary: `Visitor pass for ${s.visitorName}`, parameters: { ...s } };
  return reply(`Here's the visitor pass:\n• Guest: ${s.visitorName}\n• Phone: ${s.visitorPhone}\n• Arrival: ${new Date(s.expectedArrival).toLocaleString()}\n• Purpose: ${s.purpose}\n\nShall I submit it?`, "AwaitingConfirmation", action);
}

// ---------- Audit & system ----------
route("GET", "/api/v1/audit-logs", ADMIN, ({ query }) => {
  let list = db().auditLogs.slice(); const e = query.get("entityName"); const a = query.get("action");
  if (e) list = list.filter((x) => x.entityName === e); if (a) list = list.filter((x) => x.action === a);
  return page(list.sort((x, y) => y.timestamp.localeCompare(x.timestamp)).map(({ previousState: _p, newState: _n, ...rest }) => rest), query);
});
route("GET", "/api/v1/audit-logs/{id}", ADMIN, ({ params }) => find(db().auditLogs.find((x) => x.id === params.id), "Audit log"));
route("GET", "/health", undefined, () => ({ status: "Healthy", totalDuration: "00:00:00.0051234", entries: { postgresql: { status: "Healthy", description: null }, mockServer: { status: "Healthy", description: "In-browser mock" } } }));
route("GET", "/api/v1/system/status", undefined, () => ({ service: "SmartProperty AI Web API", version: "1.0.0", environment: "Mock (in-browser)", serverUtcTime: now(), isOperational: true }));

// ---------- dispatcher ----------
export function handleMock(method: string, path: string, query: URLSearchParams, body: unknown, token: string | null): ApiResponse<unknown> | unknown {
  for (const r of routes) {
    if (r.method !== method) continue; const m = path.match(r.re); if (!m) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    let user: UserRow | null = null;
    if (token) { const id = token.split(".")[1]; user = db().users.find((u) => u.id === id) ?? null; }
    if (r.roles) {
      if (!user) throw new HttpError(401, "Authentication required");
      if (!user.isActive) throw new HttpError(403, "Account is deactivated");
      if (r.roles !== "auth" && !r.roles.includes(user.role)) throw new HttpError(403, "You do not have permission to perform this action");
    }
    const data = r.handler({ params, query, body, user }); save();
    if (path === "/health") return data;
    return { success: true, message: r.msg ?? "Records retrieved successfully", data, errors: [] };
  }
  throw new HttpError(404, `No route for ${method} ${path}`);
}
