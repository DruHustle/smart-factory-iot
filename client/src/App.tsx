import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Monitoring from "./pages/Monitoring";
import Devices from "./pages/Devices";
import DeviceDetail from "./pages/DeviceDetail";
import Alerts from "./pages/Alerts";
import AlertHistory from "./pages/AlertHistory";
import Analytics from "./pages/Analytics";
import OTAUpdates from "./pages/OTAUpdates";

function Router() {
  return (
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
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
