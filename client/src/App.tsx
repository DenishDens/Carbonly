import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import BusinessUnits from "@/pages/business-units";
import FileProcessing from "@/pages/file-processing";
import EmissionsData from "@/pages/emissions";
import UserManagement from "@/pages/users";
import OrganizationSettings from "@/pages/organization-settings";
import AuditLogViewer from "@/pages/audit-logs";
import CategoryProcessing from "@/pages/data-processing/[category]";
import Teams from "@/pages/teams";
import FuelData from "@/pages/fuel-data";
import ElectricityData from "@/pages/electricity-data";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/business-units" component={BusinessUnits} />
      <ProtectedRoute path="/data-processing" component={FileProcessing} />
      <ProtectedRoute path="/data-processing/:category" component={CategoryProcessing} />
      <ProtectedRoute path="/emissions" component={EmissionsData} />
      <ProtectedRoute path="/fuel-data" component={FuelData} />
      <ProtectedRoute path="/electricity-data" component={ElectricityData} />
      <ProtectedRoute path="/users" component={UserManagement} />
      <ProtectedRoute path="/teams" component={Teams} />
      <ProtectedRoute path="/audit-logs" component={AuditLogViewer} />
      <ProtectedRoute path="/settings" component={OrganizationSettings} />
      <Route component={NotFound} />
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