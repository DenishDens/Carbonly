import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Upload, Building2, LogOut } from "lucide-react";
import type { BusinessUnit, Emission } from "@shared/schema";
import { OnboardingWizard } from "@/components/onboarding-wizard";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [selectedUnit, setSelectedUnit] = useState<string>();
  const [file, setFile] = useState<File>();
  const [showOnboarding, setShowOnboarding] = useState(true);

  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const { data: emissions } = useQuery<Emission[]>({
    queryKey: ["/api/business-units", selectedUnit, "emissions"],
    enabled: !!selectedUnit,
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/business-units", selectedUnit, "emissions"],
      });
      setFile(undefined);
      toast({ title: "File processed successfully" });
    },
  });

  const chartData = emissions?.map((e) => ({
    date: new Date(e.date).toLocaleDateString(),
    amount: parseFloat(e.amount),
    source: e.emissionSource,
    scope: e.scope,
  }));

  // Show onboarding wizard if user has no business units
  if (showOnboarding && businessUnits?.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Carbonly.ai</h1>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">{user?.email}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logoutMutation.mutate()}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Carbonly.ai</h1>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">{user?.email}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
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
                <Input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0])}
                  accept=".pdf,.csv,.xlsx"
                />
                <Button
                  className="w-full"
                  onClick={() => uploadFile.mutate()}
                  disabled={!file || !selectedUnit || uploadFile.isPending}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Process File
                </Button>
              </CardContent>
            </Card>
          </div>

          {emissions && emissions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Emissions Overview</CardTitle>
                <CardDescription>
                  Breakdown of emissions by scope and source
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="amount" fill="var(--primary)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}