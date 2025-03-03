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
import { Leaf, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function ResetPasswordForm({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const form = useForm({
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to send reset link");
      toast({
        title: "Reset link sent",
        description: "Check your email for password reset instructions",
      });
      onBack();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@company.com"
          {...form.register("email")}
        />
      </div>
      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back to login
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send Reset Link
        </Button>
      </div>
    </form>
  );
}

function LoginForm() {
  const { loginMutation } = useAuth();
  const [ssoLoading, setSSOLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    loginMutation.mutate(data);
  });

  const handleSSOLogin = async () => {
    try {
      setSSOLoading(true);
      const domain = window.location.hostname;
      const response = await fetch(`/api/auth/sso`, {
        method: "POST",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ domain })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "SSO authentication failed");
      }

      // The SAML redirect will happen automatically
    } catch (error) {
      console.error("SSO login error:", error);
    } finally {
      setSSOLoading(false);
    }
  };

  if (showResetPassword) {
    return <ResetPasswordForm onBack={() => setShowResetPassword(false)} />;
  }

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
        <div className="flex justify-end">
          <Button
            type="button"
            variant="link"
            className="text-sm"
            onClick={() => setShowResetPassword(true)}
          >
            Forgot password?
          </Button>
        </div>
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={loginMutation.isPending}
      >
        {loginMutation.isPending && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        Sign In
      </Button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleSSOLogin}
        disabled={ssoLoading}
      >
        {ssoLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign in with SSO
      </Button>
    </form>
  );
}

function RegisterForm() {
  const { registerMutation } = useAuth();
  const form = useForm({
    resolver: zodResolver(insertOrganizationSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    registerMutation.mutate(data);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@company.com"
          {...form.register("email")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          {...form.register("password")}
        />
        <p className="text-sm text-muted-foreground">
          At least 8 characters long
        </p>
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={registerMutation.isPending}
      >
        {registerMutation.isPending && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        Create Account
      </Button>
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