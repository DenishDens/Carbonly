import { Router } from 'express';
import { MaterialLibraryService } from '../materialLibrary';
import { authenticateUser } from '../auth';

const router = Router();
const materialLibraryService = new MaterialLibraryService();
const materialLibraryService = new MaterialLibraryService();

// Get all materials with optional filtering
router.get('/', authenticateUser, async (req, res) => {
  try {
    const filters = {
      category: req.query.category as string | undefined,
      supplier: req.query.supplier as string | undefined,
      search: req.query.search as string | undefined,
      userAddedOnly: req.query.userAddedOnly === 'true',
    };

    const pagination = req.query.page && req.query.limit ? {
      page: parseInt(req.query.page as string),
      limit: parseInt(req.query.limit as string),
    } : undefined;

    const result = await materialLibraryService.getMaterials(filters, pagination);
    res.json(result);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

// Get material by ID
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const material = await materialLibraryService.getMaterialById(req.params.id);
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    res.json(material);
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({ error: 'Failed to fetch material' });
  }
});

// Create new material
router.post('/', authenticateUser, async (req, res) => {
  try {
    const material = await materialLibraryService.createMaterial(req.body);
    if (!material) {
      return res.status(400).json({ error: 'Failed to create material' });
    }
    res.status(201).json(material);
  } catch (error) {
    console.error('Error creating material:', error);
    res.status(500).json({ error: 'Failed to create material' });
  }
});

// Update material
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const material = await materialLibraryService.updateMaterial(req.params.id, req.body);
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    res.json(material);
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({ error: 'Failed to update material' });
  }
});

// Delete material
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const success = await materialLibraryService.deleteMaterial(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Material not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
});

// Find similar materials
router.post('/similar', authenticateUser, async (req, res) => {
  try {
    const { text, threshold } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const matches = await materialLibraryService.findSimilarMaterials(text, threshold);
    res.json(matches);
  } catch (error) {
    console.error('Error finding similar materials:', error);
    res.status(500).json({ error: 'Failed to find similar materials' });
  }
});

// Get all categories
router.get('/categories/all', authenticateUser, async (req, res) => {
  try {
    const categories = await materialLibraryService.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get all suppliers
router.get('/suppliers/all', authenticateUser, async (req, res) => {
  try {
    const suppliers = await materialLibraryService.getSuppliers();
    res.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

export default router;