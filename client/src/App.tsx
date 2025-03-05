import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient.js";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth.js";
import { ProtectedRoute } from "./lib/protected-route.js";
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
import { Home, Building2, Settings, BarChart, AlertTriangle, User } from "lucide-react";

const navItems = [
  { title: "Dashboard", href: "/", icon: <Home className="h-4 w-4" /> },
  { title: "Business Units", href: "/business-units", icon: <Building2 className="h-4 w-4" /> },
  { title: "Incidents", href: "/incidents", icon: <AlertTriangle className="h-4 w-4" /> },
  { title: "Reports", href: "/reports", icon: <BarChart className="h-4 w-4" /> },
  { title: "Settings", href: "/settings", icon: <Settings className="h-4 w-4" /> },
  { title: "Profile", href: "/profile", icon: <User className="h-4 w-4" /> },
];

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar items={navItems} />
      <main className="flex-1">
        <Switch>
          <Route path="/auth" component={AuthPage} />
          <ProtectedRoute path="/" component={Dashboard} />
          <ProtectedRoute path="/business-units" component={BusinessUnits} />
          <ProtectedRoute path="/incidents" component={Incidents} />
          <Route path="/incidents/:id/edit">
            {(params) => (
              <ProtectedRoute
                path={`/incidents/${params.id}/edit`}
                component={EditIncident}
              />
            )}
          </Route>
          <ProtectedRoute path="/file-processing" component={FileProcessing} />
          <ProtectedRoute path="/data-processing/:category" component={CategoryProcessing} />
          <ProtectedRoute path="/data-processing/energy" component={ElectricityData} />
          <ProtectedRoute path="/emissions" component={EmissionsData} />
          <ProtectedRoute path="/users" component={UserManagement} />
          <ProtectedRoute path="/teams" component={Teams} />
          <ProtectedRoute path="/audit-logs" component={AuditLogViewer} />
          <ProtectedRoute path="/settings" component={OrganizationSettings} />
          <ProtectedRoute path="/profile" component={ProfilePage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
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