import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";

interface InviteUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessUnitId: string;
  businessUnitName: string;
}

export function InviteUsersDialog({
  open,
  onOpenChange,
  businessUnitId,
  businessUnitName,
}: InviteUsersDialogProps) {
  const { toast } = useToast();
  const [emails, setEmails] = useState<string>("");

  const inviteUsersMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      const res = await fetch(`/api/business-units/${businessUnitId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invitations sent successfully" });
      onOpenChange(false);
      setEmails("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitations",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInvite = () => {
    const emailList = emails.split(",").map(email => email.trim()).filter(Boolean);
    if (emailList.length === 0) {
      toast({
        title: "Please enter at least one email address",
        variant: "destructive",
      });
      return;
    }
    inviteUsersMutation.mutate(emailList);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Users</DialogTitle>
          <DialogDescription>
            Invite users to collaborate on {businessUnitName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="emails">Email Addresses</Label>
            <Input
              id="emails"
              placeholder="Enter email addresses, separated by commas"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              You can invite multiple users by separating their email addresses with commas
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleInvite}
            disabled={inviteUsersMutation.isPending}
          >
            {inviteUsersMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            <Send className="mr-2 h-4 w-4" />
            Send Invitations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
