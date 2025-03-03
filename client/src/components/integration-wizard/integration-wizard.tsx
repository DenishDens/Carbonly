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
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SiXero } from "react-icons/si";
import { FaMicrosoft } from "react-icons/fa";
import { Building2 } from "lucide-react";

interface Company {
  id: string;
  name: string;
  identifier: string;
}

interface Folder {
  id: string;
  name: string;
  path: string;
}

const STEPS: Record<string, string[]> = {
  XERO: ["Connect", "Select Company", "Map Categories", "Confirm"],
  MYOB: ["Connect", "Select File", "Map Categories", "Confirm"],
  ONEDRIVE: ["Connect", "Select Folders", "Set Sync Schedule", "Confirm"],
};

interface WizardProps {
  type: "xero" | "myob" | "onedrive";
  onComplete: () => void;
}

export function IntegrationWizard({ type, onComplete }: WizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({
    credentials: {
      clientId: "",
      clientSecret: "",
      apiKey: "",
    },
    mapping: {
      companies: [] as Company[],
      selectedCompany: "",
      folders: [] as Folder[],
      selectedFolders: [] as string[],
      categoryMappings: {} as Record<string, string>,
    },
    schedule: {
      frequency: "hourly",
      folders: [] as string[],
    },
  });

  const steps = STEPS[type.toUpperCase()];

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/integrations/${type}/connect`, config.credentials);
      return res.json();
    },
    onSuccess: (data: { companies?: Company[]; folders?: Folder[] }) => {
      setConfig((prev) => ({
        ...prev,
        mapping: {
          ...prev.mapping,
          companies: data.companies || [],
          folders: data.folders || [],
        },
      }));
      setStep((s) => s + 1);
      toast({ title: "Connected successfully" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/integrations/${type}/complete`, config);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      toast({ title: "Integration setup complete" });
      onComplete();
    },
  });

  const getIcon = () => {
    switch (type) {
      case "xero":
        return <SiXero className="h-8 w-8" />;
      case "myob":
        return <Building2 className="h-8 w-8" />;
      case "onedrive":
        return <FaMicrosoft className="h-8 w-8" />;
    }
  };

  const renderStep = () => {
    switch (steps[step]) {
      case "Connect":
        return (
          <div className="space-y-4">
            {type !== "onedrive" && (
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
            )}
            {type === "xero" && (
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
            )}
            {type === "myob" && (
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
              disabled={connectMutation.isPending}
            >
              Connect
            </Button>
          </div>
        );

      case "Select Company":
      case "Select File":
        return (
          <div className="space-y-4">
            {config.mapping.companies.map((company) => (
              <Card
                key={company.id}
                className={`cursor-pointer transition-colors ${
                  config.mapping.selectedCompany === company.id
                    ? "border-primary"
                    : "hover:border-primary/50"
                }`}
                onClick={() =>
                  setConfig({
                    ...config,
                    mapping: { ...config.mapping, selectedCompany: company.id },
                  })
                }
              >
                <CardContent className="p-4">
                  <h3 className="font-medium">{company.name}</h3>
                  <p className="text-sm text-muted-foreground">{company.identifier}</p>
                </CardContent>
              </Card>
            ))}
            <Button
              className="w-full"
              onClick={() => setStep((s) => s + 1)}
              disabled={!config.mapping.selectedCompany}
            >
              Next
            </Button>
          </div>
        );

      case "Select Folders":
        return (
          <div className="space-y-4">
            {config.mapping.folders.map((folder) => (
              <Card
                key={folder.id}
                className={`cursor-pointer transition-colors ${
                  config.mapping.selectedFolders.includes(folder.id)
                    ? "border-primary"
                    : "hover:border-primary/50"
                }`}
                onClick={() => {
                  const folders = config.mapping.selectedFolders.includes(folder.id)
                    ? config.mapping.selectedFolders.filter((id) => id !== folder.id)
                    : [...config.mapping.selectedFolders, folder.id];
                  setConfig({
                    ...config,
                    mapping: { ...config.mapping, selectedFolders: folders },
                  });
                }}
              >
                <CardContent className="p-4">
                  <h3 className="font-medium">{folder.name}</h3>
                  <p className="text-sm text-muted-foreground">{folder.path}</p>
                </CardContent>
              </Card>
            ))}
            <Button
              className="w-full"
              onClick={() => setStep((s) => s + 1)}
              disabled={config.mapping.selectedFolders.length === 0}
            >
              Next
            </Button>
          </div>
        );

      case "Map Categories":
        return (
          <div className="space-y-4">
            {/* Add category mapping UI here */}
            <Button className="w-full" onClick={() => setStep((s) => s + 1)}>
              Next
            </Button>
          </div>
        );

      case "Set Sync Schedule":
        return (
          <div className="space-y-4">
            {/* Add sync schedule UI here */}
            <Button className="w-full" onClick={() => setStep((s) => s + 1)}>
              Next
            </Button>
          </div>
        );

      case "Confirm":
        return (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-medium">Configuration Summary</h3>
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>
            <Button
              className="w-full"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
            >
              Complete Setup
            </Button>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {getIcon()}
          <div>
            <CardTitle>
              {type === "onedrive" ? "OneDrive" : type.toUpperCase()} Integration
            </CardTitle>
            <CardDescription>Step {step + 1} of {steps.length}: {steps[step]}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{renderStep()}</CardContent>
    </Card>
  );
}