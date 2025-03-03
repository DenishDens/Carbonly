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
import { Building2, Edit, Trash2, Settings } from "lucide-react";
import type { BusinessUnit, User } from "@shared/schema";
import { useState } from "react";

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

export default function BusinessUnits() {
  const { toast } = useToast();
  const [editingUnit, setEditingUnit] = useState<BusinessUnit>();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newUnit, setNewUnit] = useState({
    name: "",
    label: "",
    description: "",
    location: "",
    category: "",
    status: "active",
    managerId: "",
  });

  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createBusinessUnit = useMutation({
    mutationFn: async (data: typeof newUnit) => {
      const res = await apiRequest("POST", "/api/business-units", data);
      return res.json();
    },
    onSuccess: () => {
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
        managerId: "",
      });
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

  const UnitForm = ({ data, onChange }: { data: any; onChange: (data: any) => void }) => (
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
            {users?.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
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
                  <Button>
                    <Settings className="h-4 w-4 mr-2" />
                    Manage
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

        {/* Edit Dialog */}
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
      </div>
    </DashboardLayout>
  );
}