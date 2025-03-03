import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Download, Filter, LineChart, Upload, FileType2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = z.object({
  businessUnitId: z.string().min(1, "Please select a business unit"),
});

type FormData = z.infer<typeof formSchema>;

export default function EnergyDataPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [file, setFile] = useState<File>();
  const [dragActive, setDragActive] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const { data: emissions, isLoading: loadingEmissions } = useQuery<Emission[]>({
    queryKey: ["/api/emissions", { category: "energy" }],
    queryFn: async () => {
      const response = await fetch("/api/emissions?category=energy");
      if (!response.ok) {
        throw new Error("Failed to fetch energy data");
      }
      return response.json();
    }
  });

  const uploadFile = useMutation({
    mutationFn: async () => {
      const businessUnitId = form.getValues("businessUnitId");
      if (!file || !businessUnitId) {
        throw new Error("Please select a business unit and file");
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("businessUnitId", businessUnitId);
      formData.append("category", "energy");
      const res = await fetch("/api/emissions/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setFile(undefined);
      toast({ title: "File processed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/emissions"] });
    },
    onError: (error) => {
      toast({
        title: "Processing failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const calculateStats = (emissions: Emission[] | undefined): EnergyStats => {
    const stats: EnergyStats = {
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
    const matchesDateRange = !dateRange.start || !dateRange.end ||
      (new Date(emission.date) >= new Date(dateRange.start) &&
        new Date(emission.date) <= new Date(dateRange.end));
    return matchesDateRange;
  });

  const stats = calculateStats(filteredEmissions);

  if (loadingEmissions) {
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
          <h1 className="text-3xl font-bold">Energy Data</h1>
          <Button onClick={() => {
            // Export functionality here
          }}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload Energy Data</CardTitle>
            <CardDescription>
              Upload your electricity bills and energy consumption records
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                    dragActive ? "border-primary bg-primary/10" : "border-muted",
                    "hover:border-primary hover:bg-primary/5"
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileType2 className="h-6 w-6" />
                      <span>{file.name}</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Drag and drop files here, or click to select files
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports PDF and image files of electricity bills
                      </p>
                    </div>
                  )}
                  <input
                    id="file-input"
                    type="file"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0])}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                </div>

                {!form.getValues("businessUnitId") && (
                  <p className="text-sm text-destructive">Please select a business unit first</p>
                )}

                <Button
                  type="button"
                  className="w-full"
                  onClick={() => uploadFile.mutate()}
                  disabled={!file || !form.getValues("businessUnitId") || uploadFile.isPending}
                >
                  {uploadFile.isPending ? (
                    "Processing..."
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Process File
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter energy data by business unit and date range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  Energy Consumption Summary
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Energy Consumption Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Business Unit</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Consumption</TableHead>
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
                        {emission.details?.rawAmount} kWh
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

interface EnergyStats {
  totalKwh: number;
  totalEmissions: number;
  byProject: Record<string, { kwh: number; emissions: number }>;
  bySource: Record<string, { kwh: number; emissions: number }>;
}

const dateRange = useState({ start: "", end: "" });
const selectedUnit = useState<string>("all");