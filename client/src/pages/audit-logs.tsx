import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Eye,
  ArrowUpDown,
  FileText,
  Users,
  Building2,
  ChartBar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AuditLog } from "@shared/schema";

const entityIcons = {
  organization: Building2,
  user: Users,
  business_unit: FileText,
  emission: ChartBar,
};

function AuditLogViewer() {
  const [selectedEntityType, setSelectedEntityType] = useState<string>();
  const [date, setDate] = useState<Date>();
  const [selectedLog, setSelectedLog] = useState<AuditLog>();

  const { data: auditLogs } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs", selectedEntityType, date?.toISOString()],
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <div className="flex gap-4">
            <Select
              value={selectedEntityType}
              onValueChange={setSelectedEntityType}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="organization">Organization</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="business_unit">Business Unit</SelectItem>
                <SelectItem value="emission">Emission</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>
              Track all changes and activities in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs?.map((log) => {
                  const Icon = entityIcons[log.entityType as keyof typeof entityIcons];
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        {format(new Date(log.createdAt), "PPp")}
                      </TableCell>
                      <TableCell>{log.userId}</TableCell>
                      <TableCell className="capitalize">{log.actionType.toLowerCase()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {Icon && <Icon className="h-4 w-4" />}
                          <span className="capitalize">
                            {log.entityType.replace(/_/g, " ")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Changes Dialog */}
        {selectedLog && (
          <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(undefined)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Details</DialogTitle>
                <DialogDescription>
                  View the changes made in this action
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <pre className="bg-muted p-4 rounded-lg overflow-auto">
                  {JSON.stringify(selectedLog.changes, null, 2)}
                </pre>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AuditLogViewer;
