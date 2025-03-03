import { useParams } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { FileProcessing } from "@/components/file-processing";
import { FuelForm } from "@/components/manual-entry-forms/fuel-form";

const categoryLabels: Record<string, string> = {
  fuel: "Fuel Consumption",
  water: "Water Usage",
  energy: "Energy Usage",
  travel: "Business Travel",
  waste: "Waste Management",
};

const categoryComponents: Record<string, React.ComponentType> = {
  fuel: FuelForm,
  // Add other category forms as we create them
};

export default function CategoryProcessing() {
  const { category } = useParams<{ category: string }>();
  const ManualEntryForm = categoryComponents[category];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{categoryLabels[category] || "Data Processing"}</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <FileProcessing />
          {ManualEntryForm && <ManualEntryForm />}
        </div>
      </div>
    </DashboardLayout>
  );
}