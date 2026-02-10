// Types mirror the SmartProperty AI API specification (camelCase JSON).
export type Role = "Administrator" | "Staff" | "Resident";

export interface ErrorDetail { field: string; message: string }
export interface ApiResponse<T> { success: boolean; message: string; data: T; errors: ErrorDetail[] }
export interface PagedResult<T> {
  items: T[]; totalCount: number; pageNumber: number; pageSize: number;
  totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean;
}
export interface PageQuery { pageNumber?: number; pageSize?: number }

export interface AuthResponse {
  userId: string; email: string; fullName: string; role: Role;
  accessToken: string; refreshToken: string; expiresAt: string;
}

export interface UserSummaryDto {
  id: string; fullName: string; email: string; role: Role; isActive: boolean;
  phoneNumber?: string | null; createdAt: string;
}

export type PropertyType = "Residential" | "Commercial" | "Mixed";
export interface PropertySummaryDto {
  id: string; name: string; address: string; city: string; country: string;
  propertyType: PropertyType; buildingCount: number; totalApartments: number;
}
export interface BuildingDetailDto {
  id: string; propertyId: string; name: string; description: string; floorCount: number; apartmentCount: number;
}
export interface PropertyDetailDto extends PropertySummaryDto { description: string; buildings: BuildingDetailDto[] }

export type OccupancyStatus = "Vacant" | "Occupied" | "UnderMaintenance" | "Reserved";
export interface ApartmentDetailDto {
  id: string; buildingId: string; apartmentNumber: string; floor: number;
  numberOfBedrooms: number; numberOfBathrooms: number; occupancyStatus: OccupancyStatus;
}

export interface ResidentDetailDto {
  id: string; userId: string; fullName: string; email: string; apartmentId: string;
  apartmentNumber: string; buildingName: string; propertyName: string; moveInDate: string; emergencyContact: string;
}
export interface StaffDetailDto {
  id: string; userId: string; fullName: string; email: string; propertyId: string;
  propertyName: string; employeeNumber: string; position: string;
}

export type MaintenanceCategory = "Plumbing" | "Electrical" | "HVAC" | "Cleaning" | "Security" | "Structural" | "Other";
export type Priority = "Low" | "Medium" | "High" | "Urgent";
export type MaintenanceStatus = "Pending" | "Assigned" | "InProgress" | "Resolved" | "Closed" | "Rejected";

export interface MaintenanceNoteDto {
  id: string; authorName: string; authorRole: Role; noteText: string; isInternalOnly: boolean; createdAt: string;
}
export interface MaintenanceHistoryDto {
  id: string; previousStatus: MaintenanceStatus | null; newStatus: MaintenanceStatus; changeReason: string; changedBy: string; timestamp: string;
}
export interface MaintenanceRequestSummaryDto {
  id: string; ticketNumber: string; title: string; category: MaintenanceCategory; priority: Priority;
  status: MaintenanceStatus; apartmentNumber: string; buildingName: string;
  assignedStaffId: string | null; assignedStaffName: string | null; createdAt: string; updatedAt: string;
}
export interface MaintenanceRequestDetailDto extends MaintenanceRequestSummaryDto {
  residentId: string; residentName: string; apartmentId: string; description: string; imageUrl?: string | null;
  resolvedAt: string | null; notes: MaintenanceNoteDto[]; history: MaintenanceHistoryDto[];
}
export interface CreateMaintenanceRequest {
  title: string; description: string; category: MaintenanceCategory; priority: Priority; imageUrl?: string;
}

export type VisitorStatus = "Pending" | "Approved" | "CheckedIn" | "CheckedOut" | "Rejected";
export interface VisitorDetailDto {
  id: string; residentId: string; residentName: string; apartmentNumber: string; visitorName: string; visitorPhone: string;
  purpose: string; expectedArrival: string; expectedDeparture: string; status: VisitorStatus;
  checkedInAt: string | null; checkedOutAt: string | null; createdAt: string;
}
export interface CreateVisitorRequest {
  visitorName: string; visitorPhone: string; purpose: string; expectedArrival: string; expectedDeparture: string;
}

export interface AdminDashboardDto {
  totalProperties: number; totalBuildings: number; totalApartments: number; overallOccupancyRate: number;
  maintenanceSummary: { pendingTriage: number; assignedInProgress: number; urgentUnassigned: number };
  activeVisitorsOnSite: number; staffOnDutyCount: number;
}
export interface StaffDashboardDto {
  assignedTasksCount: number; urgentTasksCount: number; todaysExpectedVisitorsCount: number;
  tasks: Pick<MaintenanceRequestSummaryDto, "id" | "ticketNumber" | "title" | "apartmentNumber" | "buildingName" | "priority" | "status">[];
}
export interface ResidentDashboardDto {
  residentName: string; apartmentNumber: string; buildingName: string; unreadNotificationCount: number;
  activeMaintenanceRequests: { id: string; title: string; status: MaintenanceStatus; assignedStaffName: string | null; updatedAt: string }[];
  upcomingVisitors: { id: string; visitorName: string; expectedArrival: string; status: VisitorStatus }[];
}

