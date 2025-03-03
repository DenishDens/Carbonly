import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Upload, FileType2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusinessUnit } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const EMISSION_CATEGORIES = [
  { id: "fuel", label: "Fuel Consumption", icon: "⛽" },
  { id: "electricity", label: "Electricity Usage", icon: "⚡" },
  { id: "travel", label: "Business Travel", icon: "✈️" },
  { id: "waste", label: "Waste Management", icon: "🗑️" },
  { id: "other", label: "Other Sources", icon: "📊" },
];

const EMISSION_SCOPES = [
  { id: "Scope 1", label: "Scope 1 (Direct)", description: "Direct emissions from owned sources" },
  { id: "Scope 2", label: "Scope 2 (Indirect)", description: "Indirect emissions from purchased energy" },
  { id: "Scope 3", label: "Scope 3 (Value Chain)", description: "All other indirect emissions" },
];

export default function FileProcessing() {
  const { toast } = useToast();
  const [file, setFile] = useState<File>();
  const [selectedUnit, setSelectedUnit] = useState<string>();
  const [dragActive, setDragActive] = useState(false);
  const [processingResult, setProcessingResult] = useState<any>();
  const [activeScope, setActiveScope] = useState("Scope 1");

  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const uploadFile = useMutation({
    mutationFn: async () => {
      if (!file || !selectedUnit) return;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("businessUnitId", selectedUnit);
      const res = await fetch("/api/emissions/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      setFile(undefined);
      setProcessingResult(data);
      toast({ title: "File processed successfully" });
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Data Processing</h1>

        <Tabs defaultValue="Scope 1" className="space-y-6">
          <TabsList>
            {EMISSION_SCOPES.map((scope) => (
              <TabsTrigger 
                key={scope.id} 
                value={scope.id}
                onClick={() => setActiveScope(scope.id)}
              >
                {scope.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {EMISSION_SCOPES.map((scope) => (
            <TabsContent key={scope.id} value={scope.id}>
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Upload File</CardTitle>
                    <CardDescription>
                      Upload your {scope.label} emissions data
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select
                      value={selectedUnit}
                      onValueChange={setSelectedUnit}
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
                            Supports PDF, CSV, and Excel files
                          </p>
                        </div>
                      )}
                      <input
                        id="file-input"
                        type="file"
                        className="hidden"
                        onChange={(e) => setFile(e.target.files?.[0])}
                        accept=".pdf,.csv,.xlsx"
                      />
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => uploadFile.mutate()}
                      disabled={!file || !selectedUnit || uploadFile.isPending}
                    >
                      {uploadFile.isPending ? (
                        <>Processing...</>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Process File
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {processingResult && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Processing Results</CardTitle>
                      <CardDescription>
                        Detected emissions data from your file
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Category:</span>
                          <span className="text-muted-foreground">
                            {EMISSION_CATEGORIES.find(c => c.id === processingResult.category)?.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Source:</span>
                          <span className="text-muted-foreground">
                            {processingResult.emissionSource}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Amount:</span>
                          <span className="text-muted-foreground">
                            {processingResult.amount} {processingResult.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Date:</span>
                          <span className="text-muted-foreground">
                            {new Date(processingResult.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {processingResult.details && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Additional Details</AlertTitle>
                          <AlertDescription>
                            <pre className="mt-2 text-sm whitespace-pre-wrap">
                              {JSON.stringify(processingResult.details, null, 2)}
                            </pre>
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="md:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Processed {scope.label} Data</CardTitle>
                      <CardDescription>
                        View all processed emissions data for {scope.label.toLowerCase()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Source</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Unit</TableHead>
                              <TableHead>Business Unit</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* TODO: Add processed data rows */}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}