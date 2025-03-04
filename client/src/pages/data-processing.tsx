
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Upload,
  FileType2,
  MailPlus,
  Database,
  CheckCircle,
  AlertTriangle,
  Loader2,
  XCircle,
  PlayCircle,
  Pencil,
  ChevronDown,
  Trash2,
  Plus,
  FlaskConical,
  CloudUpload,
  UploadCloud,
  DollarSign,
  Calendar,
  Building,
  Flame,
  ArrowUpDown,
  Zap,
  FileText,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

// Define interfaces
interface ProcessedData {
  id?: string;
  date: string;
  businessUnit: string;
  emissionSource: string;
  emissionScope: "scope1" | "scope2" | "scope3" | "unknown";
  activityType: "fuel" | "electricity" | "distance" | "material" | "other";
  activityData: number;
  activityUnit: string;
  conversionFactor: number;
  co2eEmissions: number;
  costImpact?: number;
  sourceFile: string;
  confidence: number;
  status: "processing" | "completed" | "error" | "review_required";
  notes?: string;
  materialId?: string;
}

interface MaterialMatch {
  sourceText: string;
  matchedMaterial: Material | null;
  confidence: number;
  suggestedMatches?: Material[];
  requiresReview: boolean;
}

interface Material {
  id: string;
  name: string;
  code: string;
  description: string;
  emissionFactor: number;
  unitType: string;
  supplier?: string;
  category: string;
}

interface ProcessingResult {
  id: string;
  fileName: string;
  fileType: string;
  uploadDate: string;
  status: "processing" | "completed" | "error" | "review_required";
  processedData: ProcessedData[];
  materialMatches: MaterialMatch[];
  unrecognizedMaterials: string[];
  requiresReview: boolean;
}

interface StorageProvider {
  id: string;
  name: string;
  type: "onedrive" | "googledrive" | "sharepoint" | "email";
  status: "connected" | "disconnected";
}

// Define form schema
const fileProcessingSchema = z.object({
  businessUnit: z.string().min(1, "Business unit is required"),
  date: z.string().min(1, "Date is required"),
  sourceType: z.enum(["upload", "integration", "email"]),
  integrationId: z.string().optional(),
  folderPath: z.string().optional(),
});

