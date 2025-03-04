import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { DataTable } from "@/components/data-table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Scope1Page() {
  const { toast } = useToast();

  const { data: emissionsData } = useQuery({
    queryKey: ["/api/emissions/scope-1"],
  });

  const deleteEmission = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/emissions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emissions/scope-1"] });
      toast({ title: "Entry deleted successfully" });
    },
  });

  const handleEdit = (id: string) => {
    // We'll implement the edit dialog later
    console.log("Edit emission:", id);
  };

  const handleAdd = () => {
    // We'll implement the add dialog later
    console.log("Add new emission");
  };

  return (
    <DashboardLayout>
      <DataTable
        scope="1"
        data={emissionsData || []}
        onEdit={handleEdit}
        onDelete={(id) => deleteEmission.mutate(id)}
        onAdd={handleAdd}
      />
    </DashboardLayout>
  );
}
