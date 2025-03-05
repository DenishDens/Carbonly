import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { CreateIncidentDialog } from "./create-incident";
import { CloseIncidentDialog } from "@/components/close-incident-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import type { Incident, BusinessUnit } from "@shared/schema";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CircleDot,
  Clock,
  Loader2,
  Plus,
  Filter,
  ChevronDown,
  ChevronUp,
  Search,
  Edit,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function IncidentsPage() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [showNewIncident, setShowNewIncident] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    type: 'all',
    severity: 'all',
    status: 'all',
  });
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const { data: incidents, isLoading } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });

  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const filteredIncidents = incidents?.filter(incident => {
    if (filters.type !== 'all' && incident.type !== filters.type) return false;
    if (filters.severity !== 'all' && incident.severity !== filters.severity) return false;
    if (filters.status !== 'all' && incident.status !== filters.status) return false;

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const businessUnitName = businessUnits?.find(u => u.id === incident.businessUnitId)?.name || '';
      return (
        incident.title.toLowerCase().includes(searchLower) ||
        incident.description.toLowerCase().includes(searchLower) ||
        incident.type.toLowerCase().includes(searchLower) ||
        incident.severity.toLowerCase().includes(searchLower) ||
        incident.status.toLowerCase().includes(searchLower) ||
        incident.location?.toLowerCase().includes(searchLower) ||
        businessUnitName.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const activeFiltersCount = Object.values(filters).filter(v => v !== 'all').length;
  const canEdit = user?.role === "admin" || user?.role === "business_unit_manager";

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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs">
                  {activeFiltersCount}
                </span>
              )}
              {showFilters ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <Button onClick={() => setShowNewIncident(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Incident
            </Button>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent>
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Select
                      value={filters.type}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="spill">Spill</SelectItem>
                        <SelectItem value="leak">Leak</SelectItem>
                        <SelectItem value="equipment_failure">Equipment Failure</SelectItem>
                        <SelectItem value="power_outage">Power Outage</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Select
                      value={filters.severity}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, severity: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severities</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Select
                      value={filters.status}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

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
                  <TableHead>#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Business Unit</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell className="font-mono">
                        {incident.sequenceNumber}
                      </TableCell>
                      <TableCell className="font-medium">
                        {incident.title}
                      </TableCell>
                      <TableCell>
                        {businessUnits?.find(u => u.id === incident.businessUnitId)?.name || 'Unknown'}
                      </TableCell>
                      <TableCell className="capitalize">
                        {incident.type.replace(/_/g, " ")}
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
                            {incident.status.replace(/_/g, " ")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(incident.createdAt)}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const editUrl = `/incidents/${incident.id}/edit`;
                              setLocation(editUrl);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {incident.status !== 'resolved' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setSelectedIncidentId(incident.id)}
                              >
                                Close
                              </Button>
                            </DialogTrigger>
                            {selectedIncidentId === incident.id && (
                              <CloseIncidentDialog
                                incidentId={incident.id}
                                onClose={() => setSelectedIncidentId(null)}
                              />
                            )}
                          </Dialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex justify-between text-sm text-muted-foreground">
            <div>
              Total Records: {filteredIncidents?.length || 0} of {incidents?.length || 0}
            </div>
          </CardFooter>
        </Card>

        <CreateIncidentDialog
          open={showNewIncident}
          onOpenChange={setShowNewIncident}
        />
      </div>
    </DashboardLayout>
  );
}

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