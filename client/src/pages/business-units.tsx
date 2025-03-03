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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Edit, Trash2, Settings } from "lucide-react";
import type { BusinessUnit } from "@shared/schema";
import { useState } from "react";

export default function BusinessUnits() {
  const { toast } = useToast();
  const [editingUnit, setEditingUnit] = useState<BusinessUnit>();
  const [newUnitName, setNewUnitName] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const createBusinessUnit = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/business-units", { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-units"] });
      toast({ title: "Business unit created" });
      setShowAddDialog(false);
      setNewUnitName("");
    },
  });

  const updateBusinessUnit = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await apiRequest("PATCH", `/api/business-units/${id}`, { name });
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Business Unit</DialogTitle>
                <DialogDescription>
                  Create a new business unit to track emissions
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter business unit name"
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => createBusinessUnit.mutate(newUnitName)}
                  disabled={!newUnitName || createBusinessUnit.isPending}
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
                <div>
                  <h3 className="text-lg font-semibold">{unit.name}</h3>
                  {unit.description && (
                    <p className="text-sm text-muted-foreground mt-1">
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Business Unit</DialogTitle>
                <DialogDescription>
                  Update the business unit details
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    defaultValue={editingUnit.name}
                    onChange={(e) =>
                      setEditingUnit({ ...editingUnit, name: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() =>
                    updateBusinessUnit.mutate({
                      id: editingUnit.id,
                      name: editingUnit.name,
                    })
                  }
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