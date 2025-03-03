import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useMutation, useQuery } from "@tanstack/react-query";
import type { BusinessUnit } from "@shared/schema";

interface FuelData {
  businessUnitId: string;
  fuelType: "diesel" | "gasoline";
  amount: string;
  unit: "liters" | "gallons";
  date: string;
  notes: string;
}

const FUEL_TYPES = [
  { id: "diesel", label: "Diesel" },
  { id: "gasoline", label: "Gasoline" },
];

const UNITS = [
  { id: "liters", label: "Liters (L)" },
  { id: "gallons", label: "Gallons (gal)" },
];

export function FuelForm() {
  const { toast } = useToast();
  const [calculatedEmissions, setCalculatedEmissions] = useState<string>();

  const form = useForm<FuelData>({
    defaultValues: {
      unit: "liters",
      date: new Date().toISOString().split('T')[0],
    },
  });

  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  // Watch form values for real-time calculation
  const amount = form.watch("amount");
  const unit = form.watch("unit");
  const fuelType = form.watch("fuelType");
  const businessUnitId = form.watch("businessUnitId");

  // Get protocol settings when business unit changes
  const { data: protocolSettings } = useQuery({
    queryKey: ["/api/business-units", businessUnitId, "protocol-settings"],
    enabled: !!businessUnitId,
  });

  // Calculate emissions whenever inputs change
  useEffect(() => {
    if (!amount || !unit || !fuelType || !protocolSettings) return;

    const factor = protocolSettings.emissionFactors[fuelType];
    if (!factor) return;

    // Convert to liters if needed
    const liters = unit === "gallons" ? parseFloat(amount) * 3.78541 : parseFloat(amount);

    // Calculate emissions
    const emissions = liters * parseFloat(factor);
    setCalculatedEmissions(emissions.toFixed(2));
  }, [amount, unit, fuelType, protocolSettings]);

  const saveFuelData = useMutation({
    mutationFn: async (data: FuelData) => {
      const res = await fetch("/api/emissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          category: "fuel",
          scope: "Scope 1",
          amount: calculatedEmissions,
          unit: "kgCO2e",
          details: {
            rawAmount: data.amount,
            rawUnit: data.unit,
            fuelType: data.fuelType,
          },
        }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      form.reset();
      toast({ title: "Fuel data saved successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to save fuel data",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fuel Consumption</CardTitle>
        <CardDescription>
          Enter fuel consumption data - we'll automatically calculate CO2e emissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => saveFuelData.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="businessUnitId"
              rules={{ required: "Business unit is required" }}
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
              rules={{ required: "Fuel type is required" }}
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
                rules={{ required: "Amount is required" }}
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
              rules={{ required: "Date is required" }}
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
                    <Input placeholder="Any additional notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {calculatedEmissions && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Calculated Emissions</p>
                <p className="text-2xl font-bold">{calculatedEmissions} kgCO2e</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={saveFuelData.isPending}>
              {saveFuelData.isPending ? "Saving..." : "Save Fuel Data"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}