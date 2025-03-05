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
import type { BusinessUnit, FuelData, Emission, Material } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const fuelFormSchema = z.object({
  businessUnitId: z.string({
    required_error: "Please select a business unit",
  }),
  materialId: z.string({
    required_error: "Please select a material",
  }),
  amount: z.string().min(1, "Amount is required"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  paidBySubcontractor: z.boolean().default(false),
  subcontractorName: z.string().optional(),
});

interface FuelFormProps {
  initialData?: Emission;
  onSuccess?: () => void;
}

export function FuelForm({ initialData, onSuccess }: FuelFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [calculatedEmissions, setCalculatedEmissions] = useState<string>();

  // Fetch materials
  const { data: materials, isLoading: loadingMaterials } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const form = useForm<z.infer<typeof fuelFormSchema>>({
    resolver: zodResolver(fuelFormSchema),
    defaultValues: initialData ? {
      businessUnitId: initialData.businessUnitId,
      materialId: initialData.details?.materialId || "",
      amount: initialData.details?.rawAmount || "",
      date: new Date(initialData.date).toISOString().split('T')[0],
      notes: initialData.details?.notes,
      paidBySubcontractor: initialData.details?.paidBySubcontractor || false,
      subcontractorName: initialData.details?.subcontractorName,
    } : {
      date: new Date().toISOString().split('T')[0],
      paidBySubcontractor: false,
    },
  });

  const amount = form.watch("amount");
  const materialId = form.watch("materialId");
  const paidBySubcontractor = form.watch("paidBySubcontractor");

  // Find selected material and calculate emissions
  useState(() => {
    if (!amount || !materialId) return;

    const material = materials?.find(m => m.id === materialId);
    if (!material) return;

    const value = parseFloat(amount);
    const emissions = value * parseFloat(material.emissionFactor);
    setCalculatedEmissions(emissions.toFixed(2));
  }, [amount, materialId, materials]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof fuelFormSchema>) => {
      const material = materials?.find(m => m.id === data.materialId);
      if (!material) throw new Error("Selected material not found");

      const endpoint = initialData ? `/api/emissions/${initialData.id}` : "/api/emissions";
      const method = initialData ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessUnitId: data.businessUnitId,
          scope: "Scope 1",
          emissionSource: `${material.name} consumption`,
          amount: calculatedEmissions || "0",
          unit: "kgCO2e",
          date: new Date(data.date).toISOString(),
          details: {
            materialId: data.materialId,
            rawAmount: data.amount,
            rawUnit: material.uom,
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
      toast({ title: initialData ? "Fuel data updated successfully" : "Fuel data saved successfully" });
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Error saving fuel data:", error);
      toast({
        title: initialData ? "Failed to update fuel data" : "Failed to save fuel data",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: businessUnits, isLoading: loadingUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  if (loadingUnits || loadingMaterials) {
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

  // Get the selected material's unit of measure
  const selectedMaterial = materials?.find(m => m.id === materialId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? "Edit Fuel Entry" : "Manual Fuel Entry"}</CardTitle>
        <CardDescription>
          Enter fuel consumption data manually - we'll calculate the CO2e emissions automatically
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
              name="materialId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {materials?.filter(m => m.category === "Fuel").map((material) => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.name}
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

              <FormItem>
                <FormLabel>Unit</FormLabel>
                <FormControl>
                  <Input 
                    type="text" 
                    value={selectedMaterial?.uom || ""} 
                    disabled 
                    className="bg-muted"
                  />
                </FormControl>
              </FormItem>
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
                  Based on emission factor from selected material
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mutation.isPending ? (initialData ? "Updating..." : "Saving...") : (initialData ? "Update Fuel Data" : "Save Fuel Data")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}