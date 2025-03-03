import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Upload } from "lucide-react";
import type { Organization } from "@shared/schema";

export default function OrganizationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [slug, setSlug] = useState("");
  const [logo, setLogo] = useState<File>();

  const { data: organization } = useQuery<Organization>({
    queryKey: ["/api/organization"],
    enabled: user?.role === "super_admin",
  });

  const updateSlugMutation = useMutation({
    mutationFn: async (slug: string) => {
      const res = await apiRequest("PATCH", "/api/organization/slug", { slug });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      toast({
        title: "Organization URL updated",
        description: "You may need to refresh the page for changes to take effect.",
      });
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (logo: File) => {
      const formData = new FormData();
      formData.append("logo", logo);
      const res = await apiRequest("POST", "/api/organization/logo", formData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      toast({ title: "Logo uploaded successfully" });
      setLogo(undefined);
    },
  });

  // Only super admins can access this page
  if (user?.role !== "super_admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Only organization administrators can access settings
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Organization Settings</h1>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Organization URL</CardTitle>
            <CardDescription>
              Set your custom URL for accessing Carbonly.ai
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 items-center">
              <span className="text-muted-foreground">carbonly.ai/</span>
              <Input
                placeholder={organization?.slug || "your-org"}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
              <Button
                variant="secondary"
                onClick={() => updateSlugMutation.mutate(slug)}
                disabled={!slug || updateSlugMutation.isPending}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Update URL
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organization Logo</CardTitle>
            <CardDescription>
              Upload your organization's logo for branding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {organization?.logo && (
              <div className="mb-4">
                <Label>Current Logo</Label>
                <img
                  src={organization.logo}
                  alt="Organization logo"
                  className="h-16 object-contain"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Input
                type="file"
                onChange={(e) => setLogo(e.target.files?.[0])}
                accept="image/*"
              />
              <Button
                variant="secondary"
                onClick={() => logo && uploadLogoMutation.mutate(logo)}
                disabled={!logo || uploadLogoMutation.isPending}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}