import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Label } from "@/components/ui/label";
import { FuelForm } from "@/components/manual-entry-forms/fuel-form";
import type { BusinessUnit, Emission } from "@shared/schema";
import { Download, Filter, LineChart } from "lucide-react";

interface FuelStats {
  totalLiters: number;
  totalEmissions: number;
  byProject: Record<string, { liters: number; emissions: number }>;
  byFuelType: Record<string, { liters: number; emissions: number }>;
}

export default function FuelDataPage() {
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [selectedFuelType, setSelectedFuelType] = useState<string>("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const { data: businessUnits, isLoading: loadingUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const { data: emissions, isLoading: loadingEmissions } = useQuery<Emission[]>({
    queryKey: ["/api/emissions", { category: "fuel" }],
    queryFn: async () => {
      const response = await fetch("/api/emissions?category=fuel");
      if (!response.ok) {
        throw new Error("Failed to fetch fuel data");
      }
      return response.json();
    }
  });

  // Calculate fuel statistics
  const calculateStats = (emissions: Emission[] | undefined): FuelStats => {
    const stats: FuelStats = {
      totalLiters: 0,
      totalEmissions: 0,
      byProject: {},
      byFuelType: {},
    };

    if (!emissions) return stats;

    emissions.forEach(emission => {
      const liters = parseFloat(emission.details?.rawAmount || '0');
      const emissionAmount = parseFloat(emission.amount.toString());

      // Convert to liters if in gallons
      const standardizedLiters = emission.details?.rawUnit === 'gallons'
        ? liters * 3.78541
        : liters;

      // Total stats
      stats.totalLiters += standardizedLiters;
      stats.totalEmissions += emissionAmount;

      // By project
      const projectId = emission.businessUnitId;
      if (!stats.byProject[projectId]) {
        stats.byProject[projectId] = { liters: 0, emissions: 0 };
      }
      stats.byProject[projectId].liters += standardizedLiters;
      stats.byProject[projectId].emissions += emissionAmount;

      // By fuel type
      const fuelType = emission.details?.fuelType || 'unknown';
      if (!stats.byFuelType[fuelType]) {
        stats.byFuelType[fuelType] = { liters: 0, emissions: 0 };
      }
      stats.byFuelType[fuelType].liters += standardizedLiters;
      stats.byFuelType[fuelType].emissions += emissionAmount;
    });

    return stats;
  };

  // Filter emissions based on selected criteria
  const filteredEmissions = emissions?.filter(emission => {
    const matchesUnit = !selectedUnit || emission.businessUnitId === selectedUnit;
    const matchesFuelType = !selectedFuelType || emission.details?.fuelType === selectedFuelType;
    const matchesDateRange = !dateRange.start || !dateRange.end ||
      (new Date(emission.date) >= new Date(dateRange.start) &&
        new Date(emission.date) <= new Date(dateRange.end));
    return matchesUnit && matchesFuelType && matchesDateRange;
  });

  const stats = calculateStats(filteredEmissions);

  // Handle CSV export
  const handleExport = () => {
    if (!filteredEmissions || !businessUnits) return;

    const csv = filteredEmissions.map(e => ({
      date: new Date(e.date).toLocaleDateString(),
      businessUnit: businessUnits.find(u => u.id === e.businessUnitId)?.name || 'Unknown',
      fuelType: e.details?.fuelType || 'Unknown',
      amount: e.details?.rawAmount || '0',
      unit: e.details?.rawUnit || 'liters',
      emissions: `${e.amount} ${e.unit}`,
      notes: e.details?.notes || '',
    }));

    const csvString = [
      ["Date", "Business Unit", "Fuel Type", "Amount", "Unit", "Emissions", "Notes"],
      ...csv.map(row => Object.values(row)),
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvString], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fuel-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loadingUnits || loadingEmissions) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <span className="loading loading-spinner">Loading...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Fuel Data</h1>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter fuel data by business unit and fuel type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Business Unit</Label>
                <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Business Units" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Business Units</SelectItem>
                    {businessUnits?.map(unit => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Fuel Type</Label>
                <Select value={selectedFuelType} onValueChange={setSelectedFuelType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Fuel Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Fuel Types</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="gasoline">Gasoline</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Date Range</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Fuel Consumption Summary
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Consumption</p>
                    <p className="text-2xl font-bold">{stats.totalLiters.toFixed(2)} L</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Emissions</p>
                    <p className="text-2xl font-bold">{stats.totalEmissions.toFixed(2)} kgCO2e</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">By Fuel Type</h4>
                  {Object.entries(stats.byFuelType).map(([type, data]) => (
                    <div key={type} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                      <span className="capitalize">{type}</span>
                      <span className="font-medium">{data.liters.toFixed(2)} L</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <FuelForm />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Fuel Consumption Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Business Unit</TableHead>
                    <TableHead>Fuel Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Emissions</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmissions?.map((emission) => (
                    <TableRow key={emission.id}>
                      <TableCell>
                        {new Date(emission.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {businessUnits?.find(u => u.id === emission.businessUnitId)?.name}
                      </TableCell>
                      <TableCell className="capitalize">
                        {emission.details?.fuelType || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {emission.details?.rawAmount} {emission.details?.rawUnit}
                      </TableCell>
                      <TableCell>
                        {parseFloat(emission.amount.toString()).toFixed(2)} {emission.unit}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {emission.details?.notes}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}