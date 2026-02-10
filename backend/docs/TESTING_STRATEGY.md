# SmartProperty AI - Testing Strategy

## Test Pyramid & Coverage Goals

1. **Unit Tests (SmartPropertyAI.UnitTests)**:
   - Target: >85% coverage on Application and Domain logic.
   - Focus:
     * Entity business rules and state transition validation.
     * FluentValidation rules (register, login, maintenance creation).
     * Conversational form slot extraction and missing field detection.
     * Idempotency token validation.

2. **Integration Tests (SmartPropertyAI.IntegrationTests)**:
   - Target: 100% of API endpoints covered.
   - Framework: `Microsoft.AspNetCore.Mvc.Testing` (`WebApplicationFactory`).
   - Database: Test PostgreSQL instance or isolated schema per test run.
   - AI Mocking: `MockAiProvider` returns deterministic canned responses without external internet dependencies.
   - Core Integration Suites:
     * `AuthFlowIntegrationTests`: Register -> Login -> Refresh -> Revoke.
     * `RoleAuthorizationMatrixTests`: Matrix of endpoints across Admin, Staff, Resident.
     * `MaintenanceWorkflowTests`: Create -> Assign -> InProgress -> Resolve -> Close.
     * `AiChatFlowTests`: Multi-turn dialog -> Confirmation -> Ticket creation.

3. **Security & Prompt Injection Tests**:
   - Injection payloads designed to test role elevation, data extraction, and tool bypass.
   - Asserts that backend rejects malformed AI tool invocations.

