import { useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const EMISSION_CATEGORIES = [
  { id: "fuel", label: "Fuel Consumption", icon: "⛽" },
  { id: "water", label: "Water Usage", icon: "💧" },
  { id: "energy", label: "Energy Usage", icon: "⚡" },
  { id: "travel", label: "Business Travel", icon: "✈️" },
  { id: "waste", label: "Waste Management", icon: "🗑️" },
  { id: "other", label: "Other Sources", icon: "📊" },
];

interface FileProcessingProps {
  category?: string;
  title?: string;
}

export function FileProcessing({ category, title = "Data Processing" }: FileProcessingProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File>();
  const [selectedUnit, setSelectedUnit] = useState<string>();
  const [dragActive, setDragActive] = useState(false);
  const [processingResult, setProcessingResult] = useState<any>();

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{title}</h1>
        {!category && (
          <div className="flex gap-2">
            {EMISSION_CATEGORIES.map((cat) => (
              <Button
                key={cat.id}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {cat.icon} {cat.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              Upload your emissions data
              {category && ` for ${EMISSION_CATEGORIES.find(c => c.id === category)?.label}`}
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
                  <span className="font-medium">Scope:</span>
                  <span className="text-muted-foreground">
                    {processingResult.scope}
                  </span>
                </div>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Processed Data</CardTitle>
          <CardDescription>
            View your recently processed emissions data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Business Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* TODO: Add processed data rows */}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
