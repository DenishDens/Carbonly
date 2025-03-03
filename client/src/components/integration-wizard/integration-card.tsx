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
import { SiMicrosoft, SiGoogledrive, SiMicrosoftteams } from "react-icons/si";
import { Check, X } from "lucide-react";

interface IntegrationCardProps {
  businessUnitId: string;
  type: "onedrive" | "googledrive" | "sharepoint";
  status?: "connected" | "disconnected";
  folderPath?: string;
}

const INTEGRATION_CONFIG = {
  onedrive: {
    name: "OneDrive",
    icon: SiMicrosoft,
    description: "Connect to OneDrive folders for automated data import",
  },
  googledrive: {
    name: "Google Drive",
    icon: SiGoogledrive,
    description: "Import data directly from Google Drive folders",
  },
  sharepoint: {
    name: "SharePoint",
    icon: SiMicrosoftteams, // Using Teams icon as a fallback for SharePoint
    description: "Connect to SharePoint sites for document access",
  },
};

export function IntegrationCard({
  businessUnitId,
  type,
  status = "disconnected",
  folderPath,
}: IntegrationCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConfig, setShowConfig] = useState(false);
  const [path, setPath] = useState(folderPath || "");

  const config = INTEGRATION_CONFIG[type];
  const Icon = config.icon;

  const connectIntegration = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/business-units/${businessUnitId}/integrations`, {
        type,
        path,
      });
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

  const disconnectIntegration = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/business-units/${businessUnitId}/integrations/${type}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-units"] });
      toast({ title: `${config.name} disconnected` });
    },
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Icon className="h-6 w-6" />
              <CardTitle>{config.name}</CardTitle>
            </div>
            {status === "connected" ? (
              <div className="flex items-center text-sm text-green-600">
                <Check className="h-4 w-4 mr-1" />
                Connected
              </div>
            ) : (
              <div className="flex items-center text-sm text-muted-foreground">
                <X className="h-4 w-4 mr-1" />
                Not Connected
              </div>
            )}
          </div>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "connected" ? (
            <div className="space-y-4">
              <div className="text-sm">
                <span className="font-medium">Connected Folder:</span>{" "}
                <span className="text-muted-foreground">{folderPath}</span>
              </div>
              <Button
                variant="destructive"
                onClick={() => disconnectIntegration.mutate()}
                disabled={disconnectIntegration.isPending}
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
                    Enter the folder path to sync data from
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Folder Path</label>
                    <Input
                      placeholder={`Enter ${config.name} folder path`}
                      value={path}
                      onChange={(e) => setPath(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Example: /MyBusinessData/ESG/2024
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => connectIntegration.mutate()}
                    disabled={!path || connectIntegration.isPending}
                  >
                    Connect
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>
    </>
  );
}