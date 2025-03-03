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
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useState } from "react";

export default function FileProcessing() {
  const { toast } = useToast();
  const [file, setFile] = useState<File>();

  const uploadFile = useMutation({
    mutationFn: async () => {
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);
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
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">File Processing</h1>
        <Card>
          <CardHeader>
            <CardTitle>Upload Report</CardTitle>
            <CardDescription>
              Upload emissions report for analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0])}
              accept=".pdf,.csv,.xlsx"
            />
            <Button
              className="w-full"
              onClick={() => uploadFile.mutate()}
              disabled={!file || uploadFile.isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              Process File
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
