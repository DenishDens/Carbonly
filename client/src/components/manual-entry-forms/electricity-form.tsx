import { useState } from "react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BusinessUnit, Emission } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

const electricityFormSchema = z.object({
  businessUnitId: z.string().min(1, "Please select a business unit"),
  amount: z.string().min(1, "Please enter the amount of electricity consumed"),
  date: z.string().min(1, "Please select a date"),
  provider: z.string().min(1, "Please select an electricity provider"),
  notes: z.string().optional(),
  peakUsage: z.boolean().default(false),
  cost: z.string().optional(),
});

const ELECTRICITY_PROVIDERS = [
  { id: "agl", name: "AGL" },
  { id: "origin", name: "Origin Energy" },
  { id: "energyaustralia", name: "Energy Australia" },
  { id: "alinta", name: "Alinta Energy" },
  { id: "ergon", name: "Ergon Energy" },
  { id: "other", name: "Other" },
];

interface ElectricityFormProps {
  initialData?: Emission;
  onSuccess?: () => void;
}

export function ElectricityForm({ initialData, onSuccess }: ElectricityFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [calculatedEmissions, setCalculatedEmissions] = useState<string>();

  const form = useForm<z.infer<typeof electricityFormSchema>>({
    resolver: zodResolver(electricityFormSchema),
    defaultValues: initialData ? {
      businessUnitId: initialData.businessUnitId,
      amount: initialData.details?.rawAmount || "",
      date: new Date(initialData.date).toISOString().split('T')[0],
      provider: initialData.details?.provider,
      notes: initialData.details?.notes,
      peakUsage: initialData.details?.peakUsage || false,
      cost: initialData.details?.cost,
    } : {
      date: new Date().toISOString().split('T')[0],
      peakUsage: false,
    },
  });

  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
    queryFn: async () => {
      const res = await fetch("/api/business-units", {
        credentials: "include",
      });
      return res.json();
    },
  });

  // Watch form values for emissions calculation
  const amount = form.watch("amount");

  // Calculate emissions when amount changes
  React.useEffect(() => {
    if (!amount) {
      setCalculatedEmissions(undefined);
      return;
    }

    // Average Australian electricity emissions factor (kg CO2-e/kWh)
    const emissionsFactor = 0.95;
    const emissions = parseFloat(amount) * emissionsFactor;
    setCalculatedEmissions(emissions.toFixed(2));
  }, [amount]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof electricityFormSchema>) => {
      const endpoint = initialData ? `/api/emissions/${initialData.id}` : "/api/emissions";
      const method = initialData ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessUnitId: data.businessUnitId,
          scope: "Scope 2",
          emissionSource: "electricity consumption",
          amount: calculatedEmissions || "0",
          unit: "kgCO2e",
          date: new Date(data.date),
          details: {
            category: "energy",
            provider: data.provider,
            rawAmount: data.amount,
            rawUnit: "kWh",
            peakUsage: data.peakUsage,
            cost: data.cost,
            notes: data.notes,
          },
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }

      return res.json();
    },
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/emissions"] });
      toast({ title: initialData ? "Electricity data updated successfully" : "Electricity data saved successfully" });
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Error saving electricity data:", error);
      toast({
        title: initialData ? "Failed to update electricity data" : "Failed to save electricity data",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? "Edit Electricity Entry" : "Manual Electricity Entry"}</CardTitle>
        <CardDescription>
          Enter electricity consumption data manually - we'll calculate the CO2e emissions automatically
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="businessUnitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Unit</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a business unit" />
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
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Electricity Provider</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your electricity provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ELECTRICITY_PROVIDERS.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consumption Amount (kWh)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Enter amount"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bill Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Enter cost"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="peakUsage"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-8">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Peak Usage Period</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Add any additional notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {calculatedEmissions && (
              <div className="text-sm text-muted-foreground">
                Estimated emissions: {calculatedEmissions} kgCO2e
              </div>
            )}

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mutation.isPending ? (initialData ? "Updating..." : "Saving...") : (initialData ? "Update Electricity Data" : "Save Electricity Data")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
