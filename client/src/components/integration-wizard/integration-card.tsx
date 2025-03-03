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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SiGoogledrive, SiXero, SiMyob } from "react-icons/si";
import { Building2, Cloud, Network, Zap } from "lucide-react";

interface IntegrationCardProps {
  businessUnitId: string;
  type: string;
  status: "connected" | "disconnected";
  folderPath?: string;
  clientId?: string;
  provider?: string;
  name?: string;
  baseUrl?: string;
}

const INTEGRATION_CONFIG = {
  onedrive: {
    name: "OneDrive",
    icon: Cloud,
    description: "Connect to OneDrive folders for automated data import",
  },
  googledrive: {
    name: "Google Drive",
    icon: SiGoogledrive,
    description: "Import data directly from Google Drive folders",
  },
  sharepoint: {
    name: "SharePoint",
    icon: Network,
    description: "Connect to SharePoint sites for document access",
  },
  xero: {
    name: "Xero",
    icon: SiXero,
    description: "Connect to Xero accounting",
  },
  myob: {
    name: "MYOB",
    icon: SiMyob,
    description: "Connect to MYOB accounting",
  },
  electricity: {
    name: "Electricity Provider",
    icon: Zap,
    description: "Connect to electricity provider data",
  },
  custom: {
    name: "Custom Integration",
    icon: Building2,
    description: "Connect to custom API endpoints",
  },
};

export function IntegrationCard({
  businessUnitId,
  type,
  status = "disconnected",
  folderPath,
  clientId,
  provider,
  name,
  baseUrl,
}: IntegrationCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConfig, setShowConfig] = useState(false);
  const [path, setPath] = useState(folderPath || "");

  const config = type === "custom" && name
    ? { ...INTEGRATION_CONFIG[type], name }
    : INTEGRATION_CONFIG[type] || INTEGRATION_CONFIG.custom;
  const Icon = config.icon;

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/business-units/${businessUnitId}/integrations`,
        {
          type,
          path,
          provider,
          name,
          baseUrl,
        }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-units"] });
      toast({ title: `${config.name} connected successfully` });
      setShowConfig(false);
    },
    onError: (error) => {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(
        "DELETE",
        `/api/business-units/${businessUnitId}/integrations/${type}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-units"] });
      toast({ title: `${config.name} disconnected` });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon className="h-6 w-6" />
            <CardTitle>{type === "electricity" && provider ? provider : config.name}</CardTitle>
          </div>
          {status === "connected" ? (
            <div className="flex items-center text-sm text-green-600">
              <div className="h-2 w-2 rounded-full bg-green-600 mr-2" />
              Connected
            </div>
          ) : (
            <div className="flex items-center text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-muted-foreground mr-2" />
              Not Connected
            </div>
          )}
        </div>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {status === "connected" ? (
          <div className="space-y-4">
            {folderPath && (
              <div className="text-sm">
                <span className="font-medium">Connected Folder:</span>{" "}
                <span className="text-muted-foreground">{folderPath}</span>
              </div>
            )}
            {clientId && (
              <div className="text-sm">
                <span className="font-medium">Client ID:</span>{" "}
                <span className="text-muted-foreground">{clientId}</span>
              </div>
            )}
            {baseUrl && (
              <div className="text-sm">
                <span className="font-medium">API URL:</span>{" "}
                <span className="text-muted-foreground">{baseUrl}</span>
              </div>
            )}
            <Button
              variant="destructive"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <Dialog open={showConfig} onOpenChange={setShowConfig}>
            <DialogTrigger asChild>
              <Button>Configure Integration</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect to {config.name}</DialogTitle>
                <DialogDescription>
                  Enter the required configuration details
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {type === "custom" ? "API Base URL" : "Folder Path"}
                  </label>
                  <Input
                    placeholder={
                      type === "custom"
                        ? "https://api.example.com"
                        : "/path/to/folder"
                    }
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {type === "custom"
                      ? "Enter the base URL for your API"
                      : "Example: /MyBusinessData/ESG/2024"}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => connectMutation.mutate()}
                  disabled={!path || connectMutation.isPending}
                >
                  Connect
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}