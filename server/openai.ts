import OpenAI from "openai";
import type { Incident, BusinessUnit } from "@shared/schema";
import { storage } from "./storage";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper function to calculate basic incident metrics with timing
function calculateBasicIncidentMetrics(incidents: Incident[]) {
  console.time('calculateBasicIncidentMetrics');

  // Limit to last 30 days for better performance
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentIncidents = incidents.filter(i => 
    new Date(i.createdAt) >= thirtyDaysAgo
  );

  console.log(`Processing ${recentIncidents.length} incidents from last 30 days`);

  const resolved = recentIncidents.filter(i => i.status === 'resolved' || i.status === 'closed');
  const metrics = {
    total: recentIncidents.length,
    resolved: resolved.length,
    resolution_rate: ((resolved.length / Math.max(recentIncidents.length, 1)) * 100).toFixed(2),
    by_severity: {
      critical: recentIncidents.filter(i => i.severity === 'critical').length,
      high: recentIncidents.filter(i => i.severity === 'high').length,
      medium: recentIncidents.filter(i => i.severity === 'medium').length,
      low: recentIncidents.filter(i => i.severity === 'low').length
    },
    by_status: {
      open: recentIncidents.filter(i => i.status === 'open').length,
      in_progress: recentIncidents.filter(i => i.status === 'in_progress').length,
      resolved: recentIncidents.filter(i => i.status === 'resolved').length,
      closed: recentIncidents.filter(i => i.status === 'closed').length
    }
  };

  console.timeEnd('calculateBasicIncidentMetrics');
  return metrics;
}

