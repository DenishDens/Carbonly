import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { queryClient } from "@/lib/queryClient";
import { Upload, Building2 } from "lucide-react";
import type { BusinessUnit } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();

  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  // Mount effect to ensure the component loads properly
  useEffect(() => {
    console.log("Dashboard mounted");
    return () => {
      console.log("Dashboard unmounted");
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Carbonly.ai</CardTitle>
            <CardDescription>
              Start tracking your organization's carbon emissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Select an option below to get started:</p>
            <div className="mt-4 space-y-2">
              <Button className="w-full" variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Upload Data
              </Button>
              <Button className="w-full" variant="outline">
                <Building2 className="mr-2 h-4 w-4" />
                Manage Business Units
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}