import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { BusinessUnit } from "@shared/schema";

export default function BusinessUnits() {
  const { data: businessUnits } = useQuery<BusinessUnit[]>({
    queryKey: ["/api/business-units"],
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Business Units</h1>
        <Card>
          <CardHeader>
            <CardTitle>Manage Business Units</CardTitle>
            <CardDescription>
              View and manage your organization's business units
            </CardDescription>
          </CardHeader>
          <CardContent>
            {businessUnits?.length === 0 ? (
              <p className="text-muted-foreground">No business units found</p>
            ) : (
              <div className="space-y-4">
                {businessUnits?.map((unit) => (
                  <Card key={unit.id}>
                    <CardContent className="pt-6">
                      <h3 className="font-semibold">{unit.name}</h3>
                      {unit.description && (
                        <p className="text-sm text-muted-foreground">
                          {unit.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
