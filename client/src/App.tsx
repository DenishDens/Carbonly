import * as React from "react";
import { Switch, Route, useLocation } from "wouter";
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
import { Navbar } from "@/components/ui/navbar";
import { Home, Building2, AlertTriangle, BarChart } from "lucide-react";

const navItems = [
  { title: "Dashboard", href: "/", icon: <Home className="h-4 w-4" /> },
  { title: "Business Units", href: "/business-units", icon: <Building2 className="h-4 w-4" /> },
  { title: "Incidents", href: "/incidents", icon: <AlertTriangle className="h-4 w-4" /> },
  { title: "Reports", href: "/reports", icon: <BarChart className="h-4 w-4" /> },
];

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar items={navItems} />
      <main className="flex-1 container py-6">
        {children}
      </main>
    </div>
  );
}

function Router() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!isAuthenticated && window.location.pathname !== '/auth') {
      setLocation('/auth');
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated && window.location.pathname !== '/auth') {
    return null;
  }

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      {isAuthenticated && (
        <Route path="*">
          {() => (
            <AuthenticatedLayout>
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
            </AuthenticatedLayout>
          )}
        </Route>
      )}
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