import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateIncidentDialog } from "./create-incident";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { Incident, BusinessUnit } from "@shared/schema";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  CircleDot,
  Clock,
  Loader2,
  Plus,
} from "lucide-react";

export default function IncidentsPage() {
  const [showNewIncident, setShowNewIncident] = useState(false);

  const { data: incidents, isLoading } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-500";
      case "high":
        return "text-orange-500";
      case "medium":
        return "text-yellow-500";
      default:
        return "text-green-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "resolved":
        return <CircleDot className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Incidents</h1>
          <Button onClick={() => setShowNewIncident(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Incident
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Incidents</CardTitle>
            <CardDescription>
              View and manage environmental incidents across all business units
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Business Unit</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell className="font-medium">
                        {incident.title}
                      </TableCell>
                      <TableCell>
                        {businessUnits?.find(
                          (u) => u.id === incident.businessUnitId
                        )?.name}
                      </TableCell>
                      <TableCell className="capitalize">
                        {incident.type.replace("_", " ")}
                      </TableCell>
                      <TableCell>
                        <span className={getSeverityColor(incident.severity)}>
                          {incident.severity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(incident.status)}
                          <span className="capitalize">
                            {incident.status.replace("_", " ")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(incident.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <CreateIncidentDialog 
          open={showNewIncident} 
          onOpenChange={setShowNewIncident}
        />
      </div>
    </DashboardLayout>
  );
}