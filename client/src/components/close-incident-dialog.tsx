import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface CloseIncidentDialogProps {
  incidentId: string;
  onClose: () => void;
}

export function CloseIncidentDialog({ incidentId, onClose }: CloseIncidentDialogProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState("");

  const closeIncidentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/incidents/${incidentId}`, {
        status: "resolved",
        resolutionComments: comments,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      toast({ title: "Incident closed successfully" });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to close incident",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Close Incident</DialogTitle>
        <DialogDescription>
          Add resolution details before closing this incident
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Textarea
            placeholder="Enter resolution comments..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={4}
          />
        </div>
        <Button
          onClick={() => closeIncidentMutation.mutate()}
          disabled={!comments || closeIncidentMutation.isPending}
          className="w-full"
        >
          {closeIncidentMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Close Incident
        </Button>
      </div>
    </DialogContent>
  );
}
