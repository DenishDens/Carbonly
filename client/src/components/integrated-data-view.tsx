import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RefreshCw, FileSpreadsheet, Upload } from "lucide-react";
import { SiXero } from "react-icons/si";
import { FaMicrosoft } from "react-icons/fa";
import { format } from "date-fns";

interface IntegratedData {
  id: string;
  date: string;
  source: "xero" | "myob" | "onedrive";
  sourceId: string;
  category: string;
  description: string;
  amount: string;
  unit: string;
  businessUnit: string;
  metadata: {
    fileName?: string;
    folderPath?: string;
    invoiceNumber?: string;
    lastModified?: string;
  };
}

export function IntegratedDataView() {
  const { toast } = useToast();
  const [selectedSource, setSelectedSource] = useState<string>();

  const { data: transactions, isLoading } = useQuery<IntegratedData[]>({
    queryKey: ["/api/integrations/data", selectedSource],
  });

  const refreshData = useMutation({
    mutationFn: async (source?: string) => {
      const res = await apiRequest("POST", "/api/integrations/refresh", { source });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/data"] });
      toast({ title: "Data refreshed successfully" });
    },
  });

  // Set up WebSocket for real-time updates
  useEffect(() => {
    const ws = new WebSocket(
      `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${
        window.location.host
      }/ws/integrations`
    );

    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      if (update.type === "data_changed") {
        queryClient.invalidateQueries({ queryKey: ["/api/integrations/data"] });
        toast({
          title: "New data detected",
          description: `Changes detected in ${update.source}`,
        });
      }
    };

    return () => ws.close();
  }, []);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "xero":
        return <SiXero className="h-4 w-4" />;
      case "myob":
        return <FileSpreadsheet className="h-4 w-4" />;
      case "onedrive":
        return <FaMicrosoft className="h-4 w-4" />;
      default:
        return <Upload className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Integrated Data</CardTitle>
            <CardDescription>
              View and manage data from connected sources
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshData.mutate(selectedSource)}
              disabled={refreshData.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={!selectedSource ? "secondary" : "outline"}
              size="sm"
              onClick={() => setSelectedSource(undefined)}
            >
              All Sources
            </Button>
            <Button
              variant={selectedSource === "xero" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setSelectedSource("xero")}
            >
              <SiXero className="h-4 w-4 mr-2" />
              Xero
            </Button>
            <Button
              variant={selectedSource === "myob" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setSelectedSource("myob")}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              MYOB
            </Button>
            <Button
              variant={selectedSource === "onedrive" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setSelectedSource("onedrive")}
            >
              <FaMicrosoft className="h-4 w-4 mr-2" />
              OneDrive
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Business Unit</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(new Date(transaction.date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getSourceIcon(transaction.source)}
                        <span className="capitalize">{transaction.source}</span>
                      </div>
                    </TableCell>
                    <TableCell>{transaction.category}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>
                      {transaction.amount} {transaction.unit}
                    </TableCell>
                    <TableCell>{transaction.businessUnit}</TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {transaction.metadata.fileName && (
                          <div>File: {transaction.metadata.fileName}</div>
                        )}
                        {transaction.metadata.folderPath && (
                          <div>Path: {transaction.metadata.folderPath}</div>
                        )}
                        {transaction.metadata.invoiceNumber && (
                          <div>Invoice: {transaction.metadata.invoiceNumber}</div>
                        )}
                        {transaction.metadata.lastModified && (
                          <div>
                            Modified:{" "}
                            {format(
                              new Date(transaction.metadata.lastModified),
                              "dd MMM yyyy HH:mm"
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}