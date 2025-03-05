import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateBusinessUnitDialog } from "./business-units/create";
import {
  AlertTriangle,
  Building2,
  Filter,
  ChevronDown,
  ChevronUp,
  Search,
  Settings,
  Users,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BusinessUnit, User } from "@shared/schema";
import { InviteUsersDialog } from "@/components/invite-users-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntegrationCard } from "@/components/integration-wizard/integration-card";
import { IntegrationWizard } from "@/components/integration-wizard/integration-wizard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBusinessUnitSchema, updateBusinessUnitSchema } from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";


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

const UnitForm = ({
  data,
  onSubmit,
  users
}: {
  data?: BusinessUnit;
  onSubmit: (data: any) => void;
  users: User[];
}) => {
  const form = useForm({
    resolver: zodResolver(data ? updateBusinessUnitSchema : insertBusinessUnitSchema),
    defaultValues: data || {
      name: "",
      projectCode: "",
      label: "",
      description: "",
      location: "",
      category: "",
      status: "active",
      managerId: "none",
      protocolSettings: {
        version: "org",
        emissionFactors: {
          electricity: "",
          naturalGas: "",
          diesel: "",
          gasoline: "",
        },
      },
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter business unit name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="projectCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Code</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g., PRJ-001"
                  className="uppercase"
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <p className="text-sm text-muted-foreground">
                Use uppercase letters, numbers, and hyphens only (e.g., PRJ-001)
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Label</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select label type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {UNIT_LABELS.map((label) => (
                    <SelectItem key={label} value={label.toLowerCase()}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Enter description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Queensland, Victoria" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Commercial, Residential" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="managerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Manager</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No Manager</SelectItem>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {UNIT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit">
            {data ? "Save Changes" : "Create Business Unit"}
          </Button>
        </div>
      </form>
    </Form>
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

export default function BusinessUnits() {
  const { toast } = useToast();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    label: 'all',
    status: 'all',
    category: 'all',
  });
  const [editingUnit, setEditingUnit] = useState<BusinessUnit>();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<BusinessUnit>();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedUnitForInvite, setSelectedUnitForInvite] = useState<BusinessUnit>();

  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createBusinessUnit = useMutation({
    mutationFn: async (data: BusinessUnit) => {
      const res = await apiRequest("POST", "/api/business-units", data);
      return res.json();
    },
    onSuccess: (createdUnit) => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-units"] });
      toast({ title: "Business unit created" });
      setShowAddDialog(false);
      setSelectedUnitForInvite(createdUnit);
      setShowInviteDialog(true);
    },
  });

  const updateBusinessUnit = useMutation({
    mutationFn: async (data: BusinessUnit) => {
      const res = await apiRequest("PATCH", `/api/business-units/${data.id}`, data);
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

  // Filter and search logic
  const filteredUnits = businessUnits?.filter(unit => {
    // Apply filters
    if (filters.label !== 'all' && unit.label !== filters.label) return false;
    if (filters.status !== 'all' && unit.status !== filters.status) return false;
    if (filters.category !== 'all' && unit.category !== filters.category) return false;

    // Apply text search across all fields
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        unit.name.toLowerCase().includes(searchLower) ||
        unit.description?.toLowerCase().includes(searchLower) ||
        unit.location?.toLowerCase().includes(searchLower) ||
        unit.projectCode?.toLowerCase().includes(searchLower) ||
        unit.category?.toLowerCase().includes(searchLower) ||
        unit.label?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Get unique categories for filter
  const uniqueCategories = [...new Set(businessUnits?.map(unit => unit.category).filter(Boolean))];

  const activeFiltersCount = Object.values(filters).filter(v => v !== 'all').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Business Units</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs">
                  {activeFiltersCount}
                </span>
              )}
              {showFilters ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
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
                <UnitForm
                  onSubmit={createBusinessUnit.mutate}
                  users={users || []}
                />
                <DialogFooter>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search business units..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent>
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Select
                      value={filters.label}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, label: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by label" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Labels</SelectItem>
                        {UNIT_LABELS.map((label) => (
                          <SelectItem key={label} value={label.toLowerCase()}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Select
                      value={filters.status}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {UNIT_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Select
                      value={filters.category}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {uniqueCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        <div className="grid gap-4">
          {filteredUnits?.map((unit) => (
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
                onSubmit={(data) => updateBusinessUnit.mutate({ ...editingUnit, ...data })}
                users={users || []}
              />
              <DialogFooter>
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
        <Card className="mt-4">
          <CardFooter className="flex justify-between text-sm text-muted-foreground py-4">
            <div>
              Total Records: {filteredUnits?.length || 0} of {businessUnits?.length || 0}
            </div>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}