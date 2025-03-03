import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOrganizationSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Leaf } from "lucide-react";

function LoginForm() {
  const { loginMutation } = useAuth();
  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    loginMutation.mutate(data);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Email</Label>
        <Input
          id="username"
          type="email"
          placeholder="name@company.com"
          {...form.register("username")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          {...form.register("password")}
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={loginMutation.isPending}
      >
        Sign In
      </Button>
    </form>
  );
}

function RegisterForm() {
  const { registerMutation } = useAuth();
  const [step, setStep] = useState(1);
  const form = useForm({
    resolver: zodResolver(insertOrganizationSchema),
    defaultValues: {
      name: "",
      slug: "",
      adminEmail: "",
      adminPassword: "",
      logo: undefined,
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, value);
      }
    });
    registerMutation.mutate(formData);
  });

  if (step === 1) {
    return (
      <form className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Organization Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Acme Corp"
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Organization URL</Label>
          <div className="flex gap-2 items-center">
            <span className="text-muted-foreground">carbonly.ai/</span>
            <Input
              id="slug"
              type="text"
              placeholder="acme"
              {...form.register("slug")}
              error={form.formState.errors.slug?.message}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            This will be your unique URL for accessing the platform.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="logo">Organization Logo</Label>
          <Input
            id="logo"
            type="file"
            accept="image/*"
            {...form.register("logo")}
          />
        </div>
        <Button
          type="button"
          className="w-full"
          onClick={() => setStep(2)}
          disabled={!form.getValues("name") || !form.getValues("slug")}
        >
          Next: Admin Account
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="adminEmail">Admin Email</Label>
        <Input
          id="adminEmail"
          type="email"
          placeholder="admin@company.com"
          {...form.register("adminEmail")}
          error={form.formState.errors.adminEmail?.message}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminPassword">Password</Label>
        <Input
          id="adminPassword"
          type="password"
          {...form.register("adminPassword")}
          error={form.formState.errors.adminPassword?.message}
        />
        <p className="text-sm text-muted-foreground">
          At least 8 characters long
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => setStep(1)}
        >
          Back
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={registerMutation.isPending}
        >
          Create Organization
        </Button>
      </div>
    </form>
  );
}

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-6">
              <Leaf className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Carbonly.ai
              </h1>
            </div>
            <Tabs defaultValue="login">
              <TabsList className="grid grid-cols-2 w-full mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <LoginForm />
              </TabsContent>
              <TabsContent value="register">
                <RegisterForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <div className="hidden md:flex flex-col justify-center p-8 bg-muted">
        <div className="max-w-md mx-auto">
          <h2 className="text-4xl font-bold mb-4">
            Track Your Carbon Footprint
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Use AI-powered insights to understand and reduce your organization's
            environmental impact.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-background rounded-lg">
              <h3 className="font-semibold mb-2">Smart Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Automated data extraction from your reports
              </p>
            </div>
            <div className="p-4 bg-background rounded-lg">
              <h3 className="font-semibold mb-2">Real-time Insights</h3>
              <p className="text-sm text-muted-foreground">
                Track and visualize your progress
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}