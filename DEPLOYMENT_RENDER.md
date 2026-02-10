# SmartProperty AI — Render Deployment Guide

This guide details how to deploy the entire SmartProperty AI platform (**PostgreSQL Database**, **.NET 10 ASP.NET Core Backend API**, and **TanStack Start React Frontend**) on [Render](https://render.com).

---

## Architecture on Render

```
                ┌───────────────────────────────────┐
                │        Browser / Resident / Staff │
                └─────────────────┬─────────────────┘
                                  │ HTTPS
                   ┌──────────────┴──────────────┐
                   ▼                             ▼
       ┌────────────────────────┐    ┌────────────────────────┐
       │ smartproperty-frontend │    │ smartproperty-backend  │
       │ (Node Web Service)     │    │ (Docker .NET 10 API)   │
       │ TanStack Start / React │───▶│ ASP.NET Core Web API   │
       └────────────────────────┘    └───────────┬────────────┘
                                                 │ Internal SSL
                                                 ▼
                                     ┌────────────────────────┐
                                     │    smartproperty-db    │
                                     │  (Managed PostgreSQL)  │
                                     └────────────────────────┘
```

---

## Method 1: 1-Click Blueprint Deployment (Recommended)

Render Blueprints allow you to provision all 3 services together via [`render.yaml`](./render.yaml).

### Step 1: Push Code to GitHub / GitLab
Make sure your latest code with `render.yaml` is committed and pushed to your remote repository:
```bash
git add .
git commit -m "Configure Render deployment for backend, frontend and postgres"
git push origin main
```

### Step 2: Create Blueprint Instance on Render
1. Log in to [dashboard.render.com](https://dashboard.render.com/).
2. Click **New +** $\rightarrow$ **Blueprint**.
3. Connect your repository (`SMARTPROPERTY_AI`).
4. Render will parse `render.yaml` and show:
   - **smartproperty-db** (PostgreSQL)
   - **smartproperty-backend** (Docker Web Service)
   - **smartproperty-frontend** (Node Web Service)
5. Fill in the required secret environment variables:
   - `GROQ_API_KEY`: Your Groq API key (e.g. `gsk_...`)
   - `OPENAI_API_KEY`: *(Optional if using Groq)*
6. Click **Apply**. Render will automatically:
   - Provision the managed PostgreSQL database.
   - Build the .NET 10 multi-stage Docker container.
   - Automatically execute EF Core migrations and seed roles, admin/staff/resident users, and building amenities.
   - Build and start the TanStack Start frontend server.

---

## Method 2: Manual Service Creation (Step-by-Step)

If you prefer to create each service individually through the Render Web UI:

### Step 1: Create the PostgreSQL Database
1. Go to **Dashboard** $\rightarrow$ **New +** $\rightarrow$ **PostgreSQL**.
2. **Name**: `smartproperty-db`
3. **Database Name**: `smartproperty_prod`
4. **User**: `smartproperty_user`
5. **Region**: `Oregon (US West)`
6. **Plan**: `Free`
7. Click **Create Database**.
8. Copy the **Internal Database URL** (e.g. `postgres://smartproperty_user:...@dpg-...:5432/smartproperty_prod`).

---

### Step 2: Deploy the Backend API (.NET 10)
1. Go to **Dashboard** $\rightarrow$ **New +** $\rightarrow$ **Web Service**.
2. Connect your Git repository.
3. Choose **Docker** as the Runtime:
   - **Name**: `smartproperty-backend`
   - **Region**: Same region as database (e.g. `Oregon`)
   - **Branch**: `main`
   - **Root Directory**: Leave blank (or `backend`)
   - **Dockerfile Path**: `backend/Dockerfile`
   - **Docker Context**: `backend`
   - **Instance Type**: `Free`
4. Add the following **Environment Variables**:
   | Variable | Value | Notes |
   | :--- | :--- | :--- |
   | `ASPNETCORE_ENVIRONMENT` | `Production` | Enables production middleware |
   | `DATABASE_URL` | *Paste Internal Database URL from Step 1* | Auto-converted to Npgsql format |
   | `JwtSettings__SecretKey` | *At least 32-character random string* | Used to sign JWT tokens |
   | `JwtSettings__Issuer` | `SmartPropertyAI` | JWT Issuer claim |
   | `JwtSettings__Audience` | `SmartPropertyAIClient` | JWT Audience claim |
   | `JwtSettings__ExpiryMinutes` | `60` | Token expiration |
   | `AI_PROVIDER` | `Groq` | Or `Mock` |
   | `GROQ_API_KEY` | `gsk_...` | Groq API Key |
5. **Health Check Path**: `/health`
6. Click **Create Web Service**.
7. Once deployed, note your public URL: `https://smartproperty-backend.onrender.com`.

---

### Step 3: Deploy the Frontend (TanStack Start / React)
1. Go to **Dashboard** $\rightarrow$ **New +** $\rightarrow$ **Web Service**.
2. Connect your Git repository.
3. Configure the build:
   - **Name**: `smartproperty-frontend`
   - **Region**: Same region (e.g. `Oregon`)
   - **Branch**: `main`
   - **Root Directory**: `api-studio-dashboard-main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Instance Type**: `Free`
4. Add the following **Environment Variables**:
   | Variable | Value | Notes |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Production mode |
   | `NITRO_PRESET` | `node-server` | Builds standalone Node HTTP server |
   | `VITE_API_BASE_URL` | `https://smartproperty-backend.onrender.com/api/v1` | Points to your Backend Web Service |
5. Click **Create Web Service**.

---

## Verifying the Deployment

1. **Backend Health Check**:
   Visit `https://smartproperty-backend.onrender.com/health` in your browser.
   It should return:
   ```json
   {
     "status": "Healthy",
     "entries": {
       "npgsql": {
         "status": "Healthy",
         "description": "Operational"
       }
     }
   }
   ```

2. **Frontend App**:
   Visit `https://smartproperty-frontend.onrender.com` in your browser.
   Log in with the seeded accounts:
   - **Admin**: `admin@smartproperty.ai` / `AdminPassword123!`
   - **Staff**: `staff@smartproperty.ai` / `StaffPassword123!`
   - **Resident**: `resident@smartproperty.ai` / `ResidentPassword123!`

---

## Pro-Tips & Troubleshooting for Render

> [!NOTE]
> **Free Tier Spin-Down**: Free web services on Render spin down after 15 minutes of inactivity. The first request after sleep may take ~30–50 seconds while the container initializes.
> The health check endpoint `/health` will keep it responsive or wake it up cleanly.

> [!TIP]
> **Instant API URL Override**:
> If you deploy the frontend and need to change the backend URL without rebuilding, open DevTools console in your browser and run:
> ```js
> localStorage.setItem("smartproperty_api_url", "https://your-custom-backend.onrender.com/api/v1");
> location.reload();
> ```

