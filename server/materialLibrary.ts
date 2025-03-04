
import { PrismaClient } from '@prisma/client';
import { Material, MaterialMatch } from './types';

const prisma = new PrismaClient();

export class MaterialLibraryService {
  async getMaterials(
    filters?: {
      category?: string;
      supplier?: string;
      search?: string;
      userAddedOnly?: boolean;
    },
    pagination?: {
      page: number;
      limit: number;
    }
  ): Promise<{ materials: Material[]; total: number }> {
    const where: any = {};
    
    if (filters?.category) {
      where.category = filters.category;
    }
    
    if (filters?.supplier) {
      where.supplier = filters.supplier;
    }
    
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    
    if (filters?.userAddedOnly) {
      where.isUserAdded = true;
    }

    try {
      const total = await prisma.material.count({ where });
      
      const materials = await prisma.material.findMany({
        where,
        orderBy: pagination ? { lastUpdated: 'desc' } : undefined,
        skip: pagination ? (pagination.page - 1) * pagination.limit : undefined,
        take: pagination ? pagination.limit : undefined,
      });
      
      return {
        materials: materials as unknown as Material[],
        total,
      };
    } catch (error) {
      console.error('Error getting materials:', error);
      return { materials: [], total: 0 };
    }
  }

  async getMaterialById(id: string): Promise<Material | null> {
    try {
      const material = await prisma.material.findUnique({
        where: { id },
      });
      
      return material as unknown as Material;
    } catch (error) {
      console.error('Error getting material by ID:', error);
      return null;
    }
  }

  async createMaterial(data: Omit<Material, 'id' | 'dateAdded' | 'lastUpdated'>): Promise<Material | null> {
    try {
      const now = new Date().toISOString();
      
      const material = await prisma.material.create({
        data: {
          ...data,
          dateAdded: now,
          lastUpdated: now,
          isUserAdded: true,
        },
      });
      
      return material as unknown as Material;
    } catch (error) {
      console.error('Error creating material:', error);
      return null;
    }
  }

  async updateMaterial(id: string, data: Partial<Material>): Promise<Material | null> {
    try {
      const material = await prisma.material.update({
        where: { id },
        data: {
          ...data,
          lastUpdated: new Date().toISOString(),
        },
      });
      
      return material as unknown as Material;
    } catch (error) {
      console.error('Error updating material:', error);
      return null;
    }
  }

  async deleteMaterial(id: string): Promise<boolean> {
    try {
      await prisma.material.delete({
        where: { id },
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting material:', error);
      return false;
    }
  }

  async bulkUpdateMaterials(updates: { id: string; data: Partial<Material> }[]): Promise<{ success: number; errors: number }> {
    let success = 0;
    let errors = 0;
    
    for (const update of updates) {
      try {
        await this.updateMaterial(update.id, update.data);
        success++;
      } catch (error) {
        console.error(`Error updating material ${update.id}:`, error);
        errors++;
      }
    }
    
    return { success, errors };
  }

  async findSimilarMaterials(text: string, threshold = 0.7): Promise<MaterialMatch[]> {
    // This would ideally use AI for fuzzy matching, but here's a simplified version
    try {
      const allMaterials = await prisma.material.findMany();
      const results: MaterialMatch[] = [];
      
      // Basic implementation - in production, use an AI service or fuzzy matching algorithm
      for (const material of allMaterials) {
        const nameMatch = material.name.toLowerCase().includes(text.toLowerCase());
        const codeMatch = material.code.toLowerCase().includes(text.toLowerCase());
        const descMatch = material.description.toLowerCase().includes(text.toLowerCase());
        
        if (nameMatch || codeMatch || descMatch) {
          const confidence = nameMatch ? 0.9 : (codeMatch ? 0.85 : 0.75);
          
          results.push({
            sourceText: text,
            matchedMaterial: material as unknown as Material,
            confidence,
            requiresReview: confidence < threshold
          });
        }
      }
      
      // Sort by confidence
      results.sort((a, b) => b.confidence - a.confidence);
      
      return results;
    } catch (error) {
      console.error('Error finding similar materials:', error);
      return [];
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const categories = await prisma.material.groupBy({
        by: ['category'],
      });
      
      return categories.map(c => c.category);
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  async getSuppliers(): Promise<string[]> {
    try {
      const suppliers = await prisma.material.groupBy({
        by: ['supplier'],
        where: {
          supplier: {
            not: null,
          },
        },
      });
      
      return suppliers.map(s => s.supplier as string);
    } catch (error) {
      console.error('Error getting suppliers:', error);
      return [];
    }
  }
}
