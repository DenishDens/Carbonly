import { useParams } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { FileProcessing } from "@/components/file-processing";

export default function CategoryProcessing() {
  const { category } = useParams<{ category: string }>();
  
  const categoryLabels: Record<string, string> = {
    fuel: "Fuel Consumption",
    water: "Water Usage",
    energy: "Energy Usage",
    travel: "Business Travel",
    waste: "Waste Management",
  };

  return (
    <DashboardLayout>
      <FileProcessing 
        category={category} 
        title={categoryLabels[category] || "Data Processing"}
      />
    </DashboardLayout>
  );
}
