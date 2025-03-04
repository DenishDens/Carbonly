
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  Filter,
  Plus,
  Pencil, 
  Trash2, 
  Search,
  ChevronsUpDown,
  Download,
  RefreshCw,
  XCircle
} from "lucide-react";

interface Material {
  id: string;
  name: string;
  code: string;
  description: string;
  emissionFactor: number;
  unitType: string;
  supplier?: string;
  category: string;
  dateAdded: string;
  lastUpdated: string;
  isUserAdded: boolean;
}

interface MaterialFormData {
  name: string;
  code: string;
  description: string;
  emissionFactor: number;
  unitType: string;
  supplier?: string;
  category: string;
}

const UNIT_TYPES = [
  "liters",
  "kg",
  "tons",
  "m3",
  "kWh",
  "km",
  "miles",
  "hours"
];

export function MaterialLibrary() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    supplier: "",
    userAddedOnly: false,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
  });
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<MaterialFormData>({
    name: "",
    code: "",
    description: "",
    emissionFactor: 0,
    unitType: "kg",
    category: "",
  });
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  
  // Queries
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["materials", filters, pagination],
    queryFn: async () => {
      const response = await apiRequest(`/api/materials?search=${filters.search}&category=${filters.category}&supplier=${filters.supplier}&userAddedOnly=${filters.userAddedOnly}&page=${pagination.page}&limit=${pagination.limit}`);
      return response.json();
    },
  });
  
  const { data: categories } = useQuery({
    queryKey: ["material-categories"],
    queryFn: async () => {
      const response = await apiRequest("/api/materials/meta/categories");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const { data: suppliers } = useQuery({
    queryKey: ["material-suppliers"],
    queryFn: async () => {
      const response = await apiRequest("/api/materials/meta/suppliers");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Mutations
  const createMaterial = useMutation({
    mutationFn: async (data: MaterialFormData) => {
      const response = await apiRequest("/api/materials", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({
        title: "Material created",
        description: "The material has been created successfully.",
      });
      setIsCreating(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create material. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const updateMaterial = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MaterialFormData }) => {
      const response = await apiRequest(`/api/materials/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({
        title: "Material updated",
        description: "The material has been updated successfully.",
      });
      setEditingMaterial(null);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update material. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/materials/${id}`, {
        method: "DELETE",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({
        title: "Material deleted",
        description: "The material has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete material. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const bulkUpdateMaterials = useMutation({
    mutationFn: async (data: { updates: { id: string; data: Partial<Material> }[] }) => {
      const response = await apiRequest("/api/materials/bulk-update", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({
        title: "Bulk update complete",
        description: `${data.success} materials updated successfully, ${data.errors} errors.`,
      });
      setBulkEditMode(false);
      setSelectedMaterials([]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to bulk update materials. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handlers
  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      code: material.code,
      description: material.description,
      emissionFactor: material.emissionFactor,
      unitType: material.unitType,
      supplier: material.supplier,
      category: material.category,
    });
  };
  
  const handleCreate = () => {
    setIsCreating(true);
    resetForm();
  };
  
  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this material?")) {
      deleteMaterial.mutate(id);
    }
  };
  
  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      emissionFactor: 0,
      unitType: "kg",
      category: "",
    });
  };
  
  const handleSubmit = () => {
    if (editingMaterial) {
      updateMaterial.mutate({ id: editingMaterial.id, data: formData });
    } else {
      createMaterial.mutate(formData);
    }
  };
  
  const handleBulkEditSubmit = () => {
    const updates = selectedMaterials.map(id => ({
      id,
      data: {
        // Add properties you want to update in bulk
        // For example: category: newCategory
      }
    }));
    
    bulkUpdateMaterials.mutate({ updates });
  };
  
  const toggleBulkEditMode = () => {
    setBulkEditMode(!bulkEditMode);
    setSelectedMaterials([]);
  };
  
  const toggleSelectMaterial = (id: string) => {
    setSelectedMaterials(prev => 
      prev.includes(id) 
        ? prev.filter(materialId => materialId !== id) 
        : [...prev, id]
    );
  };
  
  const selectAllMaterials = () => {
    if (data?.materials) {
      setSelectedMaterials(data.materials.map((material: Material) => material.id));
    }
  };
  
  const deselectAllMaterials = () => {
    setSelectedMaterials([]);
  };
  
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on filter change
  };
  
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Material Library</h1>
          <p className="text-muted-foreground">
            Manage materials and emission factors for accurate carbon calculations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Material
          </Button>
          {bulkEditMode ? (
            <Button variant="outline" onClick={toggleBulkEditMode}>
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Bulk Edit
            </Button>
          ) : (
            <Button variant="outline" onClick={toggleBulkEditMode}>
              <Pencil className="h-4 w-4 mr-2" />
              Bulk Edit
            </Button>
          )}
        </div>
      </div>
      
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, code, or description"
                  className="pl-8"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={filters.category}
                onValueChange={(value) => handleFilterChange("category", value)}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  {categories?.map((category: string) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="supplier">Supplier</Label>
              <Select
                value={filters.supplier}
                onValueChange={(value) => handleFilterChange("supplier", value)}
              >
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="All suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All suppliers</SelectItem>
                  {suppliers?.map((supplier: string) => (
                    <SelectItem key={supplier} value={supplier}>
                      {supplier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end space-x-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="userAddedOnly"
                  checked={filters.userAddedOnly}
                  onCheckedChange={(checked) => 
                    handleFilterChange("userAddedOnly", Boolean(checked))
                  }
                />
                <Label htmlFor="userAddedOnly">User-added only</Label>
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setFilters({
                    search: "",
                    category: "",
                    supplier: "",
                    userAddedOnly: false,
                  });
                  setPagination({ page: 1, limit: 10 });
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Materials Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Materials</CardTitle>
          <CardDescription>
            {data?.total
              ? `${data.total} materials found`
              : "Loading materials..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bulkEditMode && (
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllMaterials}
                disabled={isLoading || !data?.materials?.length}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAllMaterials}
                disabled={!selectedMaterials.length}
              >
                Deselect All
              </Button>
              <Button
                size="sm"
                onClick={handleBulkEditSubmit}
                disabled={!selectedMaterials.length}
              >
                Update Selected ({selectedMaterials.length})
              </Button>
            </div>
          )}
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {bulkEditMode && <TableHead className="w-12"></TableHead>}
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Emission Factor</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={bulkEditMode ? 9 : 8}
                      className="text-center py-4"
                    >
                      Loading materials...
                    </TableCell>
                  </TableRow>
                ) : data?.materials?.length ? (
                  data.materials.map((material: Material) => (
                    <TableRow key={material.id}>
                      {bulkEditMode && (
                        <TableCell>
                          <Checkbox
                            checked={selectedMaterials.includes(material.id)}
                            onCheckedChange={() => toggleSelectMaterial(material.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell>{material.name}</TableCell>
                      <TableCell>{material.code}</TableCell>
                      <TableCell>{material.category}</TableCell>
                      <TableCell>{material.emissionFactor}</TableCell>
                      <TableCell>{material.unitType}</TableCell>
                      <TableCell>{material.supplier || "-"}</TableCell>
                      <TableCell>
                        {new Date(material.lastUpdated).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(material)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(material.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={bulkEditMode ? 9 : 8}
                      className="text-center py-4"
                    >
                      No materials found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {data?.total > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {Math.min(pagination.limit * (pagination.page - 1) + 1, data.total)} to{" "}
                {Math.min(pagination.limit * pagination.page, data.total)} of{" "}
                {data.total} materials
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1 || isLoading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={
                    pagination.page * pagination.limit >= data.total || isLoading
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Create/Edit Material Dialog */}
      <Dialog open={isCreating || !!editingMaterial} onOpenChange={(open) => {
        if (!open) {
          setIsCreating(false);
          setEditingMaterial(null);
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial ? "Edit Material" : "Add New Material"}
            </DialogTitle>
            <DialogDescription>
              {editingMaterial
                ? "Update the material details and emission factor."
                : "Add a new material to your library."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Material Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Diesel B20"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="code">Material Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., DB20-001"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description / Alternate Names</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Biodiesel, B20 Fuel Mix, Renewable Diesel"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emissionFactor">Emission Factor</Label>
                <Input
                  id="emissionFactor"
                  type="number"
                  step="0.01"
                  value={formData.emissionFactor}
                  onChange={(e) => setFormData({ ...formData, emissionFactor: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g., 2.68"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="unitType">Unit Type</Label>
                <Select
                  value={formData.unitType}
                  onValueChange={(value) => setFormData({ ...formData, unitType: value })}
                >
                  <SelectTrigger id="unitType">
                    <SelectValue placeholder="Select unit type" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_TYPES.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fuel">Fuel</SelectItem>
                    <SelectItem value="Electricity">Electricity</SelectItem>
                    <SelectItem value="Transport">Transport</SelectItem>
                    <SelectItem value="Materials">Materials</SelectItem>
                    <SelectItem value="Waste">Waste</SelectItem>
                    <SelectItem value="Water">Water</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier (Optional)</Label>
                <Input
                  id="supplier"
                  value={formData.supplier || ""}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="e.g., ABC Fuels Ltd"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreating(false);
                setEditingMaterial(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name || !formData.code || !formData.category}>
              {editingMaterial ? "Update Material" : "Add Material"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
