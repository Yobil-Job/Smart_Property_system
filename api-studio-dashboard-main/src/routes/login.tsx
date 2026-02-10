import React, { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { getFriendlyErrorMessage } from "@/lib/api/client";
import {
  Building2,
  Lock,
  Mail,
  Loader2,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/dashboard" });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Please enter both your email and password.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      toast.success("Welcome back! Redirecting to your dashboard...");
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      const msg = getFriendlyErrorMessage(err, "Invalid email or password. Please check your credentials and try again.");
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col justify-center items-center px-4 py-12">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8 text-center space-y-2">
        <Link to="/" className="flex flex-col items-center group">
          <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-1.5 mt-2">
            SmartProperty <span className="text-primary">AI</span>
          </h1>
        </Link>
        <p className="text-sm text-muted-foreground max-w-sm">
          Intelligent property operations, maintenance triage & resident services portal
        </p>
      </div>

      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl font-bold">Sign In</CardTitle>
          <CardDescription>
            Enter your credentials to access your property dashboard
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {errorMessage && (
              <Alert variant="destructive" className="py-2.5">
                <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full font-semibold gap-2 mt-2 shadow-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 border-t border-border pt-4">
            <div className="text-center text-xs text-muted-foreground">
              Don&apos;t have an account yet?{" "}
              <Link to="/register" className="font-semibold text-primary hover:underline">
                Register as a Resident
              </Link>
            </div>

            <div className="text-center text-xs text-muted-foreground pt-1 flex items-center justify-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span>New to the platform?</span>
              <Link to="/guide" className="font-medium text-primary hover:underline">
                Read the User Guide
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
