import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BusinessUnit, Emission } from "@shared/schema";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function EmissionsData() {
  const [selectedUnit, setSelectedUnit] = useState<string>();

  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  const { data: emissions } = useQuery<Emission[]>({
    queryKey: ["/api/business-units", selectedUnit, "emissions"],
    enabled: !!selectedUnit,
  });

  const chartData = emissions?.map((e) => ({
    date: new Date(e.date).toLocaleDateString(),
    amount: parseFloat(e.amount),
    source: e.emissionSource,
    scope: e.scope,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Emissions Data</h1>
        <Card>
          <CardHeader>
            <CardTitle>Select Business Unit</CardTitle>
            <CardDescription>
              Choose a business unit to view its emissions data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedUnit}
              onValueChange={setSelectedUnit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select business unit" />
              </SelectTrigger>
              <SelectContent>
                {businessUnits?.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {emissions && emissions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Emissions Overview</CardTitle>
              <CardDescription>
                Breakdown of emissions by source and scope
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="amount" fill="var(--primary)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
