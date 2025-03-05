import OpenAI from "openai";
import { insertEmissionSchema } from "@shared/schema";
import type { z } from "zod";
import { storage } from "./storage";
import type { BusinessUnit, Incident } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ExtractionResult {
  scope: string;
  emissionSource: string;
  amount: string;
  unit: string;
  date: string;
  category: string;
  details: Record<string, any>;
}

export async function extractEmissionData(text: string): Promise<z.infer<typeof insertEmissionSchema>> {
  try {
    console.log("Extracting data from text:", text.substring(0, 100) + "..."); // Log truncated text

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Extract carbon emission data from the following text. Return a JSON object with:
- scope: one of ['Scope 1', 'Scope 2', 'Scope 3']
- emissionSource: string describing the source
- amount: string (numeric value as string)
- unit: one of ['kg', 'tCO2e']
- date: YYYY-MM-DD
- category: one of ['fuel', 'water', 'energy', 'waste', 'travel', 'other']
- details: object with additional info like type, process, etc.

Categorize the data appropriately based on the source:
- Energy bills as 'energy'
- Fuel receipts as 'fuel'
- Water usage as 'water'
- Flight records as 'travel'
- Waste disposal as 'waste'`,
        },
        {
          role: "user",
          content: `Please extract emission data from this text and return as JSON: ${text}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Failed to get response from OpenAI");
    }

    console.log("OpenAI Response:", content); // Log the response

    const extractedData = JSON.parse(content) as ExtractionResult;

    // Validate required fields
    if (!extractedData.scope || !extractedData.amount || !extractedData.unit || !extractedData.date) {
      throw new Error("Missing required fields in extracted data");
    }

    // Ensure numeric amount is converted to string
    const amount = typeof extractedData.amount === 'number'
      ? extractedData.amount.toString()
      : extractedData.amount;

    // Return formatted data
    return {
      ...extractedData,
      amount,
      businessUnitId: "", // This will be set by the upload handler
    };
  } catch (error: any) {
    console.error("Error extracting emission data:", error);
    throw new Error(`Failed to extract emission data: ${error.message}`);
  }
}

export async function getChatResponse(message: string, context: {
  organizationId: string;
  businessUnitId?: string;
}): Promise<ChatResponse> {
  try {
    // Fetch all business units for context
    const businessUnits = await storage.getBusinessUnits(context.organizationId);
    const incidents = await storage.getIncidents(context.organizationId);

    // Calculate incident statistics
    const incidentStats = calculateIncidentStats(incidents);
    const businessUnitStats = calculateBusinessUnitStats(businessUnits, incidents);

    console.log("Chat context - Business units:", businessUnits.length);
    console.log("Chat context - Incidents:", incidents.length);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant for a carbon emission tracking platform.
You help users understand their emission data and incidents across their business units.

Current Context:
- User has access to ${businessUnits.length} business units
- There are ${incidents.length} total incidents
- Incident Status: ${JSON.stringify(incidentStats)}
- Business Units: ${JSON.stringify(businessUnitStats)}

Focus on providing actionable insights and highlighting important trends in the data.
When discussing incidents or data, only reference the business units the user has access to.`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Failed to get response from OpenAI");
    }

    return JSON.parse(content) as ChatResponse;
  } catch (error: any) {
    console.error("Error getting chat response:", error);
    throw new Error(`Failed to process chat message: ${error.message}`);
  }
}

function calculateIncidentStats(incidents: Incident[]) {
  const stats = {
    open: 0,
    in_progress: 0,
    resolved: 0,
    by_severity: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    }
  };

  incidents.forEach(incident => {
    stats[incident.status]++;
    stats.by_severity[incident.severity]++;
  });

  return stats;
}

function calculateBusinessUnitStats(businessUnits: BusinessUnit[], incidents: Incident[]) {
  return businessUnits.map(unit => ({
    name: unit.name,
    location: unit.location,
    incidents: incidents.filter(i => i.businessUnitId === unit.id).length
  }));
}

export interface ChatResponse {
  message: string;
  chart?: {
    type: string;
    data: any;
    options?: any;
  };
}

export { openai };