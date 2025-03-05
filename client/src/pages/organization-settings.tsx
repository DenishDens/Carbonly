import { DashboardLayout } from "@/components/dashboard-layout";
import { useState, useEffect } from "react";
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
import { Building2, Upload, Key, Plus, Filter, ChevronDown, ChevronUp, Search, AlertTriangle, Save, Mail, UserPlus } from "lucide-react";
import { SiXero } from "react-icons/si";
import { FaMicrosoft } from "react-icons/fa";
import { cn } from "@/lib/utils";
import type { Organization, IncidentType, InsertInvitation, Material } from "@shared/schema";
import { IntegrationWizard } from "@/components/integration-wizard/integration-wizard";
import { IntegratedDataView } from "@/components/integrated-data-view";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type InsertIncidentType = {
  name: string;
  description: string;
  active: boolean;
  organizationId: string;
};

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

  const [activeTab, setActiveTab] = useState("general");
  const [showIntegrationWizard, setShowIntegrationWizard] = useState(false);
  const [selectedIntegrationType, setSelectedIntegrationType] = useState<"xero" | "myob" | "onedrive">();

  const [incidentTypes, setIncidentTypes] = useState<InsertIncidentType[]>([]);

  const { data: organization } = useQuery<Organization>({
    queryKey: ["/api/organization"],
    enabled: user?.role === "super_admin" || user?.role === "admin",
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

  // Update the incident types query
  const { data: existingIncidentTypes, isLoading: isLoadingTypes } = useQuery<IncidentType[]>({
    queryKey: ["/api/incident-types"],
    enabled: !!user?.organizationId,
  });

  const manageIncidentTypesMutation = useMutation({
    mutationFn: async (types: InsertIncidentType[]) => {
      const validTypes = types.filter(type => type.name.trim() !== "").map(type => ({
        ...type,
        organizationId: user?.organizationId!,
      }));

      if (validTypes.length === 0) {
        throw new Error("At least one incident type with a name is required");
      }

      const res = await apiRequest("POST", "/api/incident-types", { types: validTypes });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Failed to update incident types: ${error}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incident-types"] });
      toast({ title: "Incident types updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update incident types",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize incident types
  useEffect(() => {
    if (!isLoadingTypes) {
      if (!existingIncidentTypes?.length) {
        setIncidentTypes([{
          name: "",
          description: "",
          active: true,
          organizationId: user?.organizationId!
        }]);
      } else {
        setIncidentTypes(
          existingIncidentTypes.map(type => ({
            name: type.name,
            description: type.description || "",
            active: type.active || true,
            organizationId: type.organizationId
          }))
        );
      }
    }
  }, [existingIncidentTypes, isLoadingTypes, user?.organizationId]);

  // Add validation before submission
  const handleSaveIncidentTypes = () => {
    const validTypes = incidentTypes.filter(type => type.name.trim() !== "");
    if (validTypes.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one incident type with a name is required",
        variant: "destructive",
      });
      return;
    }
    manageIncidentTypesMutation.mutate(validTypes);
  };

  // Update the access check logic
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
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

  // Add new state for invitations form
  const [invitationForm, setInvitationForm] = useState({
    email: "",
    role: "team_member" as const,
  });

  // Add the invitation mutation
  const sendInvitationMutation = useMutation({
    mutationFn: async (invitation: InsertInvitation) => {
      const res = await apiRequest("POST", "/api/invitations", invitation);
      if (!res.ok) {
        throw new Error("Failed to send invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      toast({ title: "Invitation sent successfully" });
      setInvitationForm({ email: "", role: "team_member" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get existing invitations
  const { data: invitations } = useQuery({
    queryKey: ["/api/invitations"],
    enabled: !!user?.organizationId,
  });


  // Add state for materials management
  const [newMaterial, setNewMaterial] = useState<Omit<Material, "id" | "createdAt" | "lastUpdated" | "approvalStatus">>({
    name: "",
    category: "Fuel",
    uom: "",
    emissionFactor: "0.0",
    source: "Default",
    organizationId: user?.organizationId!,
  });

  // Add Material Library queries
  const { data: materials, isLoading: isLoadingMaterials } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
    enabled: !!user?.organizationId,
  });

  const createMaterialMutation = useMutation({
    mutationFn: async (material: typeof newMaterial) => {
      if (!material.name.trim()) {
        throw new Error("Material name is required");
      }
      if (!material.uom) {
        throw new Error("Unit of measure is required");
      }
      if (!material.emissionFactor || isNaN(parseFloat(material.emissionFactor))) {
        throw new Error("Valid emission factor is required");
      }

      const res = await apiRequest("POST", "/api/materials", material);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Failed to create material: ${error}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({ title: "Material added successfully" });
      setNewMaterial({
        name: "",
        category: "Fuel",
        uom: "",
        emissionFactor: "0.0",
        source: "Default",
        organizationId: user?.organizationId!,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add material",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Organization Settings</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="protocol">Protocol</TabsTrigger>
            <TabsTrigger value="sso">SSO</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="materials">Material Library</TabsTrigger>
            <TabsTrigger value="incidents">Incident Types</TabsTrigger>
            <TabsTrigger value="team">Team Invitations</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
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
                  <CardTitle>Organization Logo</CardTitle>
                  <CardDescription>
                    Upload your organization's logo for branding
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {organization?.logo && (
                    <div className="mb-4 transition-all duration-300 hover:scale-105">
                      <Label>Current Logo</Label>
                      <img
                        src={organization.logo}
                        alt="Organization logo"
                        className="h-16 object-contain rounded-md shadow-sm"
                      />
                    </div>
                  )}
                  {logo && (
                    <div className="mb-4 animate-fade-in">
                      <Label>Preview</Label>
                      <img
                        src={URL.createObjectURL(logo)}
                        alt="Logo preview"
                        className="h-16 object-contain rounded-md shadow-sm"
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
                      <Upload className={cn("h-4 w-4 mr-2", {
                        "animate-spin": uploadLogoMutation.isPending
                      })} />
                      {uploadLogoMutation.isPending ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="protocol">
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
          </TabsContent>

          <TabsContent value="sso">
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
          </TabsContent>

          <TabsContent value="integrations">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Third-Party Integrations</CardTitle>
                  <CardDescription>
                    Connect your accounting and document management systems
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="cursor-pointer hover:bg-accent" onClick={() => {
                      setSelectedIntegrationType("xero");
                      setShowIntegrationWizard(true);
                    }}>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <SiXero className="h-8 w-8" />
                          <div>
                            <h3 className="font-semibold">Xero</h3>
                            <p className="text-sm text-muted-foreground">
                              Connect your Xero account
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="cursor-pointer hover:bg-accent" onClick={() => {
                      setSelectedIntegrationType("myob");
                      setShowIntegrationWizard(true);
                    }}>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-8 w-8" />
                          <div>
                            <h3 className="font-semibold">MYOB</h3>
                            <p className="text-sm text-muted-foreground">
                              Connect your MYOB account
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="cursor-pointer hover:bg-accent" onClick={() => {
                      setSelectedIntegrationType("onedrive");
                      setShowIntegrationWizard(true);
                    }}>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <FaMicrosoft className="h-8 w-8" />
                          <div>
                            <h3 className="font-semibold">OneDrive</h3>
                            <p className="text-sm text-muted-foreground">
                              Connect your OneDrive folders
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              <IntegratedDataView />
            </div>
          </TabsContent>

          <TabsContent value="incidents">
            <Card>
              <CardHeader>
                <CardTitle>Incident Types</CardTitle>
                <CardDescription>
                  Configure incident types for reporting and tracking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {incidentTypes.map((type, index) => (
                    <div key={index} className="flex gap-4 items-start">
                      <div className="flex-1">
                        <Input
                          placeholder="Type name"
                          value={type.name}
                          onChange={(e) => {
                            const newTypes = [...incidentTypes];
                            newTypes[index].name = e.target.value;
                            setIncidentTypes(newTypes);
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Description"
                          value={type.description}
                          onChange={(e) => {
                            const newTypes = [...incidentTypes];
                            newTypes[index].description = e.target.value;
                            setIncidentTypes(newTypes);
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={type.active}
                          onCheckedChange={(checked) => {
                            const newTypes = [...incidentTypes];
                            newTypes[index].active = checked;
                            setIncidentTypes(newTypes);
                          }}
                        />
                        <span className="text-sm">Active</span>
                        {incidentTypes.length > 1 && (
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => {
                              setIncidentTypes(types => types.filter((_, i) => i !== index));
                            }}
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIncidentTypes([
                        ...incidentTypes,
                        { name: "", description: "", active: true, organizationId: user?.organizationId! }
                      ]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Incident Type
                  </Button>
                </div>

                <Button
                  onClick={handleSaveIncidentTypes}
                  disabled={manageIncidentTypesMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Incident Types
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="materials">
            <Card>
              <CardHeader>
                <CardTitle>Material Library</CardTitle>
                <CardDescription>
                  Manage emission factors for different materials
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add New Material Form */}
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Material Name</Label>
                      <Input
                        value={newMaterial.name}
                        onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                        placeholder="e.g., Diesel"
                      />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={newMaterial.category}
                        onValueChange={(value) => setNewMaterial({ ...newMaterial, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Fuel">Fuel</SelectItem>
                          <SelectItem value="Energy">Energy</SelectItem>
                          <SelectItem value="Raw Material">Raw Material</SelectItem>
                          <SelectItem value="Waste">Waste</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Unit of Measure (UOM)</Label>
                      <Select
                        value={newMaterial.uom}
                        onValueChange={(value) => setNewMaterial({ ...newMaterial, uom: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select UOM" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">Kilograms (kg)</SelectItem>
                          <SelectItem value="liters">Liters (L)</SelectItem>
                          <SelectItem value="metric_tons">Metric Tons (t)</SelectItem>
                          <SelectItem value="kwh">Kilowatt Hours (kWh)</SelectItem>
                          <SelectItem value="cubic_meters">Cubic Meters (m³)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Emission Factor (CO₂e/unit)</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={newMaterial.emissionFactor}
                        onChange={(e) => setNewMaterial({ ...newMaterial, emissionFactor: e.target.value })}
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <Label>Source</Label>
                      <Select
                        value={newMaterial.source}
                        onValueChange={(value) => setNewMaterial({ ...newMaterial, source: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Default">Government/Industry Standard</SelectItem>
                          <SelectItem value="User-Defined">User-Defined</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      if (!user?.organizationId) {
                        toast({
                          title: "Organization required",
                          description: "You must be part of an organization to add materials",
                          variant: "destructive",
                        });
                        return;
                      }
                      createMaterialMutation.mutate(newMaterial);
                    }}
                    disabled={createMaterialMutation.isPending || !newMaterial.name.trim() || !newMaterial.uom || !newMaterial.emissionFactor}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Material
                  </Button>
                </div>

                {/* Materials Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>UOM</TableHead>
                        <TableHead>Emission Factor</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materials?.map((material) => (
                        <TableRow key={material.id}>
                          <TableCell>{material.name}</TableCell>
                          <TableCell>{material.category}</TableCell>
                          <TableCell>{material.uom}</TableCell>
                          <TableCell>{material.emissionFactor}</TableCell>
                          <TableCell>{material.source}</TableCell>
                          <TableCell>{new Date(material.lastUpdated).toLocaleDateString()}</TableCell>
                          <TableCell className="capitalize">{material.approvalStatus}</TableCell>
                        </TableRow>
                      ))}
                      {!materials?.length && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            No materials added yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team Invitations</CardTitle>
                <CardDescription>
                  Invite and manage team members for your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={invitationForm.email}
                        onChange={(e) => setInvitationForm(prev=> ({ ...prev, email: e.target.value }))}
                        placeholder="teammate@example.com"
                      />
                    </div>
                    <div className="w-48">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={invitationForm.role}
                        onValueChange={(role) => setInvitationForm(prev => ({ ...prev, role: role as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="team_member">Team Member</SelectItem>
                          <SelectItem value="business_unit_manager">Business Unit Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="auditor">Auditor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={() => {
                          if (!user?.organizationId) return;
                          sendInvitationMutation.mutate({
                            email: invitationForm.email,
                            role: invitationForm.role,
                            organizationId: user.organizationId,
                          });
                        }}
                        disabled={sendInvitationMutation.isPending || !invitationForm.email}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Send Invitation
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Sent At</TableHead>
                          <TableHead>Expires</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations?.map((invitation) => (
                          <TableRow key={invitation.id}>
                            <TableCell>{invitation.email}</TableCell>
                            <TableCell className="capitalize">
                              {invitation.role.replace(/_/g, " ")}
                            </TableCell>
                            <TableCell className="capitalize">
                              {invitation.status}
                            </TableCell>
                            <TableCell>
                              {new Date(invitation.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {new Date(invitation.expiresAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                        {!invitations?.length && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              No invitations sent yet
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        <Dialog open={showIntegrationWizard} onOpenChange={setShowIntegrationWizard}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Integration Setup</DialogTitle>
              <DialogDescription>
                Configure your integration settings
              </DialogDescription>
            </DialogHeader>
            {selectedIntegrationType && (
              <IntegrationWizard
                type={selectedIntegrationType}
                onComplete={() => setShowIntegrationWizard(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}