import OpenAI from "openai";
import { insertEmissionSchema } from "@shared/schema";
import type { z } from "zod";
import { storage } from "./storage";

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

interface ChatResponse {
  message: string;
  chart?: {
    type: string;
    data: any;
    options?: any;
  };
}

export async function getChatResponse(message: string, context: {
  organizationId: string;
  businessUnitId?: string;
}): Promise<ChatResponse> {
  try {
    // Fetch relevant data for analysis
    const businessUnits = await storage.getBusinessUnits(context.organizationId);
    const emissions = await Promise.all(
      businessUnits.map(unit => storage.getEmissions(unit.id))
    );
    const flatEmissions = emissions.flat();

    // Calculate some basic statistics
    const totalEmissions = flatEmissions.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const emissionsByScope = flatEmissions.reduce((acc, e) => {
      acc[e.scope] = (acc[e.scope] || 0) + parseFloat(e.amount);
      return acc;
    }, {} as Record<string, number>);

    const emissionsByCategory = flatEmissions.reduce((acc, e) => {
      if (e.details && typeof e.details === 'object' && 'category' in e.details) {
        const category = e.details.category as string;
        acc[category] = (acc[category] || 0) + parseFloat(e.amount);
      }
      return acc;
    }, {} as Record<string, number>);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant for Carbonly.ai, a carbon emission tracking platform.
You help users understand their emission data and provide insights.

Important terms and equivalences:
- "Business Unit" and "Project" mean the same thing in our system
- When users ask about "projects", treat it the same as queries about business units
- Use these terms interchangeably in your responses to match the user's preferred terminology

You have access to the following data:

Total Emissions: ${totalEmissions} tCO2e
Emissions by Scope: ${JSON.stringify(emissionsByScope)}
Emissions by Category: ${JSON.stringify(emissionsByCategory)}

Respond with a JSON object following this format:
{
  "message": "Your response text here",
  "chart": {  // Optional, include only if visualization is needed
    "type": "line|bar|pie",
    "data": {
      "labels": [...],
      "datasets": [...]
    },
    "options": {...}  // Optional chart.js options
  }
}

Focus on providing actionable insights and recommendations for reducing emissions.
When comparing data, use percentages and trends to make insights more meaningful.
If asked about predictions, use historical trends to make educated forecasts.
If asked about projects or business units, treat them as the same concept and provide data accordingly.`,
        },
        {
          role: "user",
          content: `Please analyze this request and provide insights as JSON: ${message}`,
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

export { openai };