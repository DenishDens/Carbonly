interface MaterialTableProps {
  materials: Material[];
  onEdit?: (material: Material) => void;
  onDelete?: (id: string) => void;
}

export function MaterialTable({ materials, onEdit, onDelete }: MaterialTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Material Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Unit of Measure</TableHead>
          <TableHead>Emission Factors (kgCO2e per unit)</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {materials.map((material) => (
          <TableRow key={material.id}>
            <TableCell>{material.materialCode}</TableCell>
            <TableCell>{material.name}</TableCell>
            <TableCell>{material.category}</TableCell>
            <TableCell>{material.uom}</TableCell>
            <TableCell>{material.emissionFactor}</TableCell>
            <TableCell>{material.source}</TableCell>
            <TableCell>
              <Badge variant={material.approvalStatus === 'approved' ? 'success' : 'warning'}>
                {material.approvalStatus}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                {onEdit && (
                  <Button variant="ghost" size="icon" onClick={() => onEdit(material)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="icon" onClick={() => onDelete(material.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
