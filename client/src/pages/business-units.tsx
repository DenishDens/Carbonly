import { DashboardLayout } from "@/components/dashboard-layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Edit, Trash2, Settings, Plus } from "lucide-react";
import type { BusinessUnit, User, Team } from "@shared/schema";
import { useState } from "react";
import { InviteUsersDialog } from "@/components/invite-users-dialog";
import { Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntegrationCard } from "@/components/integration-wizard/integration-card";
import { IntegrationWizard } from "@/components/integration-wizard/integration-wizard";


const UNIT_LABELS = [
  "Business Unit",
  "Project",
  "Division",
  "Department",
  "Branch",
  "Region",
  "Custom",
];

const UNIT_STATUSES = ["active", "inactive", "archived"];

const PROTOCOLS = [
  { id: "org", label: "Use Organization Settings" },
  { id: "2024", label: "GHG Protocol 2024" },
  { id: "2023", label: "GHG Protocol 2023" },
  { id: "2022", label: "GHG Protocol 2022" },
];

export default function BusinessUnits() {
  const { toast } = useToast();
  const [editingUnit, setEditingUnit] = useState<BusinessUnit>();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<BusinessUnit>();
  const [newUnit, setNewUnit] = useState({
    name: "",
    label: "",
    description: "",
    location: "",
    category: "",
    status: "active",
    managerId: "",
    teamId: "",
    protocolSettings: {
      version: "org",
      emissionFactors: {
        electricity: "",
        naturalGas: "",
        diesel: "",
        gasoline: "",
      },
    },
  });
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedUnitForInvite, setSelectedUnitForInvite] = useState<BusinessUnit>();

  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const createBusinessUnit = useMutation({
    mutationFn: async (data: typeof newUnit) => {
      const res = await apiRequest("POST", "/api/business-units", data);
      return res.json();
    },
    onSuccess: (createdUnit) => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-units"] });
      toast({ title: "Business unit created" });
      setShowAddDialog(false);
      setNewUnit({
        name: "",
        label: "",
        description: "",
        location: "",
        category: "",
        status: "active",
        managerId: "none",
        teamId: "none",
        protocolSettings: {
          version: "org",
          emissionFactors: {
            electricity: "",
            naturalGas: "",
            diesel: "",
            gasoline: "",
          },
        },
      });
      setSelectedUnitForInvite(createdUnit);
      setShowInviteDialog(true);
    },
  });

  const updateBusinessUnit = useMutation({
    mutationFn: async ({ id, ...data }: BusinessUnit) => {
      const res = await apiRequest("PATCH", `/api/business-units/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-units"] });
      toast({ title: "Business unit updated" });
      setEditingUnit(undefined);
    },
  });

  const deleteBusinessUnit = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/business-units/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-units"] });
      toast({ title: "Business unit deleted" });
    },
  });

  const updateProtocolSettings = useMutation({
    mutationFn: async ({ id, protocolSettings }: { id: string; protocolSettings: any }) => {
      const res = await apiRequest("PATCH", `/api/business-units/${id}/protocol-settings`, protocolSettings);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-units"] });
      toast({ title: "Protocol settings updated" });
      setShowSettingsDialog(false);
      setSelectedUnit(undefined);
    },
  });

  const UnitForm = ({ data, onChange }: { data: any; onChange: (data: any) => void }) => {
    return (
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            placeholder="Enter business unit name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="label">Label</Label>
          <Select
            value={data.label}
            onValueChange={(value) => onChange({ ...data, label: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select label type" />
            </SelectTrigger>
            <SelectContent>
              {UNIT_LABELS.map((label) => (
                <SelectItem key={label} value={label.toLowerCase()}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={data.description}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            placeholder="Enter description"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={data.location}
            onChange={(e) => onChange({ ...data, location: e.target.value })}
            placeholder="e.g., Queensland, Victoria"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={data.category}
            onChange={(e) => onChange({ ...data, category: e.target.value })}
            placeholder="e.g., Commercial, Residential"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="manager">Manager</Label>
          <Select
            value={data.managerId}
            onValueChange={(value) => onChange({ ...data, managerId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select manager" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Manager</SelectItem>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="team">Team</Label>
          <Select
            value={data.teamId}
            onValueChange={(value) => onChange({ ...data, teamId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Team</SelectItem>
              {teams?.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={data.status}
            onValueChange={(value) => onChange({ ...data, status: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {UNIT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  const ProtocolSettingsForm = ({ unit }: { unit: BusinessUnit }) => {
    const [settings, setSettings] = useState(unit.protocolSettings || {
      version: "org",
      emissionFactors: {
        electricity: "",
        naturalGas: "",
        diesel: "",
        gasoline: "",
      },
    });

    return (
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Protocol Version</Label>
          <Select
            value={settings.version}
            onValueChange={(value) => setSettings({ ...settings, version: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROTOCOLS.map((protocol) => (
                <SelectItem key={protocol.id} value={protocol.id}>
                  {protocol.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {settings.version !== "org" && (
          <div className="space-y-4">
            <Label>Emission Factors Override (kgCO2e per unit)</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Electricity (per kWh)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={settings.emissionFactors.electricity}
                  onChange={(e) => setSettings({
                    ...settings,
                    emissionFactors: {
                      ...settings.emissionFactors,
                      electricity: e.target.value,
                    },
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Natural Gas (per m³)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={settings.emissionFactors.naturalGas}
                  onChange={(e) => setSettings({
                    ...settings,
                    emissionFactors: {
                      ...settings.emissionFactors,
                      naturalGas: e.target.value,
                    },
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Diesel (per L)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={settings.emissionFactors.diesel}
                  onChange={(e) => setSettings({
                    ...settings,
                    emissionFactors: {
                      ...settings.emissionFactors,
                      diesel: e.target.value,
                    },
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Gasoline (per L)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={settings.emissionFactors.gasoline}
                  onChange={(e) => setSettings({
                    ...settings,
                    emissionFactors: {
                      ...settings.emissionFactors,
                      gasoline: e.target.value,
                    },
                  })}
                />
              </div>
            </div>
          </div>
        )}

        <Button
          className="w-full mt-4"
          onClick={() => updateProtocolSettings.mutate({
            id: unit.id,
            protocolSettings: settings,
          })}
          disabled={updateProtocolSettings.isPending}
        >
          Save Protocol Settings
        </Button>
      </div>
    );
  };

  const IntegrationsForm = ({ unit }: { unit: BusinessUnit }) => {
    const [showWizard, setShowWizard] = useState(false);

    return (
      <div className="space-y-4">
        {showWizard ? (
          <IntegrationWizard
            businessUnitId={unit.id}
            onComplete={() => setShowWizard(false)}
          />
        ) : (
          <div className="space-y-4">
            <Button onClick={() => setShowWizard(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add New Integration
            </Button>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Storage Integrations */}
              {unit.integrations?.storage?.onedrive && (
                <IntegrationCard
                  businessUnitId={unit.id}
                  type="onedrive"
                  status={unit.integrations.storage.onedrive.status}
                  folderPath={unit.integrations.storage.onedrive.path}
                />
              )}
              {unit.integrations?.storage?.googledrive && (
                <IntegrationCard
                  businessUnitId={unit.id}
                  type="googledrive"
                  status={unit.integrations.storage.googledrive.status}
                  folderPath={unit.integrations.storage.googledrive.path}
                />
              )}
              {unit.integrations?.storage?.sharepoint && (
                <IntegrationCard
                  businessUnitId={unit.id}
                  type="sharepoint"
                  status={unit.integrations.storage.sharepoint.status}
                  folderPath={unit.integrations.storage.sharepoint.path}
                />
              )}

              {/* Accounting Integrations */}
              {unit.integrations?.accounting?.xero && (
                <IntegrationCard
                  businessUnitId={unit.id}
                  type="xero"
                  status={unit.integrations.accounting.xero.status}
                  clientId={unit.integrations.accounting.xero.clientId}
                />
              )}
              {unit.integrations?.accounting?.myob && (
                <IntegrationCard
                  businessUnitId={unit.id}
                  type="myob"
                  status={unit.integrations.accounting.myob.status}
                  clientId={unit.integrations.accounting.myob.clientId}
                />
              )}

              {/* Electricity Integration */}
              {unit.integrations?.electricity && (
                <IntegrationCard
                  businessUnitId={unit.id}
                  type="electricity"
                  status={unit.integrations.electricity.status}
                  provider={unit.integrations.electricity.provider}
                />
              )}

              {/* Custom Integrations */}
              {unit.integrations?.custom?.map((integration, index) => (
                <IntegrationCard
                  key={index}
                  businessUnitId={unit.id}
                  type="custom"
                  status={integration.status}
                  name={integration.name}
                  baseUrl={integration.baseUrl}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Business Units</h1>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Building2 className="h-4 w-4 mr-2" />
                Add Business Unit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Business Unit</DialogTitle>
                <DialogDescription>
                  Create a new business unit to track emissions
                </DialogDescription>
              </DialogHeader>
              <UnitForm data={newUnit} onChange={setNewUnit} />
              <DialogFooter>
                <Button
                  onClick={() => createBusinessUnit.mutate(newUnit)}
                  disabled={!newUnit.name || createBusinessUnit.isPending}
                >
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {businessUnits?.map((unit) => (
            <Card key={unit.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">{unit.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {unit.label && (
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {unit.label}
                      </span>
                    )}
                    {unit.location && <span>📍 {unit.location}</span>}
                  </div>
                  {unit.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {unit.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setEditingUnit(unit)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => deleteBusinessUnit.mutate(unit.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedUnitForInvite(unit);
                      setShowInviteDialog(true);
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedUnit(unit);
                      setShowSettingsDialog(true);
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {businessUnits?.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No business units found. Create your first one to get started.
              </CardContent>
            </Card>
          )}
        </div>

        {editingUnit && (
          <Dialog open={!!editingUnit} onOpenChange={() => setEditingUnit(undefined)}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Business Unit</DialogTitle>
                <DialogDescription>
                  Update the business unit details
                </DialogDescription>
              </DialogHeader>
              <UnitForm
                data={editingUnit}
                onChange={(data) => setEditingUnit({ ...editingUnit, ...data })}
              />
              <DialogFooter>
                <Button
                  onClick={() => updateBusinessUnit.mutate(editingUnit)}
                  disabled={updateBusinessUnit.isPending}
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {selectedUnit && (
          <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Settings - {selectedUnit.name}</DialogTitle>
                <DialogDescription>
                  Configure settings and integrations for this business unit
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="protocol">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="protocol">Protocol Settings</TabsTrigger>
                  <TabsTrigger value="integrations">Integrations</TabsTrigger>
                </TabsList>
                <TabsContent value="protocol">
                  <ProtocolSettingsForm unit={selectedUnit} />
                </TabsContent>
                <TabsContent value="integrations">
                  <IntegrationsForm unit={selectedUnit} />
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        )}

        {selectedUnitForInvite && (
          <InviteUsersDialog
            open={showInviteDialog}
            onOpenChange={setShowInviteDialog}
            businessUnitId={selectedUnitForInvite.id}
            businessUnitName={selectedUnitForInvite.name}
          />
        )}
      </div>
    </DashboardLayout>
  );
}