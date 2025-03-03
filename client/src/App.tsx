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

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/business-units" component={BusinessUnits} />
      <ProtectedRoute path="/file-processing" component={FileProcessing} />
      <ProtectedRoute path="/emissions" component={EmissionsData} />
      <ProtectedRoute path="/users" component={UserManagement} />
      <ProtectedRoute path="/settings" component={OrganizationSettings} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;