import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Edit2, Trash2, Plus, FileText } from "lucide-react";
import { Label } from "@/components/ui/label";

interface DataTableProps {
  scope: "1" | "2" | "3";
  data: Array<{
    id: string;
    date: string;
    businessUnit: string;
    source: string;
    sourceType: "manual" | "file" | "integration";
    activityType: string;
    value: number;
    unit: string;
    emissionsFactor: number;
    co2e: number;
  }>;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function DataTable({ scope, data, onEdit, onDelete, onAdd }: DataTableProps) {
  const [filters, setFilters] = useState({
    businessUnit: "",
    sourceType: "",
    activityType: "",
  });

  const filteredData = data.filter(item => {
    return (
      (!filters.businessUnit || item.businessUnit.toLowerCase().includes(filters.businessUnit.toLowerCase())) &&
      (!filters.sourceType || item.sourceType === filters.sourceType) &&
      (!filters.activityType || item.activityType.toLowerCase().includes(filters.activityType.toLowerCase()))
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Scope {scope} Emissions Data</h2>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Entry
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="space-y-2">
            <Label>Business Unit</Label>
            <Input
              placeholder="Filter by business unit"
              value={filters.businessUnit}
              onChange={(e) => setFilters(prev => ({ ...prev, businessUnit: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Source Type</Label>
            <Select
              value={filters.sourceType}
              onValueChange={(value) => setFilters(prev => ({ ...prev, sourceType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by source type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Sources</SelectItem>
                <SelectItem value="manual">Manual Entry</SelectItem>
                <SelectItem value="file">File Upload</SelectItem>
                <SelectItem value="integration">Integration</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Activity Type</Label>
            <Input
              placeholder="Filter by activity type"
              value={filters.activityType}
              onChange={(e) => setFilters(prev => ({ ...prev, activityType: e.target.value }))}
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Business Unit</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Activity Type</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Emissions Factor</TableHead>
                <TableHead className="text-right">CO₂e (tons)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                  <TableCell>{row.businessUnit}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {row.sourceType === "file" && <FileText className="h-4 w-4" />}
                      {row.source}
                    </div>
                  </TableCell>
                  <TableCell>{row.activityType}</TableCell>
                  <TableCell className="text-right">{row.value.toLocaleString()}</TableCell>
                  <TableCell>{row.unit}</TableCell>
                  <TableCell className="text-right">{row.emissionsFactor}</TableCell>
                  <TableCell className="text-right">{row.co2e.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(row.id)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(row.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No data found. Add new entries or adjust your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
