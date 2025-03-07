import { useState, useEffect } from "react";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MessageSquare, X, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Line, Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
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

// Update the SMART_PROMPTS to focus on incident-related queries with better data matching
const SMART_PROMPTS = [
  "What's our current incident resolution rate?",
  "How many incidents do we have in total?",
  "Show me incidents by severity",
  "Give me a breakdown of incidents by status",
  "Compare business units by incident count",
  "What are our incident metrics for the last 30 days?",
  "Show incident severity distribution"
];

// Material Library prompts
const MATERIAL_PROMPTS = [
  "What materials are in our library?",
  "Show me emission factors for fuels",
  "What's the emission factor for diesel?",
  "Compare emission factors for different materials",
  "List materials by category"
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
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get chat messages from React Query cache
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/chat/messages"],
    enabled: isOpen,
    initialData: [],
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      setError(null);
      setIsProcessing(true);
      try {
        const res = await apiRequest("POST", "/api/chat", {
          message,
          context: {
            userRole: user?.role,
            organizationId: user?.organizationId
          }
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || 'Failed to get response from chat service');
        }

        return res.json();
      } catch (err) {
        console.error('Chat error:', err);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    onSuccess: (response) => {
      const newMessage = {
        role: "assistant",
        content: response.message,
        ...(response.chart ? { chart: response.chart } : {})
      };

      const newMessages = [
        ...messages,
        { role: "user", content: input },
        newMessage
      ];
      queryClient.setQueryData(["/api/chat/messages"], newMessages);
      setInput("");
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to process your request. Please try again.");
      const errorMessage = {
        role: "assistant",
        content: "I'm sorry, I encountered an error processing your request. Please try again."
      };
      const newMessages = [...messages, { role: "user", content: input }, errorMessage];
      queryClient.setQueryData(["/api/chat/messages"], newMessages);
      setInput("");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;
    chatMutation.mutate(input);
  };

  const handlePromptSelect = (prompt: string) => {
    if (chatMutation.isPending) return;
    setInput(prompt);
    chatMutation.mutate(prompt);
  };

  // Show greeting when chat is opened
  const handleOpen = () => {
    if (!isOpen && messages.length === 0) {
      const greeting: Message = {
        role: "assistant",
        content: `Hi ${user?.firstName || 'there'}! 👋 I can help you analyze incident data and query the Material Library. Try asking about incidents or materials.`
      };
      queryClient.setQueryData(["/api/chat/messages"], [greeting]);
    }
    setIsOpen(true);
  };

  const renderChart = (chart: Message['chart']) => {
    if (!chart) return null;

    const ChartComponent = {
      line: Line,
      bar: Bar,
      pie: Pie
    }[chart.type];

    if (!ChartComponent) return null;

    return (
      <div className="mt-4 h-[300px] w-full">
        <ChartComponent
          data={chart.data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            ...chart.options
          }}
        />
      </div>
    );
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <Button
          onClick={handleOpen}
          className="rounded-full h-12 w-12 p-0 shadow-lg"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      ) : (
        <Card className="w-[400px] shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>AI Assistant</CardTitle>
              <CardDescription>Ask about incident data or materials</CardDescription>
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
            <ScrollArea className="h-[400px] pr-4">
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
              {(chatMutation.isPending || isProcessing) && (
                <div className="flex items-center gap-2 text-muted-foreground mr-8 mb-4 p-4 rounded-lg bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </div>
              )}
              {error && (
                <div className="text-destructive mr-8 mb-4 p-4 rounded-lg bg-destructive/10">
                  {error}
                </div>
              )}
            </ScrollArea>
            <form onSubmit={handleSubmit} className="mt-4 relative">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about incidents or materials..."
                  disabled={chatMutation.isPending || isProcessing}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={chatMutation.isPending || isProcessing}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-[300px] bg-background border shadow-md"
                    style={{ position: 'fixed', zIndex: 50 }}
                  >
                    {SMART_PROMPTS.map((prompt) => (
                      <DropdownMenuItem
                        key={prompt}
                        onClick={() => handlePromptSelect(prompt)}
                      >
                        {prompt}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem className="border-t border-border" />
                    {MATERIAL_PROMPTS.map((prompt) => (
                      <DropdownMenuItem
                        key={prompt}
                        onClick={() => handlePromptSelect(prompt)}
                      >
                        {prompt}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  type="submit"
                  disabled={chatMutation.isPending || isProcessing}
                >
                  {chatMutation.isPending || isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : 'Send'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}