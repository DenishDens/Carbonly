import { readFile } from 'xlsx';
import { storage } from '../storage';
import type { Material } from '@shared/schema';
import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export async function processEPiCDatabase(filePath: string, organizationId: string) {
  try {
    const workbook = readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = worksheet['!ref'] ? readFile(filePath, { sheet: sheetName }) : [];

    for (const row of data) {
      if (!row['Material Name'] || !row['Category']) continue;

      const materialCode = row['Material Code'] || generateMaterialCode(row['Material Name']);
      const category = mapCategory(row['Category']);
      const uom = row['Unit'] || await suggestUOM(row['Material Name']);
      let emissionFactor = row['Emission Factor'];

      if (!emissionFactor) {
        emissionFactor = await suggestEmissionFactor(row['Material Name'], category, uom);
      }

      const material = {
        organizationId,
        materialCode,
        name: row['Material Name'],
        category,
        uom,
        emissionFactor: emissionFactor.toString(),
        source: 'EPiC Database',
        approvalStatus: 'pending'
      };

      await storage.createMaterial(material);
    }

    return { success: true, message: 'Materials imported successfully' };
  } catch (error) {
    console.error('Error processing EPiC Database:', error);
    return { success: false, message: error.message };
  }
}

function generateMaterialCode(name: string): string {
  // Generate a code based on the first letters of each word + random number
  const code = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase();
  return `${code}${Math.floor(Math.random() * 1000)}`;
}

function mapCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    'Fuels': 'Fuel',
    'Energy': 'Energy',
    'Raw Materials': 'Raw Material',
    'Waste': 'Waste'
  };
  return categoryMap[category] || category;
}

async function suggestUOM(materialName: string): Promise<string> {
  try {
    const prompt = `Based on the material name "${materialName}", what would be the most appropriate unit of measure (UOM)? Please respond with just the UOM abbreviation (e.g., kg, L, kWh, m³).`;
    
    const response = await openai.createCompletion({
      model: "gpt-3.5-turbo-instruct",
      prompt,
      max_tokens: 10,
      temperature: 0.3
    });

    const uom = response.data.choices[0].text.trim().toLowerCase();
    return standardizeUOM(uom);
  } catch (error) {
    console.error('Error suggesting UOM:', error);
    return 'kg'; // Default to kg if AI suggestion fails
  }
}

async function suggestEmissionFactor(materialName: string, category: string, uom: string): Promise<number> {
  try {
    const prompt = `Given a ${category} material named "${materialName}" measured in ${uom}, what would be its approximate CO2e emission factor (in kg CO2e per ${uom})? Consider typical industry standards and environmental impact. Respond with just the numeric value.`;
    
    const response = await openai.createCompletion({
      model: "gpt-3.5-turbo-instruct",
      prompt,
      max_tokens: 10,
      temperature: 0.3
    });

    const factor = parseFloat(response.data.choices[0].text.trim());
    return isNaN(factor) ? 1.0 : factor;
  } catch (error) {
    console.error('Error suggesting emission factor:', error);
    return 1.0; // Default to 1.0 if AI suggestion fails
  }
}

function standardizeUOM(uom: string): string {
  const standardUOMs: Record<string, string> = {
    'l': 'liters',
    'liter': 'liters',
    'liters': 'liters',
    'kg': 'kg',
    'kgs': 'kg',
    'kilogram': 'kg',
    'kwh': 'kWh',
    'm3': 'm³',
    'cubic meter': 'm³',
    't': 'metric_tons',
    'ton': 'metric_tons',
    'tons': 'metric_tons',
    'metric ton': 'metric_tons'
  };
  return standardUOMs[uom.toLowerCase()] || uom;
}
