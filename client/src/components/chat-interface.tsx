import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

// Updated smart prompts focused on incidents and environmental data
const SMART_PROMPTS = [
  "Show me critical incidents",
  "How many open incidents do we have?",
  "What's the most common incident type?",
  "Show incidents by severity",
  "Which business unit has the most incidents?",
  "Analyze recent environmental trends",
  "What's our incident resolution rate?"
];

interface Message {
  role: "user" | "assistant";
  content: string;
  chart?: {
    type: string;
    data: any;
    options?: any;
  };
}

export function ChatInterface() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  // Get user's accessible business units
  const { data: businessUnits } = useQuery({
    queryKey: ["/api/business-units"],
    enabled: !!user,
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/chat", {
        message,
        businessUnits: businessUnits?.map(unit => ({
          id: unit.id,
          name: unit.name
        })) || []
      });
      return res.json();
    },
    onSuccess: (response) => {
      setMessages((prev) => [...prev, response]);
      setInput("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    chatMutation.mutate(input);
  };

  const handlePromptSelect = (prompt: string) => {
    setInput(prompt);
    const event = new Event('submit') as unknown as React.FormEvent;
    handleSubmit(event);
  };

  // Show greeting when chat is opened
  const handleOpen = () => {
    if (!isOpen && messages.length === 0) {
      const greeting: Message = {
        role: "assistant",
        content: `Hi ${user?.firstName || 'there'}! 👋 How can I help you analyze your environmental data?`
      };
      setMessages([greeting]);
    }
    setIsOpen(true);
  };

  return (
    <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999 }}>
      {!isOpen && (
        <Button
          onClick={handleOpen}
          className="rounded-full h-12 w-12 p-0 shadow-lg"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <Card className={cn("w-[400px] transition-all duration-200", "opacity-100 translate-y-0 shadow-lg")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>AI Assistant</CardTitle>
              <CardDescription>Ask about your data</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "mb-4 p-4 rounded-lg",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground ml-8"
                      : "bg-muted mr-8"
                  )}
                >
                  {message.content}
                </div>
              ))}
            </ScrollArea>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                {SMART_PROMPTS.map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    className="text-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePromptSelect(prompt);
                    }}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your data..."
                  disabled={chatMutation.isPending}
                />
                <Button type="submit" disabled={chatMutation.isPending}>
                  Send
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}