export async function getChatResponse(message: string, context: {
  organizationId: string;
  userRole?: string;
}): Promise<ChatResponse> {
  try {
    console.time('totalProcessing');
    console.time('getData');

    // Fetch data concurrently - now including materials
    const [incidents, businessUnits, materials] = await Promise.all([
      storage.getIncidents(context.organizationId),
      storage.getBusinessUnits(context.organizationId),
      storage.getMaterials(context.organizationId)
    ]).catch(error => {
      console.error('Error fetching data:', error);
      throw new Error('Failed to fetch required data');
    });

    console.timeEnd('getData');
    console.time('calculateMetrics');

    // Calculate metrics for recent data only
    const metrics = {
      incidents: calculateBasicIncidentMetrics(incidents),
      businessUnits: businessUnits.slice(0, 10).map(unit => ({
        name: unit.name,
        incidents: incidents.filter(i => i.businessUnitId === unit.id).length,
        critical_incidents: incidents.filter(i => 
          i.businessUnitId === unit.id && 
          i.severity === 'critical'
        ).length
      }))
    };

    console.timeEnd('calculateMetrics');
    console.time('openaiCall');

    // Detect the type of query
    const isMaterialRequest = message.toLowerCase().includes('material') || 
                             message.toLowerCase().includes('emission factor') ||
                             message.toLowerCase().includes('carbon') ||
                             message.toLowerCase().includes('co2') ||
                             message.toLowerCase().includes('emission');

    // Use the appropriate system message based on request type
    const systemMessage = isMaterialRequest ? 
      `You are an ESG data assistant specializing in material categorization, units of measure, and emission factors for the Material Library.

The organization's Material Library contains the following materials:
${JSON.stringify(materials.map(m => ({
  code: m.materialCode,
  name: m.name,
  category: m.category,
  uom: m.uom,
  emissionFactor: m.emissionFactor + " kgCO2e per " + m.uom,
  source: m.source
})), null, 2)}

For natural language queries about materials, respond with information from the Material Library.
If asked about materials not in the library, provide general emission factor guidelines like:
- Diesel: ~2.68 kgCO₂e per liter
- Biodiesel B10 (10% bio): ~2.41 kgCO₂e per liter
- Biodiesel B20 (20% bio): ~2.14 kgCO₂e per liter
- Biodiesel B100 (100% bio): ~0.17 kgCO₂e per liter
- Electricity: varies by region, but typically ~0.42 kgCO₂e per kWh
- Natural Gas: ~2.03 kgCO₂e per cubic meter

For UOM suggestions:
- Liquid fuels: liters
- Energy: kWh
- Solid waste: metric_tons
- Raw materials: kg or metric_tons

Response Format (must be valid JSON):
{
  "message": "Clear answer to the user's question about materials or emissions",
  "chart": {
    "type": "line|bar|pie", 
    "data": {...},
    "options": {...}
  }
}` :
      `You are an incident management assistant. Analyze and respond to queries about incident data.

Current Data Context (Last 30 Days):
${JSON.stringify(metrics, null, 2)}

Focus on:
1. Resolution rates and trends
2. Severity distributions
3. Business unit performance
4. Critical incident tracking

Provide specific numbers and suggest improvements.

Response Format (must be valid JSON):
{
  "message": "Clear analysis with specific metrics",
  "chart": {
    "type": "line|bar|pie",
    "data": {...},
    "options": {...}
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "user",
          content: message,
        },
      ],
      response_format: { type: "json_object" },
    }).catch(error => {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to get AI response');
    });

    console.timeEnd('openaiCall');
    console.timeEnd('totalProcessing');

    if (!response.choices[0].message.content) {
      throw new Error("Failed to get response from OpenAI");
    }

    return JSON.parse(response.choices[0].message.content);

  } catch (error: any) {
    console.error("Error in getChatResponse:", error);
    console.timeEnd('totalProcessing');
    return {
      message: "I apologize, but I encountered an error analyzing the incident data. Please try rephrasing your question.",
      chart: null
    };
  }
}

export interface ChatResponse {
  message: string;
  chart?: {
    type: string;
    data: any;
    options?: any;
  };
}

export async function getUomSuggestion(materialName: string) {
  try {
    // Fast-path for common fuels to avoid OpenAI calls
    const lowerName = materialName.toLowerCase();
    if (lowerName.includes('diesel') || lowerName.includes('fuel') || 
        lowerName.includes('gasoline') || lowerName.includes('petrol') || 
        lowerName.includes('oil') || lowerName.includes('b10') || 
        lowerName.includes('b20')) {
      console.log(`Fast-tracked UOM for ${materialName}: liters`);
      return "liters";
    } else if (lowerName.includes('electricity') || lowerName.includes('energy')) {
      return "kilowatt_hours";
    } else if (lowerName.includes('waste') && (
               lowerName.includes('solid') || lowerName.includes('mixed'))) {
      return "tons_metric";
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that provides accurate unit of measure suggestions for materials."
          },
          {
            role: "user",
            content: `Suggest an appropriate unit of measure (UOM) for "${materialName}". 
            Respond with a single unit from this list: liters, gallons, cubic_meters, cubic_feet, kilograms, tons_metric, tons_us, pounds, kilowatt_hours, megawatt_hours, therms, btus.
            Respond with just the unit name and nothing else - no explanations, no HTML, no quotes.`
          }
        ],
        temperature: 0.3, // Lower temperature for more predictable outputs
        max_tokens: 20,   // Reduced token count for simpler responses
      });

      const content = response.choices[0].message.content?.trim() || "";
      // Clean the response to ensure it's just the UOM
      const validUOMs = ["liters", "gallons", "cubic_meters", "cubic_feet", "kilograms", 
                        "tons_metric", "tons_us", "pounds", "kilowatt_hours", 
                        "megawatt_hours", "therms", "btus"];

      // Extract just the UOM if it's in the valid list
      for (const uom of validUOMs) {
        if (content.toLowerCase().includes(uom)) {
          console.log(`AI suggested UOM for ${materialName}: ${uom}`);
          return uom;
        }
      }

      console.log(`No valid UOM found in response "${content}", using default`);
      return "liters";
    } catch (openaiError) {
      console.error("OpenAI API error:", openaiError);
      return "liters"; // Graceful fallback
    }
  } catch (error) {
    console.error("Error in getUomSuggestion:", error);
    return "liters"; // Default fallback
  }
}

export async function getEmissionFactorSuggestion(
  materialName: string,
  uom: string
): Promise<string> {
  if (!materialName || !uom) {
    return "1.0"; // Default value
  }

  try {
    // Try to get a suggestion based on the material name and unit of measure
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an expert in carbon accounting and emission factors for the Material Library. Your task is to suggest appropriate emission factors in kgCO2e per unit based on the material name and unit of measure provided. The Material Library stores emission factors for various materials used in carbon accounting across Scope 1, 2, and 3 emissions. Only return the numeric value of the emission factor.",
        },
        {
          role: "user",
          content: `Material: ${materialName}\nUnit of Measure: ${uom}\n\nWhat would be an appropriate emission factor for this material in kgCO2e per ${uom}? Consider industry standards from sources like EPA, GHG Protocol, and IPCC when applicable.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 15,
    });

    const suggestion = response.choices[0]?.message?.content?.trim();
    if (suggestion) {
      // Extract just the number from the response
      const match = suggestion.match(/(\d+\.?\d*)/);
      if (match && match[0]) {
        return match[0];
      }
    }

    return "1.0"; // Default fallback
  } catch (error) {
    console.error("Error getting emission factor suggestion:", error);
    throw new Error("Failed to get emission factor suggestion");
  }
}

export { openai };