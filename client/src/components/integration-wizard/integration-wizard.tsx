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
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SiGoogledrive, SiXero, SiMyob } from "react-icons/si";
import { Building2, Zap, Cloud, Network, FolderOpen, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const ELECTRICITY_PROVIDERS = [
  { 
    id: "agl",
    name: "AGL",
    apiDocs: "https://api.agl.com.au/docs",
    description: "AGL Energy API integration for electricity usage data"
  },
  { 
    id: "origin",
    name: "Origin Energy",
    apiDocs: "https://api.originenergy.com.au/docs",
    description: "Origin Energy API for consumption data"
  },
  { 
    id: "energyaustralia",
    name: "Energy Australia",
    apiDocs: "https://api.energyaustralia.com.au/docs",
    description: "Energy Australia consumption data API"
  },
  { 
    id: "alinta",
    name: "Alinta Energy",
    apiDocs: "https://api.alintaenergy.com.au/docs",
    description: "Alinta Energy usage data API"
  },
  { 
    id: "ergon",
    name: "Ergon Energy",
    apiDocs: "https://api.ergon.com.au/docs",
    description: "Ergon Energy consumption data API"
  }
];

interface StorageFile {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  lastModified: string;
}

interface WizardProps {
  businessUnitId: string;
  onComplete: () => void;
}

export function IntegrationWizard({ businessUnitId, onComplete }: WizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("storage");
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [selectedPath, setSelectedPath] = useState("");
  const [config, setConfig] = useState({
    provider: "",
    credentials: {
      clientId: "",
      clientSecret: "",
      apiKey: "",
      apiToken: "",
      folderPath: "",
      accountNumber: ""
    },
  });

  // Query for fetching files from the selected storage provider
  const { data: files, refetch: refreshFiles } = useQuery({
    queryKey: ["storage-files", businessUnitId, config.provider, selectedPath],
    queryFn: async () => {
      if (!config.provider || !selectedPath) return [];
      const res = await apiRequest(
        "GET",
        `/api/business-units/${businessUnitId}/storage/${config.provider}/files`,
        { path: selectedPath }
      );
      return res.json() as Promise<StorageFile[]>;
    },
    enabled: Boolean(config.provider && selectedPath),
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
          selectedPath,
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

  const renderFileBrowser = () => (
    <Dialog open={showFileBrowser} onOpenChange={setShowFileBrowser}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select Folder</DialogTitle>
          <DialogDescription>
            Choose a folder to sync with your business unit
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-[300px] space-y-4">
          <div className="flex items-center justify-between">
            <Input
              value={selectedPath}
              onChange={(e) => setSelectedPath(e.target.value)}
              placeholder="/path/to/folder"
            />
            <Button
              variant="outline"
              className="ml-2"
              onClick={() => refreshFiles()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="border rounded-lg p-4 space-y-2">
            {files?.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 hover:bg-muted rounded-lg cursor-pointer"
                onClick={() => file.type === "folder" && setSelectedPath(file.path)}
              >
                <div className="flex items-center space-x-2">
                  {file.type === "folder" ? (
                    <FolderOpen className="h-4 w-4" />
                  ) : (
                    <div className="h-4 w-4 border rounded" />
                  )}
                  <span>{file.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(file.lastModified).toLocaleDateString()}
                </span>
              </div>
            ))}
            {!files?.length && (
              <div className="text-center text-muted-foreground py-8">
                No files found in this location
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => setShowFileBrowser(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderStorageTab = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card 
          className="cursor-pointer hover:border-primary" 
          onClick={() => {
            setConfig({ ...config, provider: "onedrive" });
            setShowFileBrowser(true);
          }}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <Cloud className="h-8 w-8" />
            <div>
              <h3 className="font-semibold">OneDrive</h3>
              <p className="text-sm text-muted-foreground">Connect OneDrive folders</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-primary" 
          onClick={() => {
            setConfig({ ...config, provider: "googledrive" });
            setShowFileBrowser(true);
          }}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <SiGoogledrive className="h-8 w-8" />
            <div>
              <h3 className="font-semibold">Google Drive</h3>
              <p className="text-sm text-muted-foreground">Connect Google Drive folders</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-primary" 
          onClick={() => {
            setConfig({ ...config, provider: "sharepoint" });
            setShowFileBrowser(true);
          }}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <Network className="h-8 w-8" />
            <div>
              <h3 className="font-semibold">SharePoint</h3>
              <p className="text-sm text-muted-foreground">Connect SharePoint sites</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {renderFileBrowser()}
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
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground pb-4">
        Select your electricity provider to connect their API for automated consumption data tracking.
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {ELECTRICITY_PROVIDERS.map((provider) => (
          <Card 
            key={provider.id}
            className="cursor-pointer hover:border-primary" 
            onClick={() => setConfig({ ...config, provider: provider.id })}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <Zap className="h-8 w-8" />
                <div>
                  <h3 className="font-semibold">{provider.name}</h3>
                  <p className="text-sm text-muted-foreground">{provider.description}</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                <a 
                  href={provider.apiDocs} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  View API Documentation →
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
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

    const selectedProvider = ELECTRICITY_PROVIDERS.find(p => p.id === config.provider);

    return (
      <div className="space-y-4 mt-6">
        <h3 className="font-semibold">
          Configure {selectedProvider ? selectedProvider.name : config.provider}
        </h3>
        {["onedrive", "googledrive", "sharepoint"].includes(config.provider) && (
          <>
            <div className="space-y-2">
              <Label>Selected Folder</Label>
              <div className="flex items-center space-x-2">
                <Input
                  value={selectedPath}
                  readOnly
                  placeholder="No folder selected"
                />
                <Button
                  variant="outline"
                  onClick={() => setShowFileBrowser(true)}
                >
                  Browse
                </Button>
              </div>
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
          <>
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
                placeholder="Enter your API key"
              />
            </div>
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input
                value={config.credentials.accountNumber}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    credentials: { ...config.credentials, accountNumber: e.target.value },
                  })
                }
                placeholder="Enter your account number"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              You can find your API credentials in your {selectedProvider?.name} account dashboard.
            </p>
          </>
        )}

        {config.provider === "custom" && (
          <>
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
                onChange={(e) =>
                  setConfig({
                    ...config,
                    credentials: { ...config.credentials, apiKey: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>API Token</Label>
              <Input
                type="password"
                placeholder="Enter API token"
                value={config.credentials.apiToken}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    credentials: { ...config.credentials, apiToken: e.target.value },
                  })
                }
              />
            </div>
          </>
        )}

        <Button
          className="w-full"
          onClick={() => connectMutation.mutate()}
          disabled={!config.provider || (!selectedPath && ["onedrive", "googledrive", "sharepoint"].includes(config.provider)) || connectMutation.isPending}
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