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
import type { BusinessUnit, Emission } from "@shared/schema";
import { Download, LineChart } from "lucide-react";

interface ElectricityStats {
  totalKwh: number;
  totalEmissions: number;
  byProject: Record<string, { kwh: number; emissions: number }>;
  bySource: Record<string, { kwh: number; emissions: number }>;
}

export default function ElectricityDataPage() {
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const { data: businessUnits, isLoading: loadingUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const { data: emissions, isLoading: loadingEmissions } = useQuery<Emission[]>({
    queryKey: ["/api/emissions", { category: "electricity" }],
    queryFn: async () => {
      const response = await fetch("/api/emissions?category=electricity");
      if (!response.ok) {
        throw new Error("Failed to fetch electricity data");
      }
      return response.json();
    }
  });

  const calculateStats = (emissions: Emission[] | undefined): ElectricityStats => {
    const stats: ElectricityStats = {
      totalKwh: 0,
      totalEmissions: 0,
      byProject: {},
      bySource: {},
    };

    if (!emissions) return stats;

    emissions.forEach(emission => {
      const kwh = parseFloat(emission.details?.rawAmount || '0');
      const emissionAmount = parseFloat(emission.amount.toString());

      stats.totalKwh += kwh;
      stats.totalEmissions += emissionAmount;

      const projectId = emission.businessUnitId;
      if (!stats.byProject[projectId]) {
        stats.byProject[projectId] = { kwh: 0, emissions: 0 };
      }
      stats.byProject[projectId].kwh += kwh;
      stats.byProject[projectId].emissions += emissionAmount;

      const source = emission.details?.source || 'grid';
      if (!stats.bySource[source]) {
        stats.bySource[source] = { kwh: 0, emissions: 0 };
      }
      stats.bySource[source].kwh += kwh;
      stats.bySource[source].emissions += emissionAmount;
    });

    return stats;
  };

  const filteredEmissions = emissions?.filter(emission => {
    const matchesUnit = selectedUnit === "all" || emission.businessUnitId === selectedUnit;
    const matchesSource = selectedSource === "all" || emission.details?.source === selectedSource;
    const matchesDateRange = !dateRange.start || !dateRange.end ||
      (new Date(emission.date) >= new Date(dateRange.start) &&
        new Date(emission.date) <= new Date(dateRange.end));
    return matchesUnit && matchesSource && matchesDateRange;
  });

  const stats = calculateStats(filteredEmissions);

  const handleExport = () => {
    if (!filteredEmissions || !businessUnits) return;

    const csv = filteredEmissions.map(e => ({
      date: new Date(e.date).toLocaleDateString(),
      businessUnit: businessUnits.find(u => u.id === e.businessUnitId)?.name || 'Unknown',
      source: e.details?.source || 'Grid',
      amount: e.details?.rawAmount || '0',
      unit: e.details?.rawUnit || 'kWh',
      emissions: `${e.amount} ${e.unit}`,
      notes: e.details?.notes || '',
    }));

    const csvString = [
      ["Date", "Business Unit", "Source", "Amount", "Unit", "Emissions", "Notes"],
      ...csv.map(row => Object.values(row)),
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvString], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `electricity-data-${new Date().toISOString().split('T')[0]}.csv`;
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
          <h1 className="text-3xl font-bold">Electricity Data</h1>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter electricity data by business unit and source</CardDescription>
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
                    <SelectItem value="all">All Business Units</SelectItem>
                    {businessUnits?.map(unit => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Source</Label>
                <Select value={selectedSource} onValueChange={setSelectedSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="grid">Grid Electricity</SelectItem>
                    <SelectItem value="solar">Solar</SelectItem>
                    <SelectItem value="wind">Wind</SelectItem>
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
                  Electricity Consumption Summary
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Consumption</p>
                    <p className="text-2xl font-bold">{stats.totalKwh.toFixed(2)} kWh</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Emissions</p>
                    <p className="text-2xl font-bold">{stats.totalEmissions.toFixed(2)} kgCO2e</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">By Source</h4>
                  {Object.entries(stats.bySource).map(([source, data]) => (
                    <div key={source} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                      <span className="capitalize">{source}</span>
                      <span className="font-medium">{data.kwh.toFixed(2)} kWh</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add ElectricityForm component here when created */}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Electricity Consumption Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Business Unit</TableHead>
                    <TableHead>Source</TableHead>
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
                        {emission.details?.source || 'Grid'}
                      </TableCell>
                      <TableCell>
                        {emission.details?.rawAmount} {emission.details?.rawUnit || 'kWh'}
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
