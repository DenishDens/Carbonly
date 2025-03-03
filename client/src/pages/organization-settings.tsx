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
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Upload, Save, Key } from "lucide-react";
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
  const [ssoConfig, setSsoConfig] = useState({
    enabled: false,
    provider: "google",
    domain: "",
    clientId: "",
    clientSecret: "",
    samlMetadata: "",
  });

  const [integrations, setIntegrations] = useState({
    xero: {
      enabled: false,
      clientId: "",
      clientSecret: "",
    },
    myob: {
      enabled: false,
      apiKey: "",
      companyFile: "",
    },
    sharepoint: {
      enabled: false,
      clientId: "",
      clientSecret: "",
      tenantId: "",
      siteUrl: "",
    },
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

  const updateSSOConfig = useMutation({
    mutationFn: async (config: typeof ssoConfig) => {
      const res = await apiRequest("PATCH", "/api/organization/sso", config);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      toast({ title: "SSO configuration updated" });
    },
  });

  const updateIntegrations = useMutation({
    mutationFn: async (data: typeof integrations) => {
      const res = await apiRequest("PATCH", "/api/organization/integrations", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      toast({ title: "Integrations updated" });
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

          <Card>
            <CardHeader>
              <CardTitle>Single Sign-On (SSO)</CardTitle>
              <CardDescription>
                Configure SSO for your organization members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="sso-enabled">Enable SSO</Label>
                <Switch
                  id="sso-enabled"
                  checked={ssoConfig.enabled}
                  onCheckedChange={(enabled) => setSsoConfig({ ...ssoConfig, enabled })}
                />
              </div>

              {ssoConfig.enabled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>SSO Provider</Label>
                    <Select
                      value={ssoConfig.provider}
                      onValueChange={(provider) => setSsoConfig({ ...ssoConfig, provider })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google">Google Workspace</SelectItem>
                        <SelectItem value="microsoft">Microsoft Azure AD</SelectItem>
                        <SelectItem value="saml">Custom SAML Provider</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Allowed Email Domain</Label>
                    <Input
                      placeholder="company.com"
                      value={ssoConfig.domain}
                      onChange={(e) => setSsoConfig({ ...ssoConfig, domain: e.target.value })}
                    />
                  </div>

                  {ssoConfig.provider === "saml" ? (
                    <div className="space-y-2">
                      <Label>SAML Metadata XML</Label>
                      <Input
                        type="file"
                        accept=".xml"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                              setSsoConfig({
                                ...ssoConfig,
                                samlMetadata: e.target?.result as string,
                              });
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Client ID</Label>
                        <Input
                          value={ssoConfig.clientId}
                          onChange={(e) => setSsoConfig({ ...ssoConfig, clientId: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Client Secret</Label>
                        <Input
                          type="password"
                          value={ssoConfig.clientSecret}
                          onChange={(e) => setSsoConfig({ ...ssoConfig, clientSecret: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  <Button
                    onClick={() => updateSSOConfig.mutate(ssoConfig)}
                    disabled={updateSSOConfig.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save SSO Configuration
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Third-Party Integrations</CardTitle>
              <CardDescription>
                Connect your accounting and document management systems
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label className="text-lg font-medium">Xero Integration</Label>
                <div className="space-y-4 pl-4">
                  <div className="flex items-center justify-between">
                    <Label>Enable Xero</Label>
                    <Switch
                      checked={integrations.xero.enabled}
                      onCheckedChange={(enabled) =>
                        setIntegrations({
                          ...integrations,
                          xero: { ...integrations.xero, enabled },
                        })
                      }
                    />
                  </div>
                  {integrations.xero.enabled && (
                    <>
                      <div className="space-y-2">
                        <Label>Client ID</Label>
                        <Input
                          value={integrations.xero.clientId}
                          onChange={(e) =>
                            setIntegrations({
                              ...integrations,
                              xero: { ...integrations.xero, clientId: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Client Secret</Label>
                        <Input
                          type="password"
                          value={integrations.xero.clientSecret}
                          onChange={(e) =>
                            setIntegrations({
                              ...integrations,
                              xero: { ...integrations.xero, clientSecret: e.target.value },
                            })
                          }
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-lg font-medium">MYOB Integration</Label>
                <div className="space-y-4 pl-4">
                  <div className="flex items-center justify-between">
                    <Label>Enable MYOB</Label>
                    <Switch
                      checked={integrations.myob.enabled}
                      onCheckedChange={(enabled) =>
                        setIntegrations({
                          ...integrations,
                          myob: { ...integrations.myob, enabled },
                        })
                      }
                    />
                  </div>
                  {integrations.myob.enabled && (
                    <>
                      <div className="space-y-2">
                        <Label>API Key</Label>
                        <Input
                          value={integrations.myob.apiKey}
                          onChange={(e) =>
                            setIntegrations({
                              ...integrations,
                              myob: { ...integrations.myob, apiKey: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Company File</Label>
                        <Input
                          value={integrations.myob.companyFile}
                          onChange={(e) =>
                            setIntegrations({
                              ...integrations,
                              myob: { ...integrations.myob, companyFile: e.target.value },
                            })
                          }
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-lg font-medium">SharePoint Integration</Label>
                <div className="space-y-4 pl-4">
                  <div className="flex items-center justify-between">
                    <Label>Enable SharePoint</Label>
                    <Switch
                      checked={integrations.sharepoint.enabled}
                      onCheckedChange={(enabled) =>
                        setIntegrations({
                          ...integrations,
                          sharepoint: { ...integrations.sharepoint, enabled },
                        })
                      }
                    />
                  </div>
                  {integrations.sharepoint.enabled && (
                    <>
                      <div className="space-y-2">
                        <Label>Client ID</Label>
                        <Input
                          value={integrations.sharepoint.clientId}
                          onChange={(e) =>
                            setIntegrations({
                              ...integrations,
                              sharepoint: { ...integrations.sharepoint, clientId: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Client Secret</Label>
                        <Input
                          type="password"
                          value={integrations.sharepoint.clientSecret}
                          onChange={(e) =>
                            setIntegrations({
                              ...integrations,
                              sharepoint: { ...integrations.sharepoint, clientSecret: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tenant ID</Label>
                        <Input
                          value={integrations.sharepoint.tenantId}
                          onChange={(e) =>
                            setIntegrations({
                              ...integrations,
                              sharepoint: { ...integrations.sharepoint, tenantId: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SharePoint Site URL</Label>
                        <Input
                          value={integrations.sharepoint.siteUrl}
                          onChange={(e) =>
                            setIntegrations({
                              ...integrations,
                              sharepoint: { ...integrations.sharepoint, siteUrl: e.target.value },
                            })
                          }
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => updateIntegrations.mutate(integrations)}
                disabled={updateIntegrations.isPending}
              >
                <Key className="h-4 w-4 mr-2" />
                Save Integration Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}