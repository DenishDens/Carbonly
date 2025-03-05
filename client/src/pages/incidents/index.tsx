import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Incident, InsertIncident, BusinessUnit } from "@shared/schema";
import { insertIncidentSchema } from "@shared/schema";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNewIncident, setShowNewIncident] = useState(false);

  const form = useForm<InsertIncident>({
    resolver: zodResolver(insertIncidentSchema),
  });

  const { data: incidents, isLoading } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });

  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (data: InsertIncident) => {
      const res = await apiRequest("POST", "/api/incidents", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      setShowNewIncident(false);
      form.reset();
      toast({ title: "Incident created successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create incident",
        description: error.message,
        variant: "destructive",
      });
    },
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
                {incidents?.map((incident) => (
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
                      {new Date(incident.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={showNewIncident} onOpenChange={setShowNewIncident}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report New Incident</DialogTitle>
              <DialogDescription>
                Report an environmental incident for tracking and management
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form className="space-y-4">
                <FormField
                  control={form.control}
                  name="businessUnitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Unit</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select business unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {businessUnits?.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              {unit.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <Input placeholder="Brief description" {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <Textarea
                        placeholder="Detailed description of the incident"
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="incidentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Incident Date</FormLabel>
                      <Input type="datetime-local" {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="spill">Spill</SelectItem>
                            <SelectItem value="leak">Leak</SelectItem>
                            <SelectItem value="equipment_failure">
                              Equipment Failure
                            </SelectItem>
                            <SelectItem value="power_outage">
                              Power Outage
                            </SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="severity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Severity</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select severity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Input
                        placeholder="Where did this incident occur?"
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
            <DialogFooter>
              <Button
                onClick={() => {
                  const values = form.getValues();
                  createIncidentMutation.mutate({
                    ...values,
                    status: "open",
                  });
                }}
                disabled={createIncidentMutation.isPending}
              >
                {createIncidentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create Incident"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}