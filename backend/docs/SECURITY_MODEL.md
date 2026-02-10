# SmartProperty AI - Security & Authorization Model

## Authentication Architecture
- **Framework**: ASP.NET Core Identity.
- **Tokens**: Signed HMAC-SHA256 JWT access tokens (15-60 min validity).
- **Refresh Tokens**: Cryptographically random strings stored hashed (SHA-256) in PostgreSQL with sliding rotation.
- **Replay Detection**: If a previously revoked refresh token is presented, all active tokens for that user are revoked immediately.

## Role-Based Access Control (RBAC) & Policies
The application defines three primary roles:
1. **Administrator**: Full administrative control across all properties, units, users, tickets, and analytics.
2. **Staff**: Restricted to operational maintenance tickets and visitor passes in their assigned properties.
3. **Resident**: Strictly restricted to their own leased apartment, their own maintenance tickets, and their own visitors.

### Policy Definitions
- `RequireAdminRole`: Evaluates `User.IsInRole("Administrator")`.
- `RequireStaffRole`: Evaluates `User.IsInRole("Staff")`.
- `RequireResidentRole`: Evaluates `User.IsInRole("Resident")`.
- `RequireStaffOrAdminRole`: Evaluates `User.IsInRole("Administrator") || User.IsInRole("Staff")`.

## Resource-Level Authorization
In addition to role checks, resource-level authorization handlers prevent cross-tenant/cross-user data leakage:
- **Maintenance Ownership**: `MaintenanceRequest.ResidentId == CurrentUser.ResidentId`.
- **Apartment Ownership**: A resident can only query apartment details if `Apartment.Id == CurrentResident.ApartmentId`.
- **Visitor Ownership**: A resident can only view/cancel visitors they invited.

## AI Security & Prompt Injection Defenses
- **System Prompt Boundaries**: System prompts strictly forbid revealing internal instructions, database schemas, or executing actions without tool calling.
- **Strict Role-Filtered Toolset**: Tools not permitted for the user's role are omitted from the LLM prompt payload entirely.
- **Server-Side Identity Injection**: AI cannot specify `ResidentId` or `ApartmentId` in tool parameters; backend extracts these directly from `HttpContext.User`.
- **Audit Logging**: Every AI tool invocation creates a permanent, immutable record in `audit_logs`.

