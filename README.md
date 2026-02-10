# SmartProperty AI

An AI-assisted residential property operations platform built with a **.NET 10 Clean Architecture backend** and a **React 19 / TypeScript / TanStack Start frontend**.

SmartProperty AI unifies property administration, maintenance ticketing, visitor access management, shared amenity reservations, operational analytics, and a role-aware conversational AI assistant in a single full-stack system.

---

## Live Deployment

- **Frontend:** https://smartproperty-frontend.onrender.com
- **Backend API:** https://smartproperty-backend.onrender.com
- **Health Check:** https://smartproperty-backend.onrender.com/health/ready

---

## Core Capabilities

- **Role-Based Access Control (RBAC):** Dedicated workflows and permissions for **Administrator**, **Staff**, and **Resident** roles using JWT access & refresh tokens (`ASP.NET Core Identity`).
- **Conversational AI Assistant:** Natural-language assistant powered by an OpenAI-compatible LLM provider (**Groq** / **OpenAI**), supporting intent detection, multi-turn form collection, action confirmation, and role isolation.
- **Maintenance Ticketing:** End-to-end issue reporting with image upload support, technician assignment, status transitions, notes, and full ticket history.
- **Visitor Pass Management:** Resident visitor pre-registration, pass generation, and staff check-in/check-out tracking.
- **Building Amenities:** Amenity directory, hourly slot availability, and reservation management.
- **Dashboards, Analytics & Audit Logs:** Role-specific dashboards, operational metrics with Recharts visualizations, real-time notifications, and immutable audit trails.

---

## Tech Stack

### Backend (`backend/`)
- **Runtime & Framework:** .NET 10, ASP.NET Core Web API
- **Architecture:** Clean Architecture (`Domain`, `Application`, `Infrastructure`, `API`)
- **Database & ORM:** PostgreSQL with Entity Framework Core 10 (`Npgsql`) & automated migrations/seeding
- **Authentication:** JWT Bearer + Refresh Tokens + ASP.NET Core Identity
- **AI Integration:** Configurable `IAiProvider` (`Groq` / `OpenAI` HTTP client with retry/timeout handling, plus `MockAiProvider` for offline testing)
- **Observability:** Serilog structured logging & ASP.NET Core Health Checks (`/health`, `/health/ready`)
- **Testing:** `SmartPropertyAI.UnitTests` & `SmartPropertyAI.IntegrationTests`

### Frontend (`api-studio-dashboard-main/`)
- **Framework:** React 19, TypeScript, TanStack Start + TanStack Router + TanStack Query
- **Styling & UI:** Tailwind CSS v4, Radix UI primitives, Lucide icons, Sonner toasts
- **Forms & Validation:** React Hook Form + Zod
- **Charts:** Recharts
- **Build & Runtime:** Vite 8 + Nitro (`node-server` preset)

---

## Repository Structure

```text
SMARTPROPERTY_AI/
├── backend/
│   ├── Dockerfile
│   ├── SmartPropertyAI.slnx
│   ├── src/
│   │   ├── SmartPropertyAI.Domain/          # Entities, enums, domain exceptions, constants
│   │   ├── SmartPropertyAI.Application/     # DTOs, service interfaces, AI abstractions
│   │   ├── SmartPropertyAI.Infrastructure/  # EF Core DbContext, Identity, AI orchestrator, services
│   │   └── SmartPropertyAI.API/             # Controllers, middleware, Program.cs, Swagger
│   └── tests/
│       ├── SmartPropertyAI.UnitTests/
│       └── SmartPropertyAI.IntegrationTests/
├── api-studio-dashboard-main/
│   ├── public/
│   ├── src/
│   │   ├── components/                      # Feature UI modules & Radix UI primitives
│   │   ├── lib/                             # API client, auth context, utilities
│   │   └── routes/                          # TanStack Router file-based routes
│   ├── package.json
│   └── vite.config.ts
├── render.yaml                              # Render Blueprint (PostgreSQL + Backend + Frontend)
└── DEPLOYMENT_RENDER.md                     # Render deployment guide
```

---

## Local Development

### Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/)
- [Node.js 20+](https://nodejs.org/) (recommended: Node 22)
- [PostgreSQL](https://www.postgresql.org/)

### 1. Backend Setup

```bash
cd backend
```

Create a `backend/.env` file (or configure `appsettings.json` / user secrets):

```env
DB_CONNECTION_STRING=Host=localhost;Port=5432;Database=smartproperty_db;Username=postgres;Password=postgres;
JWT_SECRET_KEY=YourSecureJwtSecretKeyAtLeast32CharactersLong!
JWT_ISSUER=SmartPropertyAI
JWT_AUDIENCE=SmartPropertyAI_Clients

AI_PROVIDER=Groq
GROQ_API_KEY=your_groq_api_key
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=openai/gpt-oss-120b
```

Run the API:

```bash
dotnet restore
dotnet run --project src/SmartPropertyAI.API
```

The API will apply EF Core migrations, seed default roles/accounts on startup, and expose Swagger UI in development.

### 2. Frontend Setup

```bash
cd api-studio-dashboard-main
npm install
```

Set `VITE_API_BASE_URL` (defaults to `http://localhost:5096/api/v1` in local development) and start the dev server:

```bash
npm run dev
```

---

## Testing & Verification

### Backend
```bash
dotnet build backend
dotnet test backend
```

### Frontend
```bash
cd api-studio-dashboard-main
npm run build
npm run test
npm run lint
```

---

## Deployment (Render Blueprint)

This repository includes a [`render.yaml`](render.yaml) Blueprint that provisions:
1. **`smartproperty-db`** — Managed PostgreSQL database
2. **`smartproperty-backend`** — Dockerized .NET 10 Web Service
3. **`smartproperty-frontend`** — Node 22 TanStack Start SSR Web Service

See [DEPLOYMENT_RENDER.md](DEPLOYMENT_RENDER.md) for step-by-step deployment instructions.
