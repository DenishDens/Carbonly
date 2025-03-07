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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Upload, FileType2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusinessUnit } from "@shared/schema";

interface EmissionData {
  businessUnitId: string;
  category: string;
  source: string;
  amount: string;
  unit: string;
  date: string;
  scope: string;
}

export function FileProcessing() {
  const { toast } = useToast();
  const [file, setFile] = useState<File>();
  const [dragActive, setDragActive] = useState(false);
  const [processingResult, setProcessingResult] = useState<any>();
  const [selectedBusinessUnitId, setSelectedBusinessUnitId] = useState<string>('');

  const form = useForm<EmissionData>({
    defaultValues: {
      unit: "tCO2e",
      date: new Date().toISOString().split('T')[0],
    },
  });

  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const uploadFile = useMutation({
    mutationFn: async () => {
      if (!file || !selectedBusinessUnitId) return;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("businessUnitId", selectedBusinessUnitId);
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

  const manualEntry = useMutation({
    mutationFn: async (data: EmissionData) => {
      const res = await fetch("/api/emissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      form.reset();
      toast({ title: "Data saved successfully" });
    },
    onError: (error) => {
      toast({
        title: "Save failed",
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
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              Upload your emissions data file - we'll automatically detect the category and scope
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="businessUnitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Unit</FormLabel>
                  <Select
                    value={selectedBusinessUnitId}
                    onValueChange={setSelectedBusinessUnitId}
                  >
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
              disabled={!file || !selectedBusinessUnitId || uploadFile.isPending}
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

        <Card>
          <CardHeader>
            <CardTitle>Manual Entry</CardTitle>
            <CardDescription>
              Manually enter emission data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => manualEntry.mutate(data))} className="space-y-4">
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
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Natural Gas Boiler" {...field} />
                      </FormControl>
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
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="tCO2e">tCO2e</SelectItem>
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

                <Button type="submit" className="w-full" disabled={manualEntry.isPending}>
                  {manualEntry.isPending ? "Saving..." : "Save Data"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

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
                  {processingResult.category}
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
  );
}