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
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const { loginMutation } = useAuth();
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const formData = form.getValues();
    console.log('Form data:', formData);

    if (!formData.email || !formData.password) {
      toast({
        title: "Validation Error",
        description: "Both email and password are required",
        variant: "destructive",
      });
      return;
    }

    try {
      await loginMutation.mutateAsync({
        email: formData.email,
        password: formData.password,
        rememberMe,
      });
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  if (showResetPassword) {
    return <ResetPasswordForm onBack={() => setShowResetPassword(false)} />;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@company.com"
          {...form.register("email", { required: true })}
        />
        {form.formState.errors.email && (
          <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          {...form.register("password", { required: true })}
        />
        {form.formState.errors.password && (
          <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
        )}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            />
            <label
              htmlFor="remember"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Remember me
            </label>
          </div>
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
    </form>
  );
}

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

function Footer() {
  return (
    <footer className="bg-gray-800 text-white p-4 text-center">
      <p>&copy; 2023 Carbonly.ai</p>
    </footer>
  );
}


export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [currentFact, setCurrentFact] = useState(0);

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % ENVIRONMENTAL_FACTS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const ENVIRONMENTAL_FACTS = [
    {
      title: "Did You Know?",
      fact: "A single tree can absorb up to 48 pounds of CO2 per year",
      image: "🌳",
    },
    {
      title: "Green Energy Impact",
      fact: "Wind turbines can reduce carbon emissions by up to 3,000 tons annually",
      image: "💨",
    },
    {
      title: "Ocean Facts",
      fact: "Oceans absorb about 30% of CO2 released in the atmosphere",
      image: "🌊",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 grid md:grid-cols-2">
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
        <div className="hidden md:flex flex-col justify-between p-8 bg-muted">
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

          {/* Environmental Facts */}
          <div className="max-w-md mx-auto mt-8">
            <div className="bg-background rounded-lg p-6 transition-all duration-500 transform hover:scale-105">
              <div className="text-4xl mb-4">{ENVIRONMENTAL_FACTS[currentFact].image}</div>
              <h3 className="font-bold text-lg mb-2">{ENVIRONMENTAL_FACTS[currentFact].title}</h3>
              <p className="text-sm text-muted-foreground">{ENVIRONMENTAL_FACTS[currentFact].fact}</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}