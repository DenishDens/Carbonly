import OpenAI from "openai";
import { insertEmissionSchema } from "@shared/schema";
import type { z } from "zod";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ExtractionResult {
  scope: string;
  emissionSource: string;
  amount: number;
  unit: string;
  date: string;
  category: string;
  details: Record<string, any>;
}

export async function extractEmissionData(text: string, scope: string): Promise<z.infer<typeof insertEmissionSchema>> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Extract carbon emission data from the following text. Return a JSON object with:
- scope: one of ['Scope 1', 'Scope 2', 'Scope 3']
- emissionSource: string describing the source
- amount: number value (will be converted to string)
- unit: one of ['kg', 'tCO2e']
- date: YYYY-MM-DD
- category: one of ['fuel', 'electricity', 'travel', 'waste', 'other']
- details: object with additional info like fuel type, process type, etc.

Categorize the data appropriately based on the source. For example:
- Fuel receipts should be categorized as 'fuel'
- Electricity bills as 'electricity'
- Flight records as 'travel'

The scope provided by the user is: ${scope}`,
      },
      {
        role: "user",
        content: `Please extract emission data from this text and categorize it appropriately: ${text}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("Failed to get response from OpenAI");
  }

  const extractedData: ExtractionResult = JSON.parse(content);

  return {
    ...extractedData,
    amount: extractedData.amount.toString(),
    businessUnitId: "", // This will be set by the upload handler
  };
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
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an AI assistant for Carbonly.ai, a carbon emission tracking platform.
You help users understand their emission data and provide insights.
When users ask for visualizations, include chart data in your response using this format:
{
  "message": "Your analysis text here",
  "chart": {
    "type": "line|bar|pie",
    "data": {
      "labels": [...],
      "datasets": [...]
    },
    "options": {...}  // Optional chart.js options
  }
}

If no chart is needed, simply return:
{
  "message": "Your response text here"
}

Focus on providing actionable insights and recommendations for reducing emissions.`,
      },
      {
        role: "user",
        content: `Please analyze this request and provide insights with visualization if needed: ${message}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("Failed to get response from OpenAI");
  }

  return JSON.parse(content);
}

export { openai };