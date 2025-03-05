import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Pencil, Trash2 } from "lucide-react";
import type { User } from "@shared/schema";

interface Team {
  id: string;
  name: string;
  description: string;
  members: string[];
  createdAt: Date;
}

export default function Teams() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team>();
  const [newTeam, setNewTeam] = useState({
    name: "",
    description: "",
    members: [] as string[],
  });

  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createTeam = useMutation({
    mutationFn: async (data: typeof newTeam) => {
      const res = await apiRequest("POST", "/api/teams", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Team created successfully" });
      setShowAddDialog(false);
      setNewTeam({
        name: "",
        description: "",
        members: [],
      });
    },
  });

  const updateTeam = useMutation({
    mutationFn: async ({ id, ...data }: Team) => {
      const res = await apiRequest("PATCH", `/api/teams/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Team updated successfully" });
      setEditingTeam(undefined);
    },
  });

  const deleteTeam = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/teams/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Team deleted successfully" });
    },
  });

  const TeamForm = ({ data, onChange }: { data: any; onChange: (data: any) => void }) => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">Team Name</Label>
        <Input
          id="name"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder="Enter team name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          placeholder="Enter team description"
        />
      </div>

      <div className="space-y-2">
        <Label>Team Members</Label>
        <Select
          value={data.members}
          onValueChange={(value) => onChange({ ...data, members: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select team members" />
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
    </div>
  );

  return (
    <DashboardLayout>
      <div className="relative space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Teams</h1>
        </div>

        {/* Move Dialog outside of flex container and make it fixed */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            {/* Updated Button */}
            <Button className="fixed bottom-8 right-8 z-50 shadow-lg">
              <Users className="h-4 w-4 mr-2" />
              Add Team
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Team</DialogTitle>
              <DialogDescription>
                Create a new team and add members
              </DialogDescription>
            </DialogHeader>
            <TeamForm data={newTeam} onChange={setNewTeam} />
            <DialogFooter>
              <Button
                onClick={() => createTeam.mutate(newTeam)}
                disabled={!newTeam.name || createTeam.isPending}
              >
                Create Team
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid gap-4">
          {teams?.map((team) => (
            <Card key={team.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">{team.name}</h3>
                  {team.description && (
                    <p className="text-sm text-muted-foreground">
                      {team.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {team.members.length} members
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setEditingTeam(team)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => deleteTeam.mutate(team.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {teams?.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No teams found. Create your first team to get started.
              </CardContent>
            </Card>
          )}
        </div>

        {editingTeam && (
          <Dialog open={!!editingTeam} onOpenChange={() => setEditingTeam(undefined)}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Team</DialogTitle>
                <DialogDescription>
                  Update team details and members
                </DialogDescription>
              </DialogHeader>
              <TeamForm
                data={editingTeam}
                onChange={(data) => setEditingTeam({ ...editingTeam, ...data })}
              />
              <DialogFooter>
                <Button
                  onClick={() => updateTeam.mutate(editingTeam)}
                  disabled={updateTeam.isPending}
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