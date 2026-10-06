import { useLocation } from "wouter";
import { ArrowLeft, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export default function ForgotPassword() {
  const [, navigate] = useLocation();

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[url('/images/industrial-blur-bg.webp')] bg-cover bg-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <Card className="w-full max-w-md glass-panel border-white/10 relative z-10 animate-in fade-in zoom-in duration-500">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shadow-[0_0_20px_var(--primary)]">
              <Factory className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-wide">Password assistance</h1>
          <CardDescription className="text-muted-foreground">
            Self-service password reset is not available.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Contact your Smart Factory administrator through your approved support channel to regain access.
          </p>

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/login")}
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
