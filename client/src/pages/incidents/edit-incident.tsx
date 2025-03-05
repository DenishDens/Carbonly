import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertIncidentSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";

export default function EditIncidentPage() {
  const [_, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  console.log("EditIncidentPage: Editing incident with ID:", id);

  // Get incident data
  const { data: incident, isLoading: isLoadingIncident } = useQuery({
    queryKey: [`/api/incidents/${id}`],
    enabled: !!id && !!user?.organizationId,
  });

  // Get business units
  const { data: businessUnits } = useQuery({
    queryKey: ["/api/business-units"],
    enabled: !!user?.organizationId,
  });

  const form = useForm({
    resolver: zodResolver(insertIncidentSchema),
    defaultValues: {
      title: "",
      description: "",
      severity: "medium",
      status: "open",
      type: "spill",
      location: "",
      businessUnitId: "",
      incidentDate: new Date().toISOString().slice(0, 16),
    },
  });

  // Update form when incident data is loaded
  useEffect(() => {
    if (incident) {
      console.log("Setting form values:", incident);
      form.reset({
        ...incident,
        incidentDate: new Date(incident.incidentDate).toISOString().slice(0, 16),
      });
    }
  }, [incident, form]);

  const updateIncident = useMutation({
    mutationFn: async (data: any) => {
      if (!id) throw new Error("No incident ID provided");
      setIsSubmitting(true);
      console.log("Updating incident:", id, "with data:", data);

      try {
        const formattedData = {
          ...data,
          incidentDate: new Date(data.incidentDate).toISOString(),
        };

        const res = await apiRequest("PATCH", `/api/incidents/${id}`, formattedData);
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || "Failed to update incident");
        }
        return res.json();
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      queryClient.invalidateQueries({ queryKey: [`/api/incidents/${id}`] });
      toast({ title: "Incident updated successfully" });
      setLocation("/incidents");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update incident",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!id || !user?.organizationId) {
    console.log("Missing required data, redirecting to incidents page");
    setLocation("/incidents");
    return null;
  }

  if (isLoadingIncident) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  console.log("Rendering edit form with data:", incident);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Edit Incident</h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => updateIncident.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="businessUnitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Unit</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select business unit" />
                      </SelectTrigger>
                    </FormControl>
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
                  <FormControl>
                    <Input {...field} placeholder="Brief incident title" />
                  </FormControl>
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
                  <FormControl>
                    <Textarea {...field} placeholder="Detailed incident description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select incident type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="spill">Spill</SelectItem>
                      <SelectItem value="leak">Leak</SelectItem>
                      <SelectItem value="equipment_failure">Equipment Failure</SelectItem>
                      <SelectItem value="power_outage">Power Outage</SelectItem>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity level" />
                      </SelectTrigger>
                    </FormControl>
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

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Incident location" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="incidentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date and Time</FormLabel>
                  <FormControl>
                    <Input 
                      type="datetime-local" 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setLocation("/incidents")}
                type="button"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || updateIncident.isPending}
              >
                {(isSubmitting || updateIncident.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Update Incident
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}