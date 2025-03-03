import { DashboardLayout } from "@/components/dashboard-layout";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Upload, Save } from "lucide-react";
import type { Organization } from "@shared/schema";

export default function OrganizationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [slug, setSlug] = useState("");
  const [logo, setLogo] = useState<File>();
  const [protocolVersion, setProtocolVersion] = useState("2024");
  const [defaultScope, setDefaultScope] = useState("Scope 1");
  const [emissionFactors, setEmissionFactors] = useState({
    electricity: "0.0",
    naturalGas: "0.0",
    diesel: "0.0",
    gasoline: "0.0",
  });

  const { data: organization } = useQuery<Organization>({
    queryKey: ["/api/organization"],
    enabled: user?.role === "super_admin",
  });

  const updateSlugMutation = useMutation({
    mutationFn: async (slug: string) => {
      const res = await apiRequest("PATCH", "/api/organization/slug", { slug });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      toast({
        title: "Organization URL updated",
        description: "You may need to refresh the page for changes to take effect.",
      });
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (logo: File) => {
      const formData = new FormData();
      formData.append("logo", logo);
      const res = await apiRequest("POST", "/api/organization/logo", formData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      toast({ title: "Logo uploaded successfully" });
      setLogo(undefined);
    },
  });

  const updateProtocolSettingsMutation = useMutation({
    mutationFn: async (data: {
      protocolVersion: string;
      defaultScope: string;
      emissionFactors: typeof emissionFactors;
    }) => {
      const res = await apiRequest("PATCH", "/api/organization/protocol-settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      toast({ title: "Protocol settings updated" });
    },
  });

  // Only super admins can access this page
  if (user?.role !== "super_admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Only organization administrators can access settings
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Organization Settings</h1>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization URL</CardTitle>
              <CardDescription>
                Set your custom URL for accessing Carbonly.ai
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 items-center">
                <span className="text-muted-foreground">carbonly.ai/</span>
                <Input
                  placeholder={organization?.slug || "your-org"}
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={() => updateSlugMutation.mutate(slug)}
                  disabled={!slug || updateSlugMutation.isPending}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Update URL
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Protocol Settings</CardTitle>
              <CardDescription>
                Configure emission calculation protocol and factors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Protocol Version</Label>
                  <Select
                    value={protocolVersion}
                    onValueChange={setProtocolVersion}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">GHG Protocol 2024</SelectItem>
                      <SelectItem value="2023">GHG Protocol 2023</SelectItem>
                      <SelectItem value="2022">GHG Protocol 2022</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Default Scope</Label>
                  <Select
                    value={defaultScope}
                    onValueChange={setDefaultScope}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Scope 1">Scope 1 (Direct)</SelectItem>
                      <SelectItem value="Scope 2">Scope 2 (Indirect)</SelectItem>
                      <SelectItem value="Scope 3">Scope 3 (Value Chain)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label>Emission Factors (kgCO2e per unit)</Label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Electricity (per kWh)</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={emissionFactors.electricity}
                        onChange={(e) => setEmissionFactors({
                          ...emissionFactors,
                          electricity: e.target.value,
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Natural Gas (per m³)</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={emissionFactors.naturalGas}
                        onChange={(e) => setEmissionFactors({
                          ...emissionFactors,
                          naturalGas: e.target.value,
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Diesel (per L)</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={emissionFactors.diesel}
                        onChange={(e) => setEmissionFactors({
                          ...emissionFactors,
                          diesel: e.target.value,
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gasoline (per L)</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={emissionFactors.gasoline}
                        onChange={(e) => setEmissionFactors({
                          ...emissionFactors,
                          gasoline: e.target.value,
                        })}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => updateProtocolSettingsMutation.mutate({
                    protocolVersion,
                    defaultScope,
                    emissionFactors,
                  })}
                  disabled={updateProtocolSettingsMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Protocol Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization Logo</CardTitle>
              <CardDescription>
                Upload your organization's logo for branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {organization?.logo && (
                <div className="mb-4">
                  <Label>Current Logo</Label>
                  <img
                    src={organization.logo}
                    alt="Organization logo"
                    className="h-16 object-contain"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="file"
                  onChange={(e) => setLogo(e.target.files?.[0])}
                  accept="image/*"
                />
                <Button
                  variant="secondary"
                  onClick={() => logo && uploadLogoMutation.mutate(logo)}
                  disabled={!logo || uploadLogoMutation.isPending}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}