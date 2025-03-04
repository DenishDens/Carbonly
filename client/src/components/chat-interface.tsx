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
import { MessageSquare, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Line, Bar, Pie } from "react-chartjs-2";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  role: "user" | "assistant";
  content: string;
  chart?: {
    type: string;
    data: any;
    options?: any;
  };
}

const SMART_PROMPTS = [
  "Analyze my carbon emissions trend",
  "Show emissions by source",
  "Compare this month vs last month",
  "Identify unusual patterns",
  "Suggest reduction strategies",
];

export function ChatInterface() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showPrompts, setShowPrompts] = useState(false);

  const handleOpen = () => setIsOpen(true);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest(
        "POST",
        "/api/chat",
        { message, organizationId: user?.organizationId }
      );
      return res.json();
    },
    onSuccess: (response) => {
      setMessages(prev => [...prev, 
        { role: "assistant", content: response.message, chart: response.chart }
      ]);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages(prev => [...prev, { role: "user", content: input }]);
    chatMutation.mutate(input);
    setInput("");
  };

  const handlePromptSelect = (prompt: string) => {
    setInput(prompt);
    setShowPrompts(false);
  };

  const renderChart = (chart: { type: string; data: any; options?: any }) => {
    const ChartComponent = {
      line: Line,
      bar: Bar,
      pie: Pie,
    }[chart.type];

    if (!ChartComponent) return null;

    return (
      <div className="mt-4 h-[200px]">
        <ChartComponent
          data={chart.data}
          options={{
            maintainAspectRatio: false,
            ...chart.options,
          }}
        />
      </div>
    );
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <Button
          onClick={handleOpen}
          className="rounded-full h-12 w-12 p-0 shadow-lg hover:shadow-xl transition-shadow"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      <Card
        className={cn(
          "w-[400px] absolute bottom-0 right-0 shadow-xl transition-all duration-200",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>AI Assistant</CardTitle>
            <CardDescription>Ask about your emissions data</CardDescription>
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
                {message.chart && renderChart(message.chart)}
              </div>
            ))}
          </ScrollArea>
          <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
            <div className="flex-1 flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your data..."
                disabled={chatMutation.isPending}
              />
              <DropdownMenu open={showPrompts} onOpenChange={setShowPrompts}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[300px]">
                  {SMART_PROMPTS.map((prompt) => (
                    <DropdownMenuItem
                      key={prompt}
                      onClick={() => handlePromptSelect(prompt)}
                    >
                      {prompt}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button type="submit" disabled={chatMutation.isPending}>
              Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}