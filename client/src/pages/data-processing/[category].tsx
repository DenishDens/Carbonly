import { useParams } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { FileProcessing } from "@/components/file-processing";

const categoryLabels: Record<string, string> = {
  fuel: "Fuel Consumption",
  water: "Water Usage",
  energy: "Energy Usage",
  travel: "Business Travel",
  waste: "Waste Management",
};

export default function CategoryProcessing() {
  const { category } = useParams<{ category: string }>();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{categoryLabels[category] || "Data Processing"}</h1>
        <FileProcessing />
      </div>
    </DashboardLayout>
  );
}