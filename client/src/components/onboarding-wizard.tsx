import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Check } from "lucide-react";

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [businessUnit, setBusinessUnit] = useState({
    name: "",
    description: "",
  });

  const createBusinessUnit = useMutation({
    mutationFn: async (data: typeof businessUnit) => {
      const res = await apiRequest("POST", "/api/business-units", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-units"] });
      toast({ title: "Business unit created" });
      onComplete();
    },
  });

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Welcome to Carbonly.ai! 🌱</CardTitle>
        <CardDescription>
          Let's get started by setting up your first business unit
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 1 && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">What is a Business Unit?</h3>
              <p className="text-sm text-muted-foreground">
                Business units help you organize and track emissions for different parts
                of your organization. Examples:
              </p>
              <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground">
                <li>Manufacturing Plant A</li>
                <li>North America Operations</li>
                <li>Logistics Division</li>
                <li>UK Office</li>
              </ul>
            </div>
            <Button
              onClick={() => setStep(2)}
              className="w-full"
            >
              Create My First Business Unit
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Business Unit Name</Label>
              <Input
                id="name"
                placeholder="e.g., Manufacturing Plant A"
                value={businessUnit.name}
                onChange={(e) => setBusinessUnit(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="e.g., Main manufacturing facility in Texas, responsible for product lines A, B, and C"
                value={businessUnit.description}
                onChange={(e) => setBusinessUnit(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
              />
            </div>
            <Button
              onClick={() => createBusinessUnit.mutate(businessUnit)}
              disabled={!businessUnit.name || createBusinessUnit.isPending}
              className="w-full"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Create Business Unit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