export interface MaintenanceAnalyticsDto {
  totalRequests: number; averageResolutionHours: number; byCategory: Record<string, number>;
  byPriority: Record<string, number>; resolutionRatePercentage: number;
}
export interface VisitorAnalyticsDto {
  totalVisitors: number; approvedCount: number; rejectedCount: number; peakHour: string; averageDurationMinutes: number;
}
export interface OccupancyAnalyticsDto {
  totalUnits: number; occupiedUnits: number; vacantUnits: number; underMaintenanceUnits: number; occupancyPercentage: number;
}

export type NotificationType = "Information" | "StatusChange" | "Assignment" | "Alert";
export interface NotificationDto {
  id: string; userId: string; title: string; message: string; notificationType: NotificationType;
  isRead: boolean; readAt: string | null; createdAt: string;
}

export type ConversationStatus = "Active" | "AwaitingInformation" | "AwaitingConfirmation" | "Executing" | "Completed" | "Cancelled";
export interface AiToolDefinition { name: string; description: string; jsonParametersSchema: string }
export interface PendingAction { actionType: string; summary: string; parameters: Record<string, string> }
export interface ConversationMessageDto { id: string; sender: "User" | "Assistant" | "System"; content: string; createdAt: string }
export interface ConversationSummaryDto { id: string; title: string; status: ConversationStatus; createdAt: string; updatedAt: string }
export interface ConversationWorkflowDto {
  id: string;
  intent: string;
  workflowType: string;
  collectedFieldsJson: string;
  missingFieldsJson: string;
  pendingActionJson?: string | null;
  pendingAction?: PendingAction | null;
  confirmationStatus: string;
  updatedAt: string;
}
export interface ConversationDetailDto extends ConversationSummaryDto {
  role: Role; currentWorkflow: ConversationWorkflowDto | null; messages: ConversationMessageDto[];
}
export interface AiChatResponseDto {
  conversationId: string; replyMessage: string; status: ConversationStatus; requiresConfirmation: boolean; pendingAction: PendingAction | null;
}
export interface ConfirmActionRequestDto { confirmed: boolean; userFeedback?: string; modifiedParameters?: Record<string, string>; }
export interface ConfirmActionResponseDto { actionExecuted: string; entityId: string; status: string; ticketNumber?: string; message: string }

export interface AuditLogSummaryDto {
  id: string; userId: string; userName: string; entityName: string; entityId: string; action: "Create" | "Update" | "Delete"; timestamp: string;
}
export interface AuditLogDetailDto extends AuditLogSummaryDto { previousState: string | null; newState: string | null }

export interface HealthDto { status: string; totalDuration: string; entries: Record<string, { status: string; description: string | null }> }
export interface SystemStatusDto { service: string; version: string; environment: string; serverUtcTime: string; isOperational: boolean }

export interface VisualDiagnosticRequestDto {
  imageUrl?: string;
  imageBase64?: string;
  description?: string;
  roomLocation?: string;
}

export interface VisualDiagnosticResultDto {
  detectedIssue: string;
  category: MaintenanceCategory;
  recommendedPriority: Priority;
  safetyRiskAssessment: string;
  immediateActionSteps: string[];
  recommendedToolsAndParts: string[];
  confidenceScore: number;
  imageUrl?: string;
}

export interface ImageUploadResponseDto {
  fileUrl: string;
  fileName: string;
  fileSizeBytes: number;
}

export interface AmenityDto {
  id: string;
  propertyId: string;
  propertyName: string;
  name: string;
  description: string;
  imageUrl: string;
  capacity: number;
  openTime: string;
  closeTime: string;
  rulesSummary: string;
  isActive: boolean;
}

export interface AmenitySlotDto {
  startTime: string;
  endTime: string;
  isBooked: boolean;
  bookedBy?: string | null;
}

export interface AmenityAvailabilityDto {
  amenityId: string;
  amenityName: string;
  date: string;
  slots: AmenitySlotDto[];
}

export interface BookAmenityRequestDto {
  bookingDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  purpose: string;
  notes?: string;
}

export interface AmenityBookingDto {
  id: string;
  amenityId: string;
  amenityName: string;
  amenityImageUrl: string;
  residentId: string;
  residentName: string;
  apartmentNumber: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  purpose: string;
  notes?: string | null;
  status: "Confirmed" | "Cancelled" | "Completed";
  createdAt: string;
}
