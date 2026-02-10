import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  BookOpen,
  Building2,
  Wrench,
  UserCheck,
  Shield,
  Bot,
  KeyRound,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  FileText,
  Clock,
  Home,
  Users,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Eye,
  Sliders,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/guide")({
  component: GuidePage,
});

function GuidePage() {
  const { isAuthenticated, role } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("residents");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* Top Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/25 transition-transform group-hover:scale-105">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              SmartProperty <span className="text-primary">AI</span>
            </span>
            <Badge variant="outline" className="text-xs ml-2 hidden sm:inline-flex">
              Usage Guide & Manual
            </Badge>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button size="sm" className="text-xs font-semibold gap-1.5 shadow-sm">
                  <span>Back to Dashboard</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="outline" size="sm" className="text-xs font-semibold">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="text-xs font-semibold gap-1.5 shadow-sm">
                    <span>Register</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Guide Hero */}
      <div className="bg-muted/30 border-b border-border py-12 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-semibold">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Comprehensive Documentation & Operational Reference</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            SmartProperty AI Platform User Guide
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about operating SmartProperty AI — whether you are a resident
            reporting repairs, facility personnel handling work orders, or an executive running property portfolios.
          </p>
        </div>
      </div>

      {/* Main Guide Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tab Navigation */}
          <div className="overflow-x-auto pb-2">
            <TabsList className="bg-muted/60 p-1 w-full justify-start sm:justify-center flex-nowrap">
              <TabsTrigger value="residents" className="gap-1.5 text-xs sm:text-sm">
                <UserCheck className="h-4 w-4 text-emerald-500" />
                <span>Residents & Tenants</span>
              </TabsTrigger>
              <TabsTrigger value="staff" className="gap-1.5 text-xs sm:text-sm">
                <Wrench className="h-4 w-4 text-sky-500" />
                <span>Facility Staff & Security</span>
              </TabsTrigger>
              <TabsTrigger value="admins" className="gap-1.5 text-xs sm:text-sm">
                <Shield className="h-4 w-4 text-indigo-500" />
                <span>Property Administrators</span>
              </TabsTrigger>
              <TabsTrigger value="copilot" className="gap-1.5 text-xs sm:text-sm">
                <Bot className="h-4 w-4 text-primary" />
                <span>AI Copilot & Tools</span>
              </TabsTrigger>
              <TabsTrigger value="faq" className="gap-1.5 text-xs sm:text-sm">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Getting Started & FAQ</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: RESIDENTS */}
          <TabsContent value="residents" className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="border-b pb-4">
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <UserCheck className="h-6 w-6 text-emerald-500" />
                Resident Portal Guide
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Instructions for residents and apartment tenants to manage daily home operations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Feature 1: Maintenance */}
              <Card className="shadow-xs">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base">Submitting Maintenance Tickets</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Report apartment repairs directly to building facility teams
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <p>
                    1. Navigate to <strong>Maintenance</strong> in the sidebar and click <strong>Report Issue</strong>.
                  </p>
                  <p>
                    2. Choose a category: <Badge variant="outline" className="text-[10px]">Plumbing</Badge>,{" "}
                    <Badge variant="outline" className="text-[10px]">Electrical</Badge>,{" "}
                    <Badge variant="outline" className="text-[10px]">HVAC</Badge>, etc.
                  </p>
                  <p>
                    3. Select a severity level: <strong>Low</strong>, <strong>Medium</strong>, <strong>High</strong>, or <strong>Urgent</strong>.
                  </p>
                  <p>
                    4. Optionally paste a photo URL of the issue to speed up technician triage.
                  </p>
                  <p>
                    5. Track progress in real-time as the ticket transitions from <em>Pending</em> to <em>Assigned</em>, <em>In Progress</em>, and <em>Resolved</em>.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 2: Visitors */}
              <Card className="shadow-xs">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base">Pre-Registering Visitor Passes</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Clear guests with building reception and security staff in advance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <p>
                    1. Navigate to <strong>Visitor Passes</strong> and click <strong>Pre-Register Visitor</strong>.
                  </p>
                  <p>
                    2. Enter your guest&apos;s full name, phone number, and scheduled arrival time.
                  </p>
                  <p>
                    3. A secure <strong>Digital Pass Card</strong> is issued containing an entry PIN code.
                  </p>
                  <p>
                    4. When your guest arrives at the building desk, security verifies their name or PIN and performs a 1-click Check-In.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 3: My Residence */}
              <Card className="shadow-xs">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                      <Home className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base">My Residence Dashboard</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Your personal lease and apartment profile
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <p>
                    Access <strong>My Residence</strong> to view your unit number, floor plan, move-in date,
                    building management contacts, and emergency assistance numbers.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 4: Resident Copilot */}
              <Card className="shadow-xs">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <Bot className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base">Using the Resident AI Copilot</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Natural language assistant for issues and building policies
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <p>
                    Click the floating <strong>Property Copilot</strong> button at the bottom-right of your screen anytime.
                  </p>
                  <p>
                    You can say: <em>&ldquo;My air conditioner is making a loud buzzing noise&rdquo;</em> or <em>&ldquo;Register a visitor named Michael arriving tomorrow at 2 PM&rdquo;</em>.
                  </p>
                  <p>
                    The copilot drafts the request and presents a <strong>Tool Confirmation Card</strong> for your review before executing.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: STAFF */}
          <TabsContent value="staff" className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="border-b pb-4">
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Wrench className="h-6 w-6 text-sky-500" />
                Facility Staff & Security Desk Guide
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Operational workflows for property technicians, facility managers, and reception security.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Staff 1 */}
              <Card className="shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base">Staff Operational Dashboard</CardTitle>
                  <CardDescription className="text-xs">
                    Daily task overview and immediate priorities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <p>
                    Upon login, the <strong>Staff Dashboard</strong> highlights your assigned tasks count,
                    urgent open requests, and expected visitors arriving today.
                  </p>
                  <p>
                    Click any task from the work queue to jump directly into the full ticket workspace.
                  </p>
                </CardContent>
              </Card>

              {/* Staff 2 */}
              <Card className="shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base">Maintenance Ticket Execution & Notes</CardTitle>
                  <CardDescription className="text-xs">
                    Managing the end-to-end repair cycle
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <p>
                    1. <strong>Accept / Assign:</strong> Change status to <em>Assigned</em> or assign to a fellow specialist.
                  </p>
                  <p>
                    2. <strong>Start Work:</strong> Transition status to <em>In Progress</em>.
                  </p>
                  <p>
                    3. <strong>Log Notes:</strong> Post technician updates in the work log thread (visible to resident or internal-only).
                  </p>
                  <p>
                    4. <strong>Resolve:</strong> Mark as <em>Resolved</em> with a summary of the resolution for the audit history.
                  </p>
                </CardContent>
              </Card>

              {/* Staff 3 */}
              <Card className="shadow-xs md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Security Reception Desk (Check-In / Check-Out)</CardTitle>
                  <CardDescription className="text-xs">
                    Managing physical visitor access at the front gate or reception lobby
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <p>
                    1. Go to <strong>Visitor Passes</strong> and switch to the <strong>Security Desk View</strong> tab.
                  </p>
                  <p>
                    2. Use the fast search bar to look up arriving guests by visitor name, phone number, or resident host.
                  </p>
                  <p>
                    3. Click <strong>Check-In</strong> when the visitor arrives. The system stamps the exact check-in timestamp.
                  </p>
                  <p>
                    4. When the guest departs, click <strong>Check-Out</strong> to log their exit and compute visit duration for security compliance.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 3: ADMIN */}
          <TabsContent value="admins" className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="border-b pb-4">
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Shield className="h-6 w-6 text-indigo-500" />
                Property Administrator Guide
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Portfolio management, SLA compliance analytics, audit verification, and user access control.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Admin 1 */}
              <Card className="shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base">Property Portfolio & Unit Hierarchy</CardTitle>
                  <CardDescription className="text-xs">
                    Full CRUD control over buildings, floors, and apartments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <p>
                    - <strong>Properties View:</strong> Create and configure properties (Residential, Commercial, Mixed).
                  </p>
                  <p>
                    - <strong>Building Drill-Down:</strong> Add buildings, define floor counts, and inspect apartment unit grids.
                  </p>
                  <p>
                    - <strong>Tenant Assignment:</strong> Link resident user accounts to specific apartments to grant them access to their resident portal.
                  </p>
                </CardContent>
              </Card>

              {/* Admin 2 */}
              <Card className="shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base">Operational Analytics & SLA Insights</CardTitle>
                  <CardDescription className="text-xs">
                    Turnaround times, category distributions, and occupancy gauges
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <p>
                    - <strong>Maintenance SLA:</strong> Average resolution time in hours, SLA completion rate, and ticket category breakdown.
                  </p>
                  <p>
                    - <strong>Visitor Throughput:</strong> 24-hour peak arrival hour curves and average visit duration.
                  </p>
                  <p>
                    - <strong>Portfolio Occupancy:</strong> Live progress gauge tracking leased vs vacant vs under-maintenance units.
                  </p>
                </CardContent>
              </Card>

              {/* Admin 3 */}
              <Card className="shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base">Immutable Audit Log Explorer</CardTitle>
                  <CardDescription className="text-xs">
                    Regulatory compliance tracking with side-by-side JSON state diffs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <p>
                    Every database insert, modification, and deletion is recorded immutably.
                  </p>
                  <p>
                    Click <strong>View Diff</strong> on any log entry to open the side-by-side inspector comparing the exact <em>previousState</em> (highlighted in red) with the <em>newState</em> (highlighted in green).
                  </p>
                </CardContent>
              </Card>

              {/* Admin 4 */}
              <Card className="shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base">User Administration Console</CardTitle>
                  <CardDescription className="text-xs">
                    Identity provisioning, role assignments, and account status controls
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <p>
                    - <strong>Provision User:</strong> Onboard new team members with immediate Administrator, Staff, or Resident permissions.
                  </p>
                  <p>
                    - <strong>Account Suspension:</strong> Immediately revoke access by toggling an account to <em>Suspended</em>.
                  </p>
                  <p>
                    - <strong>Self-protection safeguards:</strong> Administrators are protected from accidentally suspending their own account.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 4: AI COPILOT */}
          <TabsContent value="copilot" className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="border-b pb-4">
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Bot className="h-6 w-6 text-primary" />
                Conversational AI Copilot Guide
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                How the autonomous property copilot reasons, orchestrates tools, and ensures verified execution.
              </p>
            </div>

            <Card className="shadow-xs">
              <CardContent className="p-6 space-y-5 text-sm text-muted-foreground">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-foreground">
                  <h3 className="font-semibold text-base flex items-center gap-2 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                    Human-in-the-Loop Safe Execution Architecture
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    The SmartProperty AI Copilot uses intelligent tool calling. Whenever an action modifies the database (such as submitting a maintenance ticket or issuing a visitor pass), the copilot extracts all fields and renders an interactive <strong>Tool Confirmation Card</strong>. No write operation is executed without explicit user confirmation.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="border rounded-xl p-4 space-y-2 bg-card">
                    <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">Example Prompts for Residents</h4>
                    <ul className="text-xs space-y-1.5 list-disc pl-4 text-muted-foreground">
                      <li>&ldquo;My bathroom sink is leaking water onto the floor&rdquo;</li>
                      <li>&ldquo;Register a visitor named Sarah Connor arriving this Friday at 4 PM&rdquo;</li>
                      <li>&ldquo;Show me my open repair tickets&rdquo;</li>
                      <li>&ldquo;What is the building pet policy and quiet hours?&rdquo;</li>
                    </ul>
                  </div>

                  <div className="border rounded-xl p-4 space-y-2 bg-card">
                    <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">Example Prompts for Staff</h4>
                    <ul className="text-xs space-y-1.5 list-disc pl-4 text-muted-foreground">
                      <li>&ldquo;Show all urgent unassigned maintenance requests&rdquo;</li>
                      <li>&ldquo;How many visitors are expected on site today?&rdquo;</li>
                      <li>&ldquo;Assign ticket #TR-1002 to technician John Smith&rdquo;</li>
                      <li>&ldquo;Summarize electrical issues reported this week&rdquo;</li>
                    </ul>
                  </div>
                </div>

                <div className="border-t pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span>Accessible anywhere via the bottom-right floating pill or the fullscreen <strong>AI Assistant</strong> workspace.</span>
                  <Link to="/assistant">
                    <Button size="sm" className="gap-1.5">
                      <span>Launch AI Workspace</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: FAQ & SYSTEM */}
          <TabsContent value="faq" className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="border-b pb-4">
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-amber-500" />
                Frequently Asked Questions & Quick Start
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Essential reference information and setup details for initial deployment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">How do I change my theme preference?</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Click the theme toggle icon (Sun / Moon) in the top navigation bar. You can choose between Light Mode, Dark Mode, or System Default (which matches your device settings).
                </CardContent>
              </Card>

              <Card className="shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">What is the API backend connection?</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  The frontend connects directly to the high-performance ASP.NET Core API running at <code className="font-mono bg-muted px-1.5 py-0.5 rounded">http://localhost:5096/api/v1</code>. In production Docker deployments, it reverse-proxies through Nginx seamlessly.
                </CardContent>
              </Card>

              <Card className="shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">How do notifications work?</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Click the Bell icon in the top header to view unread alerts. You receive notifications when tickets are assigned, status updates occur, or visitors arrive. You can mark individual notifications or all as read.
                </CardContent>
              </Card>

              <Card className="shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Are actions audited?</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Yes. All data modifications are logged with user ID, timestamp, before-state, and after-state in the compliance Audit Log, ensuring complete transparency and security.
                </CardContent>
              </Card>
            </div>

            {/* Default credentials reference card */}
            <Card className="shadow-xs bg-muted/40 border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Pre-Seeded Demonstration Credentials
                </CardTitle>
                <CardDescription className="text-xs">
                  Available in development and evaluation environments
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="font-bold text-foreground">Administrator</p>
                    <p className="text-muted-foreground mt-0.5 font-mono">admin@smartproperty.com</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Password: Admin@123456</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="font-bold text-foreground">Facility Staff</p>
                    <p className="text-muted-foreground mt-0.5 font-mono">staff@smartproperty.com</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Password: Staff@123456</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="font-bold text-foreground">Resident / Tenant</p>
                    <p className="text-muted-foreground mt-0.5 font-mono">resident@smartproperty.com</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Password: Resident@123456</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center text-xs text-muted-foreground mt-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">SmartProperty AI</span>
            <span>— Enterprise User Manual</span>
          </div>
          <div>All rights reserved &copy; {new Date().getFullYear()}</div>
        </div>
      </footer>
    </div>
  );
}

