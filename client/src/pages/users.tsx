import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type { User } from "@shared/schema";

export default function UserManagement() {
  const { user } = useAuth();
  
  // This would be implemented later when we add the users API endpoint
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: user?.role === "super_admin",
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Manage your organization's team members and their roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users?.length === 0 ? (
              <p className="text-muted-foreground">No team members found</p>
            ) : (
              <div className="space-y-4">
                {users?.map((member) => (
                  <Card key={member.id}>
                    <CardContent className="pt-6">
                      <h3 className="font-semibold">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {member.email}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        Role: {member.role}
                      </p>
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
