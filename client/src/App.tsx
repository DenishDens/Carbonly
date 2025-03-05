import * as React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient.js";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "./hooks/use-auth.js";
import NotFound from "./pages/not-found.js";
import AuthPage from "./pages/auth-page.js";
import Dashboard from "./pages/dashboard.js";
import BusinessUnits from "./pages/business-units.js";
import FileProcessing from "./pages/file-processing.js";
import EmissionsData from "./pages/emissions.js";
import UserManagement from "./pages/users.js";
import OrganizationSettings from "./pages/organization-settings.js";
import AuditLogViewer from "./pages/audit-logs.js";
import CategoryProcessing from "./pages/data-processing/[category].js";
import Teams from "./pages/teams.js";
import ElectricityData from "./pages/electricity-data.js";
import Incidents from "./pages/incidents/index.js";
import EditIncident from "./pages/incidents/edit-incident.js";
import ProfilePage from "./pages/profile.js";
import { DashboardLayout } from "@/components/dashboard-layout";

function AppContent() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/business-units" component={BusinessUnits} />
        <Route path="/incidents" component={Incidents} />
        <Route path="/incidents/:id/edit">
          {(params) => <EditIncident id={params.id} />}
        </Route>
        <Route path="/file-processing" component={FileProcessing} />
        <Route path="/data-processing/:category" component={CategoryProcessing} />
        <Route path="/data-processing/energy" component={ElectricityData} />
        <Route path="/emissions" component={EmissionsData} />
        <Route path="/users" component={UserManagement} />
        <Route path="/teams" component={Teams} />
        <Route path="/audit-logs" component={AuditLogViewer} />
        <Route path="/settings" component={OrganizationSettings} />
        <Route path="/profile" component={ProfilePage} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}