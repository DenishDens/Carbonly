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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  SiMicrosoft, 
  SiGoogledrive, 
  SiMicrosoftteams,
  SiXero,
  SiMyob
} from "react-icons/si";
import { Building2, Zap, Database } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ELECTRICITY_PROVIDERS = [
  { id: "energyaustralia", name: "Energy Australia" },
  { id: "agl", name: "AGL" },
  { id: "origin", name: "Origin Energy" },
  { id: "alinta", name: "Alinta Energy" },
  { id: "ergon", name: "Ergon Energy" },
];

interface WizardProps {
  businessUnitId: string;
  onComplete: () => void;
}

export function IntegrationWizard({ businessUnitId, onComplete }: WizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("storage");
  const [config, setConfig] = useState({
    provider: "",
    credentials: {
      clientId: "",
      clientSecret: "",
      apiKey: "",
      apiToken: "",
      folderPath: "",
    },
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST", 
        `/api/business-units/${businessUnitId}/integrations`,
        {
          type: selectedTab,
          provider: config.provider,
          credentials: config.credentials,
        }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-units"] });
      toast({ title: "Integration connected successfully" });
      onComplete();
    },
    onError: (error: Error) => {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const renderStorageTab = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="cursor-pointer hover:border-primary" onClick={() => setConfig({ ...config, provider: "onedrive" })}>
        <CardContent className="p-6 flex items-center gap-4">
          <SiMicrosoft className="h-8 w-8" />
          <div>
            <h3 className="font-semibold">OneDrive</h3>
            <p className="text-sm text-muted-foreground">Connect OneDrive folders</p>
          </div>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:border-primary" onClick={() => setConfig({ ...config, provider: "googledrive" })}>
        <CardContent className="p-6 flex items-center gap-4">
          <SiGoogledrive className="h-8 w-8" />
          <div>
            <h3 className="font-semibold">Google Drive</h3>
            <p className="text-sm text-muted-foreground">Connect Google Drive folders</p>
          </div>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:border-primary" onClick={() => setConfig({ ...config, provider: "sharepoint" })}>
        <CardContent className="p-6 flex items-center gap-4">
          <SiMicrosoftteams className="h-8 w-8" />
          <div>
            <h3 className="font-semibold">SharePoint</h3>
            <p className="text-sm text-muted-foreground">Connect SharePoint sites</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAccountingTab = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="cursor-pointer hover:border-primary" onClick={() => setConfig({ ...config, provider: "xero" })}>
        <CardContent className="p-6 flex items-center gap-4">
          <SiXero className="h-8 w-8" />
          <div>
            <h3 className="font-semibold">Xero</h3>
            <p className="text-sm text-muted-foreground">Connect Xero accounting</p>
          </div>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:border-primary" onClick={() => setConfig({ ...config, provider: "myob" })}>
        <CardContent className="p-6 flex items-center gap-4">
          <SiMyob className="h-8 w-8" />
          <div>
            <h3 className="font-semibold">MYOB</h3>
            <p className="text-sm text-muted-foreground">Connect MYOB accounting</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderElectricityTab = () => (
    <div className="grid gap-4 md:grid-cols-2">
      {ELECTRICITY_PROVIDERS.map((provider) => (
        <Card 
          key={provider.id}
          className="cursor-pointer hover:border-primary" 
          onClick={() => setConfig({ ...config, provider: provider.id })}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <Zap className="h-8 w-8" />
            <div>
              <h3 className="font-semibold">{provider.name}</h3>
              <p className="text-sm text-muted-foreground">Connect electricity data</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderCustomTab = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Integration Name</Label>
        <Input 
          placeholder="e.g., Custom API"
          value={config.provider}
          onChange={(e) => setConfig({ ...config, provider: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>API Base URL</Label>
        <Input 
          placeholder="https://api.example.com"
          value={config.credentials.apiKey}
          onChange={(e) => setConfig({
            ...config,
            credentials: { ...config.credentials, apiKey: e.target.value }
          })}
        />
      </div>
      <div className="space-y-2">
        <Label>API Token</Label>
        <Input 
          type="password"
          placeholder="Enter API token"
          value={config.credentials.apiToken}
          onChange={(e) => setConfig({
            ...config,
            credentials: { ...config.credentials, apiToken: e.target.value }
          })}
        />
      </div>
    </div>
  );

  const renderCredentialsForm = () => {
    if (!config.provider) return null;

    return (
      <div className="space-y-4 mt-6">
        <h3 className="font-semibold">Configure {config.provider}</h3>
        {["onedrive", "googledrive", "sharepoint"].includes(config.provider) && (
          <>
            <div className="space-y-2">
              <Label>Folder Path</Label>
              <Input
                placeholder="/path/to/folder"
                value={config.credentials.folderPath}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    credentials: { ...config.credentials, folderPath: e.target.value },
                  })
                }
              />
            </div>
          </>
        )}

        {["xero", "myob"].includes(config.provider) && (
          <>
            <div className="space-y-2">
              <Label>Client ID</Label>
              <Input
                value={config.credentials.clientId}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    credentials: { ...config.credentials, clientId: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Client Secret</Label>
              <Input
                type="password"
                value={config.credentials.clientSecret}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    credentials: { ...config.credentials, clientSecret: e.target.value },
                  })
                }
              />
            </div>
          </>
        )}

        {ELECTRICITY_PROVIDERS.map(p => p.id).includes(config.provider) && (
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              value={config.credentials.apiKey}
              onChange={(e) =>
                setConfig({
                  ...config,
                  credentials: { ...config.credentials, apiKey: e.target.value },
                })
              }
            />
          </div>
        )}

        <Button
          className="w-full"
          onClick={() => connectMutation.mutate()}
          disabled={!config.provider || connectMutation.isPending}
        >
          {connectMutation.isPending ? "Connecting..." : "Connect Integration"}
        </Button>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Integration</CardTitle>
        <CardDescription>
          Connect your business unit to external services
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="storage">Storage</TabsTrigger>
            <TabsTrigger value="accounting">Accounting</TabsTrigger>
            <TabsTrigger value="electricity">Electricity</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
          <TabsContent value="storage">
            {renderStorageTab()}
          </TabsContent>
          <TabsContent value="accounting">
            {renderAccountingTab()}
          </TabsContent>
          <TabsContent value="electricity">
            {renderElectricityTab()}
          </TabsContent>
          <TabsContent value="custom">
            {renderCustomTab()}
          </TabsContent>
        </Tabs>

        {renderCredentialsForm()}
      </CardContent>
    </Card>
  );
}