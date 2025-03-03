import OpenAI from "openai";
import { insertEmissionSchema } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function extractEmissionData(text: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "Extract carbon emission data from the following text. Return a JSON object with date (YYYY-MM-DD), scope1 (integer), scope2 (integer), scope3 (integer), and details (object with any additional information).",
      },
      {
        role: "user",
        content: text,
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("Failed to get response from OpenAI");
  }

  const extractedData = JSON.parse(content);
  return insertEmissionSchema.parse({
    ...extractedData,
    businessUnitId: 0, // Will be set by the route handler
    source: "",
  });
}