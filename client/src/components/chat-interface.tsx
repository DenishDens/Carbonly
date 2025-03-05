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
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

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
  "Show me all critical incidents in my projects",
  "What's the status of incident reports this month?",
  "Which projects have the most environmental incidents?",
  "Show me unresolved incidents by severity",
  "Summarize recent environmental impacts",
  "Compare incident types across projects",
  "Show me trends in incident reporting",
];

export function ChatInterface() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showPrompts, setShowPrompts] = useState(false);

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
    setShowPrompts(false);
  };

  const renderChart = (chart: Message['chart']) => {
    if (!chart) return null;

    const ChartComponent = {
      line: Line,
      bar: Bar,
      pie: Pie,
    }[chart.type];

    if (!ChartComponent) return null;

    return (
      <div className="mt-4 p-4 bg-background rounded-md h-[300px]">
        <ChartComponent data={chart.data} options={chart.options} />
      </div>
    );
  };

  // Show greeting when chat is opened
  const handleOpen = () => {
    if (!isOpen && messages.length === 0) {
      const unitCount = businessUnits?.length || 0;
      const greeting: Message = {
        role: "assistant",
        content: `Hi ${user?.firstName || 'there'}! 👋 I'm your AI assistant. I can help analyze incident and emissions data from your ${unitCount} business unit${unitCount !== 1 ? 's' : ''} (${businessUnits?.map(u => u.name).join(', ')}). Feel free to ask me anything about your environmental data or try one of the suggested questions below.`
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
      )}
    </div>
  );
}