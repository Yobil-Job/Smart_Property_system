# SmartProperty AI - Project Overview

## Vision & Objective
SmartProperty AI is an enterprise-grade property management platform that enables residents, property administrators, and field staff to manage everyday property operations through both traditional REST APIs and an intelligent, conversational AI assistant.

Instead of navigating complex nested forms and menus, users can report issues, request guest passes, triage work orders, and analyze building performance through natural language. The backend enforces robust authorization, data validation, and idempotency across every AI-triggered action.

## Core Modules
1. **Authentication & Identity**: ASP.NET Core Identity with JWT bearer tokens and rotating refresh tokens.
2. **Property Hierarchy**: Property -> Building -> Apartment -> Resident hierarchy with staff property assignment.
3. **Maintenance Management**: Full work order lifecycle (Pending, Approved, Assigned, InProgress, Resolved, Closed) with history and audit tracking.
4. **Visitor Management**: Pre-registration, authorization, and gate check-in/check-out.
5. **AI Assistant Orchestration**: Intent classification, slot filling, missing field detection, structured JSON generation, role-filtered tool calling, and two-phase user confirmation.
6. **Dashboards & Analytics**: Role-specific dashboards and aggregate performance metrics.
7. **Audit Logging & Notifications**: Complete audit trails of mutations and user notifications.

