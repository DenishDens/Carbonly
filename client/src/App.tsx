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
import ElectricityData from "@/pages/electricity-data";
import Incidents from "@/pages/incidents";
import EditIncident from "@/pages/incidents/edit-incident";
import ProfilePage from "@/pages/profile"; // Assuming this component exists
import { Navbar } from "@/components/ui/navbar"; // Added import for Navbar
import { Home, Building2, Settings, BarChart, AlertTriangle, User } from "lucide-react"; // Added icons


const navItems = [
  { title: "Dashboard", href: "/", icon: <Home className="h-4 w-4" /> },
  { title: "Business Units", href: "/business-units", icon: <Building2 className="h-4 w-4" /> },
  { title: "Incidents", href: "/incidents", icon: <AlertTriangle className="h-4 w-4" /> },
  { title: "Reports", href: "/reports", icon: <BarChart className="h-4 w-4" /> }, // Assumed reports route
  { title: "Settings", href: "/settings", icon: <Settings className="h-4 w-4" /> },
  { title: "Profile", href: "/profile", icon: <User className="h-4 w-4" /> },
];

function Router() {
  return (
    <div className="flex flex-col min-h-screen"> {/* Added div for layout */}
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