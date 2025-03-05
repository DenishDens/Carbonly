import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { Incident } from "@shared/schema";
import { AlertTriangle, CircleDot, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

export function IncidentDashboard() {
  const [_, setLocation] = useLocation();
  const { data: incidents } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });

  const incidentStats = {
    total: incidents?.length || 0,
    open: incidents?.filter((i) => i.status === "open").length || 0,
    inProgress: incidents?.filter((i) => i.status === "in_progress").length || 0,
    resolved: incidents?.filter((i) => i.status === "resolved").length || 0,
    critical: incidents?.filter((i) => i.severity === "critical").length || 0,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header with search */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Incidents</h1>
        <div className="flex gap-4">
          <Input 
            placeholder="Search incidents..." 
            className="w-[300px]"
          />
          <Button onClick={() => setLocation('/incidents/new')}>
            New Incident
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidentStats.open}</div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidentStats.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              Currently being addressed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CircleDot className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidentStats.resolved}</div>
            <p className="text-xs text-muted-foreground">
              Successfully resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidentStats.critical}</div>
            <p className="text-xs text-muted-foreground">
              High priority
            </p>
          </CardContent>
        </Card>
      </div>

      {/* All Incidents */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">All Incidents</h2>
          <Button variant="outline">Filters</Button>
        </div>

        <div className="bg-card rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-medium">Title</th>
                <th className="text-left p-4 font-medium">Business Unit</th>
                <th className="text-left p-4 font-medium">Type</th>
                <th className="text-left p-4 font-medium">Severity</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Reported On</th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {incidents?.map((incident) => (
                <tr key={incident.id} className="border-b hover:bg-muted/50">
                  <td className="p-4">{incident.title}</td>
                  <td className="p-4">{incident.businessUnitId}</td>
                  <td className="p-4">{incident.type}</td>
                  <td className="p-4">
                    <span className={`${
                      incident.severity === 'critical' ? 'text-red-600' :
                      incident.severity === 'high' ? 'text-orange-600' :
                      'text-muted-foreground'
                    }`}>
                      {incident.severity}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
                      incident.status === 'open' ? 'bg-red-100 text-red-700' :
                      incident.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {incident.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {new Date(incident.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-background hover:bg-muted"
                      onClick={() => setLocation(`/incidents/${incident.id}`)}
                    >
                      Close
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}