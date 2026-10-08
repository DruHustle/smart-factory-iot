/**
 * Login Page Component
 * 
 * Professional login interface matching IMSOP design.
 * Uses tRPC authentication with demo account buttons.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Factory, Lock, Mail, Eye, EyeOff, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const demoAccountsQuery = trpc.auth.demoAccounts.useQuery(undefined, {
    retry: 3,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 5_000),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
  const demoAccounts = demoAccountsQuery.data ?? [];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success("Login successful!");
        navigate("/");
      } else {
        toast.error(result.error || "Login failed");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    toast.info("Demo credentials filled");
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[url('/images/industrial-blur-bg.webp')] bg-cover bg-center p-4 sm:p-6">
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Login Card */}
      <Card className="glass-panel relative z-10 w-full max-w-md animate-in border-white/10 fade-in zoom-in duration-500">
        <CardHeader className="space-y-1 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shadow-[0_0_20px_var(--primary)]">
              <Factory className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold tracking-wide">
            Smart Factory IoT
          </h1>

          {/* Subtitle */}
          <CardDescription className="text-muted-foreground">
            Industrial Monitoring & Control Platform
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-background/50 border-white/20 focus:border-primary"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div>
                <Label htmlFor="password" className="text-foreground font-medium">
                  Password
                </Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-background/50 border-white/20 focus:border-primary"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/80 text-primary-foreground shadow-[0_0_15px_var(--primary)] font-semibold"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Demo Accounts Section */}
          {demoAccountsQuery.isLoading && (
            <p className="text-xs text-center text-muted-foreground" role="status">
              Loading demo accounts…
            </p>
          )}

          {demoAccountsQuery.isError && (
            <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/10 p-3" role="alert">
              <div className="flex items-start gap-2 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Demo accounts are temporarily unavailable. Your accounts have not been removed.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={demoAccountsQuery.isFetching}
                onClick={() => void demoAccountsQuery.refetch()}
                className="w-full text-xs border-white/20 hover:bg-white/10"
              >
                <RefreshCw className={`mr-2 h-3.5 w-3.5 ${demoAccountsQuery.isFetching ? "animate-spin" : ""}`} />
                {demoAccountsQuery.isFetching ? "Retrying…" : "Retry demo accounts"}
              </Button>
            </div>
          )}

          {demoAccountsQuery.isSuccess && demoAccounts.length > 0 && <div className="space-y-3">
            <p className="text-xs text-center text-muted-foreground">
              Demo Accounts (click to fill):
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {demoAccounts.map((account) => (
                <Button
                  key={account.role}
                  variant="outline"
                  size="sm"
                  onClick={() => fillDemoCredentials(account.email, account.password)}
                  className="text-xs border-white/20 hover:bg-white/10"
                  title={account.description}
                >
                  {account.label}
                </Button>
              ))}
            </div>
          </div>}

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-muted-foreground space-y-1">
            <p>Protected by Smart Factory Identity Service</p>
            <p>v1.0.0-stable</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
