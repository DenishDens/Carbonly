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
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MessageSquare, X, LineChart, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Line, Bar, Pie } from "react-chartjs-2";
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

export function ChatInterface() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/chat", { message });
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

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full h-12 w-12 p-0"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      <Card
        className={cn(
          "w-[400px] transition-all duration-200",
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
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your data..."
              disabled={chatMutation.isPending}
            />
            <Button type="submit" disabled={chatMutation.isPending}>
              Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}