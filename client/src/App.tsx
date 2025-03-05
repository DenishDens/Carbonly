import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { DashboardLayout } from "@/components/dashboard-layout";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";

function ProtectedDashboard() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/business-units" component={() => <div>Business Units</div>} />
        <Route path="/incidents" component={() => <div>Incidents</div>} />
        <Route path="/file-processing" component={() => <div>File Processing</div>} />
        <Route path="/data-processing" component={() => <div>Data Processing</div>} />
        <Route path="/data-processing/energy" component={() => <div>Energy Data</div>} />
        <Route path="/data-processing/fuel" component={() => <div>Fuel Data</div>} />
        <Route path="/reports" component={() => <div>Reports</div>} />
        <Route path="/settings" component={() => <div>Settings</div>} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/:rest*" component={ProtectedDashboard} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}