import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, Building2 } from "lucide-react";
import type { BusinessUnit } from "@shared/schema";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = z.object({
  businessUnitId: z.string().min(1, "Please select a business unit"),
});

type FormData = z.infer<typeof formSchema>;

export default function Dashboard() {
  const { toast } = useToast();
  const [file, setFile] = useState<File>();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const createBusinessUnit = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/business-units", { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-units"] });
      toast({ title: "Business unit created" });
    },
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
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Business Overview</CardTitle>
              <CardDescription>
                Manage your business units and track emissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Form {...form}>
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
              </Form>
              <div className="flex gap-2">
                <Input
                  placeholder="Add new business unit"
                  onChange={(e) =>
                    createBusinessUnit.mutate(e.currentTarget.value)
                  }
                />
                <Button size="icon">
                  <Building2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Processing</CardTitle>
              <CardDescription>
                Upload and process emission data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0])}
                  accept=".pdf,.csv,.xlsx"
                />
                {!form.getValues("businessUnitId") && (
                  <p className="text-sm text-destructive">Please select a business unit first</p>
                )}
              </div>
              <Button
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
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}