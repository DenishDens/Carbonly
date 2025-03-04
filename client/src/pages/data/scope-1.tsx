import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { DataTable } from "@/components/data-table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Emission } from "@shared/schema";

interface EmissionWithSource extends Emission {
  sourceType: "manual" | "file" | "integration";
}

export default function Scope1Page() {
  const { toast } = useToast();

  const { data: emissionsData } = useQuery<EmissionWithSource[]>({
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

  const updateEmission = useMutation({
    mutationFn: async ({ id, ...data }: Partial<EmissionWithSource> & { id: string }) => {
      const res = await apiRequest("PATCH", `/api/emissions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emissions/scope-1"] });
      toast({ title: "Entry updated successfully" });
    },
  });

  const addEmission = useMutation({
    mutationFn: async (data: Omit<EmissionWithSource, "id">) => {
      const res = await apiRequest("POST", "/api/emissions", {
        ...data,
        scope: "Scope 1",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emissions/scope-1"] });
      toast({ title: "Entry added successfully" });
    },
  });

  return (
    <DashboardLayout>
      <DataTable
        scope="1"
        data={emissionsData || []}
        onEdit={(id) => {
          const emission = emissionsData?.find(e => e.id === id);
          if (emission) {
            updateEmission.mutate(emission);
          }
        }}
        onDelete={(id) => deleteEmission.mutate(id)}
        onAdd={() => addEmission.mutate({
          sourceType: "manual",
          amount: 0,
          unit: "kg",
          scope: "Scope 1",
          emissionSource: "",
          businessUnitId: "",
          date: new Date(),
          details: {}
        })}
      />
    </DashboardLayout>
  );
}