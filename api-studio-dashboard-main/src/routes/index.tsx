import React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  Building2,
  Wrench,
  UserCheck,
  Bot,
  Shield,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Users,
  BarChart3,
  KeyRound,
  FileText,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate({ to: "/dashboard" });
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* Top Public Navigation */}
      <header className="border-b border-border bg-card/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/25 transition-transform group-hover:scale-105">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              SmartProperty <span className="text-primary">AI</span>
            </span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4">
            <Link to="/guide">
              <Button variant="ghost" size="sm" className="text-xs font-semibold gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                <span>Usage Guide</span>
              </Button>
            </Link>

            <Link to="/login">
              <Button variant="outline" size="sm" className="font-semibold text-xs">
                Sign In
              </Button>
            </Link>

            <Link to="/register">
              <Button size="sm" className="font-semibold text-xs gap-1.5 shadow-sm">
                <span>Resident Portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Public Presentation */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 md:py-32 px-6">
          <div className="max-w-5xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>Next-Generation Intelligent Property & Community Operations</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
              Autonomous Building Operations,{" "}
              <span className="bg-gradient-to-r from-primary via-indigo-500 to-primary/80 bg-clip-text text-transparent">
                Powered by AI
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-normal">
              A unified property platform serving residents, facility engineering teams, and
              building executives with conversational ticketing, digital visitor access, and real-time SLA metrics.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
              <Link to="/login">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 font-semibold gap-2 shadow-lg shadow-primary/25">
                  <span>Access Your Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/guide">
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-6 font-semibold gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span>Platform Usage Guide</span>
                </Button>
              </Link>
            </div>

            {/* Platform Trust Highlights */}
            <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
              <div className="p-3.5 rounded-xl border bg-card/60">
                <ShieldCheck className="h-5 w-5 text-emerald-500 mb-1.5" />
                <p className="text-xs font-bold text-foreground">Verified Execution</p>
                <p className="text-[11px] text-muted-foreground">AI tools require human confirmation</p>
              </div>
              <div className="p-3.5 rounded-xl border bg-card/60">
                <Clock className="h-5 w-5 text-indigo-500 mb-1.5" />
                <p className="text-xs font-bold text-foreground">24/7 Ticketing</p>
                <p className="text-[11px] text-muted-foreground">Instant photo issue reporting</p>
              </div>
              <div className="p-3.5 rounded-xl border bg-card/60">
                <KeyRound className="h-5 w-5 text-amber-500 mb-1.5" />
                <p className="text-xs font-bold text-foreground">Digital Passes</p>
                <p className="text-[11px] text-muted-foreground">Fast visitor security check-in</p>
              </div>
              <div className="p-3.5 rounded-xl border bg-card/60">
                <FileText className="h-5 w-5 text-sky-500 mb-1.5" />
                <p className="text-xs font-bold text-foreground">Audit Compliance</p>
                <p className="text-[11px] text-muted-foreground">Immutable state change logging</p>
              </div>
            </div>
          </div>
        </section>

        {/* Triple Role Portals Overview */}
        <section className="py-20 px-6 bg-muted/30 border-y border-border">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight">Tailored Role Experiences</h2>
              <p className="text-sm text-muted-foreground">
                One integrated platform providing dedicated, permission-guarded workspaces for every stakeholder.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Resident Card */}
              <div className="rounded-2xl border bg-card p-6 flex flex-col justify-between shadow-xs hover:border-primary/40 transition-colors">
                <div className="space-y-4">
                  <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                    <UserCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <Badge variant="outline" className="text-[11px] border-emerald-500/30 text-emerald-600 mb-2">
                      Resident Portal
                    </Badge>
                    <h3 className="text-xl font-bold">Residents & Tenants</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      View apartment lease information, report maintenance repairs with photo evidence,
                      pre-register incoming guests with digital PINs, and converse with the AI copilot.
                    </p>
                  </div>
                  <ul className="space-y-2 text-xs text-muted-foreground pt-2 border-t">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>One-click maintenance ticketing</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Scheduled digital visitor passes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>AI Tenancy Assistant for questions</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-6">
                  <Link to="/register">
                    <Button variant="outline" size="sm" className="w-full text-xs font-semibold">
                      Register as Resident
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Staff Card */}
              <div className="rounded-2xl border bg-card p-6 flex flex-col justify-between shadow-xs hover:border-primary/40 transition-colors">
                <div className="space-y-4">
                  <div className="h-11 w-11 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
                    <Wrench className="h-6 w-6" />
                  </div>
                  <div>
                    <Badge variant="outline" className="text-[11px] border-sky-500/30 text-sky-600 mb-2">
                      Staff & Security Portal
                    </Badge>
                    <h3 className="text-xl font-bold">Facility Operations</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      Prioritized maintenance dispatch queue, technician work logs, status state-machine
                      transitions, and reception desk visitor check-in/check-out.
                    </p>
                  </div>
                  <ul className="space-y-2 text-xs text-muted-foreground pt-2 border-t">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-sky-500" />
                      <span>Real-time work order dispatch</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-sky-500" />
                      <span>Front desk visitor check-in console</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-sky-500" />
                      <span>Chronological work progress notes</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-6">
                  <Link to="/login">
                    <Button variant="outline" size="sm" className="w-full text-xs font-semibold">
                      Staff Sign In
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Administrator Card */}
              <div className="rounded-2xl border bg-card p-6 flex flex-col justify-between shadow-xs hover:border-primary/40 transition-colors">
                <div className="space-y-4">
                  <div className="h-11 w-11 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <Badge variant="outline" className="text-[11px] border-indigo-500/30 text-indigo-600 mb-2">
                      Administration Suite
                    </Badge>
                    <h3 className="text-xl font-bold">Property Executives</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      Complete property, building, and apartment tree hierarchy, tenant assignment,
                      turnaround SLA analytics, audit log diff inspector, and user account control.
                    </p>
                  </div>
                  <ul className="space-y-2 text-xs text-muted-foreground pt-2 border-t">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Portfolio occupancy & SLA charts</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Side-by-side JSON state diffs</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />
                      <span>User account provisioning & suspension</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-6">
                  <Link to="/login">
                    <Button variant="outline" size="sm" className="w-full text-xs font-semibold">
                      Admin Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Conversational AI Showcase */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1 space-y-4">
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 gap-1.5 py-0.5">
                <Bot className="h-3.5 w-3.5" />
                Smart Copilot Engine
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight">
                AI That Executes Real Work, With Zero Guesswork
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                SmartProperty AI doesn&apos;t just answer questions. When a resident types
                &ldquo;Water is leaking under my kitchen sink&rdquo;, the copilot classifies the
                category, prompts for details, and constructs a verified ticket creation tool card.
              </p>
              <div className="space-y-2.5 pt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Interactive confirmation cards before every database write</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Available as a persistent floating drawer or fullscreen workspace</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Tailored prompt suggestions for every user role</span>
                </div>
              </div>
              <div className="pt-3">
                <Link to="/guide">
                  <Button variant="secondary" size="sm" className="text-xs font-semibold gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>See Copilot Instructions in Guide</span>
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex-1 w-full max-w-md rounded-2xl border bg-card p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-none">SmartProperty Copilot</p>
                    <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Verified Autonomous Tool</p>
                  </div>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                  Online
                </Badge>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="bg-muted/50 p-2.5 rounded-xl max-w-[85%] self-end ml-auto text-foreground">
                  My kitchen faucet has a strong leak and water is pooling under the cabinet.
                </div>
                <div className="bg-primary/5 border border-primary/20 p-2.5 rounded-xl max-w-[90%] text-foreground space-y-2">
                  <p>I have prepared a High priority Plumbing maintenance request for your unit.</p>
                  <div className="p-2.5 rounded-lg bg-card border text-[11px] space-y-1">
                    <div className="font-semibold text-primary">Tool Call: CreateMaintenanceRequest</div>
                    <div className="text-muted-foreground">Category: Plumbing | Priority: High</div>
                    <div className="text-muted-foreground truncate">Title: Kitchen faucet water leak</div>
                    <div className="pt-1.5 flex gap-1.5">
                      <Button size="sm" className="h-6 text-[10px] px-2.5 bg-primary">Confirm & Execute</Button>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2">Cancel</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Public Footer */}
      <footer className="border-t border-border bg-card/40 py-10 px-6 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <span className="font-semibold text-foreground">SmartProperty AI</span>
              <p className="text-[11px] text-muted-foreground">Enterprise Property & Community Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <Link to="/guide" className="hover:text-primary transition-colors">
              User Guide & Documentation
            </Link>
            <Link to="/login" className="hover:text-primary transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-primary transition-colors">
              Resident Registration
            </Link>
          </div>

          <div className="text-center sm:text-right">
            <p>&copy; {new Date().getFullYear()} SmartProperty AI. All rights reserved.</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Secure, compliant & verified operations</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
