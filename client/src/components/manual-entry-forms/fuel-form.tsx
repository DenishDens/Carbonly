import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BusinessUnit, FuelData } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const fuelFormSchema = z.object({
  businessUnitId: z.string({
    required_error: "Please select a business unit",
  }),
  fuelType: z.enum(["diesel", "gasoline"], {
    required_error: "Please select a fuel type",
  }),
  amount: z.string().min(1, "Amount is required"),
  unit: z.enum(["liters", "gallons"]),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  paidBySubcontractor: z.boolean().default(false),
  subcontractorName: z.string().optional(),
});

const FUEL_TYPES = [
  { id: "diesel", label: "Diesel" },
  { id: "gasoline", label: "Gasoline" },
];

const UNITS = [
  { id: "liters", label: "Liters (L)" },
  { id: "gallons", label: "Gallons (gal)" },
];

// Emission factors (kgCO2e per liter)
const EMISSION_FACTORS = {
  diesel: 2.68,
  gasoline: 2.31,
};

export function FuelForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [calculatedEmissions, setCalculatedEmissions] = useState<string>();

  const form = useForm<z.infer<typeof fuelFormSchema>>({
    resolver: zodResolver(fuelFormSchema),
    defaultValues: {
      unit: "liters",
      date: new Date().toISOString().split('T')[0],
      paidBySubcontractor: false,
    },
  });

  const amount = form.watch("amount");
  const unit = form.watch("unit");
  const fuelType = form.watch("fuelType");
  const paidBySubcontractor = form.watch("paidBySubcontractor");

  useState(() => {
    if (!amount || !unit || !fuelType) return;

    const factor = EMISSION_FACTORS[fuelType];
    if (!factor) return;

    // Convert to liters if needed
    const liters = unit === "gallons" ? parseFloat(amount) * 3.78541 : parseFloat(amount);

    // Calculate emissions
    const emissions = liters * factor;
    setCalculatedEmissions(emissions.toFixed(2));
  }, [amount, unit, fuelType]);

  const saveFuelData = useMutation({
    mutationFn: async (data: z.infer<typeof fuelFormSchema>) => {
      console.log("Submitting fuel data:", data);
      const res = await fetch("/api/emissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessUnitId: data.businessUnitId,
          scope: "Scope 1", // Direct emissions from fuel consumption
          emissionSource: `${data.fuelType} consumption`,
          amount: calculatedEmissions || "0",
          unit: "kgCO2e",
          date: new Date(data.date).toISOString(),
          details: {
            rawAmount: data.amount,
            rawUnit: data.unit,
            fuelType: data.fuelType,
            category: "fuel",
            notes: data.notes,
            paidBySubcontractor: data.paidBySubcontractor,
            subcontractorName: data.subcontractorName,
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
      toast({ title: "Fuel data saved successfully" });
    },
    onError: (error) => {
      console.error("Error saving fuel data:", error);
      toast({
        title: "Failed to save fuel data",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: businessUnits, isLoading: loadingUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  if (loadingUnits) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Fuel Entry</CardTitle>
        <CardDescription>
          Enter fuel consumption data manually - we'll calculate the CO2e emissions automatically
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => saveFuelData.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="businessUnitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Unit</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
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
              name="fuelType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fuel Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fuel type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FUEL_TYPES.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UNITS.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add any additional notes or comments" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="paidBySubcontractor"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Paid by Subcontractor</FormLabel>
                      <FormDescription>
                        Indicate if this fuel consumption was paid by a subcontractor
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {paidBySubcontractor && (
                <FormField
                  control={form.control}
                  name="subcontractorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subcontractor Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter subcontractor name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {calculatedEmissions && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Calculated Emissions</p>
                <p className="text-2xl font-bold">{calculatedEmissions} kgCO2e</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on standard emission factors for {form.getValues("fuelType")} fuel
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={saveFuelData.isPending}>
              {saveFuelData.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saveFuelData.isPending ? "Saving..." : "Save Fuel Data"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}