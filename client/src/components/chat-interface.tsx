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
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MessageSquare, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Smart prompts focused on incidents and environmental data
const SMART_PROMPTS = [
  "Show me critical incidents",
  "How many open incidents do we have?",
  "What's the most common incident type?",
  "Show incidents by severity",
  "Which business unit has the most incidents?",
  "Show me a pie chart by incident types",
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
  const [predictions, setPredictions] = useState<string[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);

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
      setMessages((prev) => [...prev, 
        { role: "user", content: input },
        { 
          role: "assistant", 
          content: response.message,
          chart: response.chart
        }
      ]);
      setInput("");
      setPredictions([]);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    chatMutation.mutate(input);
    setShowPredictions(false);
  };

  const handlePromptSelect = (prompt: string) => {
    setInput(prompt);
    const event = new Event('submit') as unknown as React.FormEvent;
    handleSubmit(event);
  };

  // Predict as user types
  useEffect(() => {
    if (input.length > 2) {
      const matchingPrompts = SMART_PROMPTS.filter(prompt => 
        prompt.toLowerCase().includes(input.toLowerCase())
      );
      setPredictions(matchingPrompts);
      setShowPredictions(matchingPrompts.length > 0);
    } else {
      setPredictions([]);
      setShowPredictions(false);
    }
  }, [input]);

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
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <Button
          onClick={handleOpen}
          className="rounded-full h-12 w-12 p-0 shadow-lg"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <Card className="w-[400px] shadow-lg">
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
            <form onSubmit={handleSubmit} className="mt-4">
              <div className="flex gap-2 relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your data..."
                  disabled={chatMutation.isPending}
                />
                <DropdownMenu>
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
                <Button type="submit" disabled={chatMutation.isPending}>
                  Send
                </Button>
                {/* Predictions dropdown */}
                {showPredictions && predictions.length > 0 && (
                  <div className="absolute top-full left-0 right-16 mt-1 bg-popover border rounded-md shadow-lg">
                    {predictions.map((prediction, index) => (
                      <button
                        key={index}
                        className="w-full text-left px-3 py-2 hover:bg-muted"
                        onClick={() => {
                          setInput(prediction);
                          setShowPredictions(false);
                          handlePromptSelect(prediction);
                        }}
                      >
                        {prediction}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}