export default function DataProcessingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [activeTab, setActiveTab] = useState("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedProcessing, setSelectedProcessing] = useState<ProcessingResult | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewData, setReviewData] = useState<ProcessedData | null>(null);
  const [isEditingEmission, setIsEditingEmission] = useState(false);
  const [editingEmission, setEditingEmission] = useState<ProcessedData | null>(null);
  const [isReviewingMaterial, setIsReviewingMaterial] = useState(false);
  const [reviewingMaterial, setReviewingMaterial] = useState<MaterialMatch | null>(null);
  
  // Form
  const form = useForm<z.infer<typeof fileProcessingSchema>>({
    resolver: zodResolver(fileProcessingSchema),
    defaultValues: {
      businessUnit: "",
      date: new Date().toISOString().split("T")[0],
      sourceType: "upload",
    },
  });
  
  // Queries
  const { data: processingResults, isLoading: isLoadingResults } = useQuery({
    queryKey: ["processing-results"],
    queryFn: async () => {
      const response = await apiRequest("/api/data-processing/results");
      return response.json();
    },
  });
  
  const { data: businessUnits, isLoading: isLoadingBusinessUnits } = useQuery({
    queryKey: ["business-units"],
    queryFn: async () => {
      const response = await apiRequest("/api/business-units");
      return response.json();
    },
  });
  
  const { data: integrations, isLoading: isLoadingIntegrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const response = await apiRequest("/api/integrations");
      return response.json();
    },
  });
  
  // Mutations
  const uploadFile = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("/api/data-processing/upload", {
        method: "POST",
        body: data,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processing-results"] });
      toast({
        title: "File uploaded",
        description: "The file has been uploaded and is being processed.",
      });
      setFile(null);
      form.reset({
        businessUnit: "",
        date: new Date().toISOString().split("T")[0],
        sourceType: "upload",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const processIntegrationFiles = useMutation({
    mutationFn: async (data: z.infer<typeof fileProcessingSchema>) => {
      const response = await apiRequest("/api/data-processing/integration", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processing-results"] });
      toast({
        title: "Processing started",
        description: "The integration files are being processed.",
      });
      form.reset({
        businessUnit: "",
        date: new Date().toISOString().split("T")[0],
        sourceType: "upload",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process integration files. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const updateEmissionData = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<ProcessedData> }) => {
      const response = await apiRequest(`/api/data-processing/emissions/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data.updates),
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processing-results"] });
      toast({
        title: "Emission data updated",
        description: "The emission data has been updated successfully.",
      });
      setIsEditingEmission(false);
      setEditingEmission(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update emission data. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const matchMaterial = useMutation({
    mutationFn: async (data: { 
      processingId: string; 
      sourceText: string; 
      materialId: string;
    }) => {
      const response = await apiRequest(`/api/data-processing/match-material`, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processing-results"] });
      toast({
        title: "Material matched",
        description: "The material has been matched successfully.",
      });
      setIsReviewingMaterial(false);
      setReviewingMaterial(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to match material. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  const handleUploadSubmit = (values: z.infer<typeof fileProcessingSchema>) => {
    if (!file && values.sourceType === "upload") {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }
    
    if (values.sourceType === "upload") {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file as File);
      formData.append("businessUnit", values.businessUnit);
      formData.append("date", values.date);
      
      uploadFile.mutate(formData);
      setIsUploading(false);
    } else if (values.sourceType === "integration") {
      processIntegrationFiles.mutate(values);
    }
  };
  
  const handleViewProcessing = (processing: ProcessingResult) => {
    setSelectedProcessing(processing);
    setIsReviewing(true);
  };
  
  const handleEditEmission = (emission: ProcessedData) => {
    setEditingEmission({ ...emission });
    setIsEditingEmission(true);
  };
  
  const handleUpdateEmission = () => {
    if (editingEmission && editingEmission.id) {
      updateEmissionData.mutate({
        id: editingEmission.id,
        updates: editingEmission,
      });
    }
  };
  
  const handleReviewMaterial = (material: MaterialMatch) => {
    setReviewingMaterial(material);
    setIsReviewingMaterial(true);
  };
  
  const handleMatchMaterial = (materialId: string) => {
    if (reviewingMaterial && selectedProcessing) {
      matchMaterial.mutate({
        processingId: selectedProcessing.id,
        sourceText: reviewingMaterial.sourceText,
        materialId,
      });
    }
  };
  
  const getEmissionScopeColor = (scope: string) => {
    switch (scope) {
      case "scope1":
        return "bg-red-100 text-red-800";
      case "scope2":
        return "bg-yellow-100 text-yellow-800";
      case "scope3":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "error":
        return "bg-red-100 text-red-800";
      case "review_required":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Data Processing</h1>
            <p className="text-muted-foreground">
              Upload and process files for emissions data extraction
            </p>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <Database className="h-4 w-4 mr-2" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="results">
              <CheckCircle className="h-4 w-4 mr-2" />
              Processing Results
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload Files for Processing</CardTitle>
                <CardDescription>
                  Upload files to extract and process emissions data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleUploadSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="businessUnit"
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
                              {businessUnits?.map((unit: any) => (
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
                      name="sourceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source Type</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select source type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="upload">File Upload</SelectItem>
                              <SelectItem value="integration">Integration</SelectItem>
                              <SelectItem value="email">Email Attachment</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {form.watch("sourceType") === "upload" && (
                      <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="file">File</Label>
                        <div className="flex items-center gap-3">
                          <Input
                            id="file"
                            type="file"
                            onChange={handleFileChange}
                            accept=".pdf,.csv,.xlsx,.xls,.doc,.docx"
                          />
                          {file && (
                            <Button
                              variant="outline"
                              size="icon"
                              type="button"
                              onClick={() => setFile(null)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {file && (
                          <p className="text-sm text-muted-foreground">
                            Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                          </p>
                        )}
                      </div>
                    )}
                    
                    {form.watch("sourceType") === "integration" && (
                      <>
                        <FormField
                          control={form.control}
                          name="integrationId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Integration</FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select integration" />
                                </SelectTrigger>
                                <SelectContent>
                                  {integrations?.storage?.map((integration: StorageProvider) => (
                                    <SelectItem 
                                      key={integration.id} 
                                      value={integration.id}
                                      disabled={integration.status !== "connected"}
                                    >
                                      {integration.name} ({integration.type})
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
                          name="folderPath"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Folder Path</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="/invoices" />
                              </FormControl>
                              <FormDescription>
                                Enter the folder path to process files from
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                    
                    <Button type="submit" disabled={isUploading} className="w-full">
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Start Processing
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="integrations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Integrations</CardTitle>
                <CardDescription>
                  Connect to external services to import data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {integrations?.storage?.map((integration: StorageProvider) => (
                    <Card key={integration.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center">
                          {integration.type === "onedrive" && (
                            <FileText className="h-5 w-5 mr-2 text-blue-500" />
                          )}
                          {integration.type === "googledrive" && (
                            <FileText className="h-5 w-5 mr-2 text-green-500" />
                          )}
                          {integration.type === "sharepoint" && (
                            <FileText className="h-5 w-5 mr-2 text-purple-500" />
                          )}
                          {integration.type === "email" && (
                            <MailPlus className="h-5 w-5 mr-2 text-red-500" />
                          )}
                          {integration.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex justify-between items-center">
                          <Badge 
                            variant={integration.status === "connected" ? "default" : "destructive"}
                            className="mb-2"
                          >
                            {integration.status === "connected" ? "Connected" : "Not Connected"}
                          </Badge>
                        </div>
                      </CardContent>
                      <CardFooter className="border-t bg-muted/50 p-2">
                        <div className="flex justify-end w-full gap-2">
                          <Button 
                            size="sm"
                            variant="outline"
                            disabled={integration.status !== "connected"}
                            onClick={() => {
                              form.setValue("sourceType", "integration");
                              form.setValue("integrationId", integration.id);
                              setActiveTab("upload");
                            }}
                          >
                            Process Files
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="results" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Processing Results</CardTitle>
                <CardDescription>
                  View and manage processed files and their extracted data
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingResults ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : processingResults?.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Data Points</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {processingResults.map((result: ProcessingResult) => (
                          <TableRow key={result.id}>
                            <TableCell>{result.fileName}</TableCell>
                            <TableCell>{result.fileType}</TableCell>
                            <TableCell>
                              {new Date(result.uploadDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{result.processedData.length}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(result.status)}>
                                {result.status === "completed" && "Completed"}
                                {result.status === "processing" && "Processing"}
                                {result.status === "error" && "Error"}
                                {result.status === "review_required" && "Review Required"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewProcessing(result)}
                                >
                                  View
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FileType2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No processing results yet</h3>
                    <p className="text-muted-foreground mt-2">
                      Upload a file or process data from integrations to see results here.
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setActiveTab("upload")}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Files
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Review Dialog */}
        <Dialog open={isReviewing} onOpenChange={setIsReviewing}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Processing Results</DialogTitle>
              <DialogDescription>
                {selectedProcessing?.fileName} - {selectedProcessing?.processedData.length} data points
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(selectedProcessing?.status || "")}>
                    {selectedProcessing?.status === "completed" && "Completed"}
                    {selectedProcessing?.status === "processing" && "Processing"}
                    {selectedProcessing?.status === "error" && "Error"}
                    {selectedProcessing?.status === "review_required" && "Review Required"}
                  </Badge>
                  
                  {selectedProcessing?.requiresReview && (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Requires Review
                    </Badge>
                  )}
                </div>
              </div>
              
              {selectedProcessing?.unrecognizedMaterials.length > 0 && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center text-yellow-800">
                      <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600" />
                      Unrecognized Materials
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0">
                    <div className="flex flex-wrap gap-2">
                      {selectedProcessing.unrecognizedMaterials.map((material, index) => (
                        <Badge 
                          key={index} 
                          variant="outline"
                          className="cursor-pointer hover:bg-yellow-100"
                          onClick={() => {
                            const match = selectedProcessing.materialMatches.find(
                              m => m.sourceText === material
                            );
                            if (match) {
                              handleReviewMaterial(match);
                            }
                          }}
                        >
                          {material}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="py-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open("/material-library", "_blank")}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add to Material Library
                    </Button>
                  </CardFooter>
                </Card>
              )}
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Business Unit</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>CO₂e (tons)</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedProcessing?.processedData.map((data, index) => (
                      <TableRow key={index}>
                        <TableCell>{data.date}</TableCell>
                        <TableCell>{data.businessUnit}</TableCell>
                        <TableCell>{data.emissionSource}</TableCell>
                        <TableCell>
                          <Badge className={getEmissionScopeColor(data.emissionScope)}>
                            {data.emissionScope === "scope1" && "Scope 1"}
                            {data.emissionScope === "scope2" && "Scope 2"}
                            {data.emissionScope === "scope3" && "Scope 3"}
                            {data.emissionScope === "unknown" && "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {data.activityData} {data.activityUnit}
                        </TableCell>
                        <TableCell>{data.co2eEmissions.toFixed(3)}</TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div
                                    className={`h-2.5 rounded-full ${
                                      data.confidence > 0.9
                                        ? "bg-green-500"
                                        : data.confidence > 0.8
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                    }`}
                                    style={{ width: `${data.confidence * 100}%` }}
                                  ></div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Confidence: {(data.confidence * 100).toFixed(0)}%</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditEmission(data)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsReviewing(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Edit Emission Dialog */}
        <Dialog open={isEditingEmission} onOpenChange={setIsEditingEmission}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Emission Data</DialogTitle>
              <DialogDescription>
                Make changes to the extracted emission data
              </DialogDescription>
            </DialogHeader>
            
            {editingEmission && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={editingEmission.date}
                      onChange={(e) =>
                        setEditingEmission({
                          ...editingEmission,
                          date: e.target.value,
                        })
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="businessUnit">Business Unit</Label>
                    <Select
                      value={editingEmission.businessUnit}
                      onValueChange={(value) =>
                        setEditingEmission({
                          ...editingEmission,
                          businessUnit: value,
                        })
                      }
                    >
                      <SelectTrigger id="businessUnit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {businessUnits?.map((unit: any) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emissionSource">Emission Source</Label>
                    <Input
                      id="emissionSource"
                      value={editingEmission.emissionSource}
                      onChange={(e) =>
                        setEditingEmission({
                          ...editingEmission,
                          emissionSource: e.target.value,
                        })
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="emissionScope">Emission Scope</Label>
                    <Select
                      value={editingEmission.emissionScope}
                      onValueChange={(value: any) =>
                        setEditingEmission({
                          ...editingEmission,
                          emissionScope: value,
                        })
                      }
                    >
                      <SelectTrigger id="emissionScope">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scope1">Scope 1</SelectItem>
                        <SelectItem value="scope2">Scope 2</SelectItem>
                        <SelectItem value="scope3">Scope 3</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="activityType">Activity Type</Label>
                    <Select
                      value={editingEmission.activityType}
                      onValueChange={(value: any) =>
                        setEditingEmission({
                          ...editingEmission,
                          activityType: value,
                        })
                      }
                    >
                      <SelectTrigger id="activityType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fuel">Fuel</SelectItem>
                        <SelectItem value="electricity">Electricity</SelectItem>
                        <SelectItem value="distance">Distance</SelectItem>
                        <SelectItem value="material">Material</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="activityData">Activity Data</Label>
                    <Input
                      id="activityData"
                      type="number"
                      value={editingEmission.activityData}
                      onChange={(e) =>
                        setEditingEmission({
                          ...editingEmission,
                          activityData: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="activityUnit">Unit</Label>
                    <Input
                      id="activityUnit"
                      value={editingEmission.activityUnit}
                      onChange={(e) =>
                        setEditingEmission({
                          ...editingEmission,
                          activityUnit: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="conversionFactor">Conversion Factor</Label>
                    <Input
                      id="conversionFactor"
                      type="number"
                      step="0.001"
                      value={editingEmission.conversionFactor}
                      onChange={(e) =>
                        setEditingEmission({
                          ...editingEmission,
                          conversionFactor: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="costImpact">Cost Impact ($)</Label>
                    <Input
                      id="costImpact"
                      type="number"
                      step="0.01"
                      value={editingEmission.costImpact || 0}
                      onChange={(e) =>
                        setEditingEmission({
                          ...editingEmission,
                          costImpact: parseFloat(e.target.value) || undefined,
                        })
                      }
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={editingEmission.notes || ""}
                    onChange={(e) =>
                      setEditingEmission({
                        ...editingEmission,
                        notes: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditingEmission(false);
                  setEditingEmission(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateEmission}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Review Material Dialog */}
        <Dialog open={isReviewingMaterial} onOpenChange={setIsReviewingMaterial}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Material</DialogTitle>
              <DialogDescription>
                Match the detected material with an existing one or add it to the library
              </DialogDescription>
            </DialogHeader>
            
            {reviewingMaterial && (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-md">
                  <h3 className="font-medium mb-1">Detected Material:</h3>
                  <p className="text-lg">{reviewingMaterial.sourceText}</p>
                </div>
                
                {reviewingMaterial.matchedMaterial && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <h3 className="font-medium mb-1 text-green-800">Matched Material:</h3>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{reviewingMaterial.matchedMaterial.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {reviewingMaterial.matchedMaterial.code} - {reviewingMaterial.matchedMaterial.category}
                        </p>
                      </div>
                      <Badge>
                        {(reviewingMaterial.confidence * 100).toFixed(0)}% Match
                      </Badge>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <h3 className="font-medium">Suggested Matches:</h3>
                  
                  {reviewingMaterial.suggestedMatches?.length ? (
                    <div className="space-y-2">
                      {reviewingMaterial.suggestedMatches.map((material) => (
                        <div
                          key={material.id}
                          className="p-3 bg-muted rounded-md flex justify-between items-center cursor-pointer hover:bg-muted/80"
                          onClick={() => handleMatchMaterial(material.id)}
                        >
                          <div>
                            <p className="font-medium">{material.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {material.code} - {material.category}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {material.description}
                            </p>
                          </div>
                          <Button size="sm">Select</Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-muted-foreground">No suggested matches found.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <DialogFooter className="flex items-center justify-between sm:justify-between">
              <Button
                variant="outline"
                onClick={() => window.open("/material-library", "_blank")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Material
              </Button>
              <Button
                onClick={() => {
                  setIsReviewingMaterial(false);
                  setReviewingMaterial(null);
                }}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
