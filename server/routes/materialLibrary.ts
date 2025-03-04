
import { Router } from 'express';
import { MaterialLibraryService } from '../materialLibrary';
import { authenticateUser } from '../auth';

const router = Router();
const materialLibraryService = new MaterialLibraryService();

// Get all materials with filtering and pagination
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { 
      search, 
      category, 
      supplier, 
      userAddedOnly,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const result = await materialLibraryService.getMaterials(
      {
        search: search as string,
        category: category as string,
        supplier: supplier as string,
        userAddedOnly: userAddedOnly === 'true'
      },
      {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10)
      }
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error getting materials:', error);
    res.status(500).json({ error: 'Failed to get materials' });
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
    console.error('Error getting material:', error);
    res.status(500).json({ error: 'Failed to get material' });
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
    
    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
});

// Bulk update materials
router.post('/bulk-update', authenticateUser, async (req, res) => {
  try {
    const { updates } = req.body;
    
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates must be an array' });
    }
    
    const result = await materialLibraryService.bulkUpdateMaterials(updates);
    
    res.json(result);
  } catch (error) {
    console.error('Error bulk updating materials:', error);
    res.status(500).json({ error: 'Failed to bulk update materials' });
  }
});

// Get all categories
router.get('/meta/categories', authenticateUser, async (req, res) => {
  try {
    const categories = await materialLibraryService.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Get all suppliers
router.get('/meta/suppliers', authenticateUser, async (req, res) => {
  try {
    const suppliers = await materialLibraryService.getSuppliers();
    res.json(suppliers);
  } catch (error) {
    console.error('Error getting suppliers:', error);
    res.status(500).json({ error: 'Failed to get suppliers' });
  }
});

// AI match materials from text
router.post('/match', authenticateUser, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const matches = await materialLibraryService.findSimilarMaterials(text);
    
    res.json(matches);
  } catch (error) {
    console.error('Error matching materials:', error);
    res.status(500).json({ error: 'Failed to match materials' });
  }
});

export default router;
