# SmartProperty AI - System Architecture

## Architectural Pattern: Modular Monolith / Clean Architecture

SmartProperty AI is designed as a Clean Architecture Modular Monolith with strict inbound dependency boundaries:

```
[ Presentation Layer: SmartPropertyAI.API ]
       │                               │
       ▼                               ▼
[ Application Layer: SmartPropertyAI.Application ]
       │                               ▲
       ▼                               │
[ Domain Core: SmartPropertyAI.Domain ] │
       ▲                               │
       │                               │
[ Infrastructure Layer: SmartPropertyAI.Infrastructure ]
```

### Layer Responsibilities

1. **SmartPropertyAI.Domain**:
   - Zero third-party dependencies (no EF Core, no ASP.NET Core, no OpenAI SDK).
   - Contains core entities: `ApplicationUser`, `Property`, `Building`, `Apartment`, `Resident`, `Staff`, `MaintenanceRequest`, `MaintenanceNote`, `MaintenanceHistory`, `Visitor`, `AuditLog`, `Notification`, `Conversation`, `ConversationMessage`, `ConversationWorkflow`.
   - Domain enumerations, value objects, domain exceptions.

2. **SmartPropertyAI.Application**:
   - Depends only on Domain.
   - Use cases, DTOs, service interfaces (`IMaintenanceService`, `IVisitorService`, `IAiOrchestratorService`, `IAiProvider`, `IJwtTokenService`, `ICurrentUserService`).
   - FluentValidation request validators.
   - AI Tool definitions and slot-filling workflows.

3. **SmartPropertyAI.Infrastructure**:
   - Depends on Application and Domain.
   - Entity Framework Core with Npgsql PostgreSQL provider.
   - ASP.NET Core Identity database store.
   - OpenAI API client implementation with resilience, circuit breakers, and token tracking.
   - Serilog structured logging sinks.

4. **SmartPropertyAI.API**:
   - Web API presentation layer with thin controllers.
   - Route convention: `/api/v1`.
   - Global exception handling middleware.
   - JWT authentication and role authorization policies (`RequireAdminRole`, `RequireStaffRole`, `RequireResidentRole`).
   - Swagger / OpenAPI documentation with Bearer security scheme.

