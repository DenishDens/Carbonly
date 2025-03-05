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
        Enter the emission factor in kgCO2e per unit of measure
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
