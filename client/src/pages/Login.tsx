/**
 * Login Page Component
 * 
 * Professional login interface with blurred factory background.
 * Inspired by portfolio project design with SOLID principles.
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Factory, Lock, Mail, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { DEMO_ACCOUNTS } from "../../../shared/demo-accounts";

export default function Login() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  const fillDemoAccount = (email: string, password: string, label: string) => {
    setEmail(email);
    setPassword(password);
    toast.info(`${label} account selected`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Blurred Factory Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/factory-blur-bg.jpg')",
          filter: "blur(2px)",
        }}
      />
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-background/80" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo Section */}
        <div className="text-center mb-8 animate-fadeInUp">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/50">
              <Factory className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Smart Factory IoT
          </h1>
          <p className="text-muted-foreground text-lg">
            Industrial Monitoring & Control Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-effect p-8 animate-slideInRight">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-semibold">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@factory.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-semibold">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
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
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 rounded-lg group transition-all duration-200"
            >
              {isLoading ? (
                "Signing in..."
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-black/20 text-muted-foreground">
                Demo Accounts
              </span>
            </div>
          </div>

          {/* Demo Account Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() =>
                  fillDemoAccount(account.email, account.password, account.label)
                }
                className="px-3 py-2.5 rounded-lg bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 text-foreground transition-all duration-200 text-sm font-medium group"
                title={account.description}
              >
                <span className="group-hover:text-primary transition-colors">
                  {account.label}
                </span>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="text-primary hover:text-accent font-semibold transition-colors"
            >
              Register here
            </button>
          </div>
        </div>

        {/* Security Footer */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>🔒 Secure login with encrypted connection</p>
        </div>
      </div>
    </div>
  );
}
