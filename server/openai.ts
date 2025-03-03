import OpenAI from "openai";
import { insertEmissionSchema } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ExtractionResult {
  scope: string;
  emissionSource: string;
  amount: number;
  unit: string;
  date: string;
  details: Record<string, any>;
}

export async function extractEmissionData(text: string): Promise<insertEmissionSchema> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Extract carbon emission data from the following text. Return a JSON object with:
- scope: one of ['Scope 1', 'Scope 2', 'Scope 3']
- emissionSource: string describing the source
- amount: number
- unit: one of ['kg', 'tCO2e']
- date: YYYY-MM-DD
- details: object with additional info like fuel type, process type, etc.`,
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

  const extractedData: ExtractionResult = JSON.parse(content);

  //Adapt the schema to the new structure.  This assumes insertEmissionSchema can handle the new fields.  Error handling might be needed in a production setting.
  return insertEmissionSchema.parse({
    ...extractedData,
    businessUnitId: 0,
    source: "",
  });
}