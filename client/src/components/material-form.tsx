import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

<FormField
  control={form.control}
  name="emissionFactor"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Emission Factors (kgCO2e per unit)</FormLabel>
      <FormControl>
        <Input type="number" step="0.01" {...field} />
      </FormControl>
      <FormDescription>
        Enter the emission factor as kilograms of CO2 equivalent (kgCO2e) per unit of measure.
        The AI will suggest appropriate values based on industry standards.
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>