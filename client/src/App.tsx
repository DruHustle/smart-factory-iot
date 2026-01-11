import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Monitoring from "./pages/Monitoring";
import Devices from "./pages/Devices";
import DeviceDetail from "./pages/DeviceDetail";
import Alerts from "./pages/Alerts";
import AlertHistory from "./pages/AlertHistory";
import Analytics from "./pages/Analytics";
import OTAUpdates from "./pages/OTAUpdates";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show login page for unauthenticated users
  if (!user) {
    return (
      <WouterRouter hook={useHashLocation}>
        <Switch>
          <Route path="/register" component={Register} />
          <Route path="/" component={Login} />
          <Route component={Login} />
        </Switch>
      </WouterRouter>
    );
  }

  return (
    <WouterRouter hook={useHashLocation}>
      <DashboardLayout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/monitoring" component={Monitoring} />
          <Route path="/devices" component={Devices} />
          <Route path="/devices/:id" component={DeviceDetail} />
          <Route path="/alerts" component={Alerts} />
          <Route path="/alert-history" component={AlertHistory} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/ota" component={OTAUpdates} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    </WouterRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
