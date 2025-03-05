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

    console.log("OpenAI Response:", content);

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
    const emissions = await storage.getEmissions(context.organizationId);

    // Parse business unit name from the query
    const businessUnitQuery = extractBusinessUnitQuery(message, businessUnits);

    // Filter incidents by business unit if specified
    const filteredIncidents = businessUnitQuery
      ? incidents.filter(i => {
          const businessUnit = businessUnits.find(bu => bu.id === i.businessUnitId);
          return businessUnit?.name.toLowerCase().includes(businessUnitQuery.toLowerCase());
        })
      : incidents;

    // Calculate comprehensive statistics
    const incidentStats = calculateIncidentStats(filteredIncidents);
    const businessUnitStats = calculateBusinessUnitStats(businessUnits, incidents);
    const emissionStats = calculateEmissionStats(emissions);

    // Calculate trends
    const incidentTrends = calculateIncidentTrends(filteredIncidents);
    const emissionTrends = calculateEmissionTrends(emissions);

    // Prepare detailed context
    const analysisContext = {
      businessUnits: businessUnits.map(bu => ({
        name: bu.name,
        location: bu.location,
        incidents: incidents.filter(i => i.businessUnitId === bu.id).length,
      })),
      currentQuery: {
        businessUnit: businessUnitQuery,
        filteredIncidents: filteredIncidents.length,
      },
      incidentStats,
      businessUnitStats,
      emissionStats,
      trends: {
        incidents: incidentTrends,
        emissions: emissionTrends
      }
    };

    console.log("Analysis context:", analysisContext);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant for a carbon emission tracking platform.
You help users understand their emission data and incidents across their business units.

Current Context:
${JSON.stringify(analysisContext, null, 2)}

Guidelines:
1. Always analyze trends and patterns in the data
2. When a specific business unit is mentioned, focus on that unit's data
3. Provide actionable insights and recommendations
4. Use appropriate visualizations for data presentation
5. Be proactive in highlighting potential issues or opportunities

When responding:
1. Always return a JSON object with { message: string, chart?: { type: string, data: any } }
2. For charts, use one of: 'pie', 'bar', 'line'
3. Format chart data according to Chart.js structure
4. Use colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
5. Make charts interactive and informative with proper labels and legends`
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

    const parsedResponse = JSON.parse(content);

    // Auto-generate appropriate chart if not provided
    if (!parsedResponse.chart) {
      if (message.toLowerCase().includes('chart') || message.toLowerCase().includes('trend')) {
        parsedResponse.chart = generateAppropriateChart(message, analysisContext);
      }
    }

    return parsedResponse;
  } catch (error: any) {
    console.error("Error getting chat response:", error);
    throw new Error(`Failed to process chat message: ${error.message}`);
  }
}

function extractBusinessUnitQuery(message: string, businessUnits: BusinessUnit[]): string | null {
  const words = message.toLowerCase().split(' ');

  for (const businessUnit of businessUnits) {
    const businessUnitName = businessUnit.name.toLowerCase();
    const nameWords = businessUnitName.split(' ');

    // Check if any consecutive words in the message match the business unit name
    for (let i = 0; i <= words.length - nameWords.length; i++) {
      const phrase = words.slice(i, i + nameWords.length).join(' ');
      if (phrase === businessUnitName) {
        return businessUnit.name;
      }
    }
  }

  return null;
}

function calculateIncidentStats(incidents: Incident[]) {
  return {
    open: incidents.filter(i => i.status === 'open').length,
    in_progress: incidents.filter(i => i.status === 'in_progress').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
    by_severity: {
      critical: incidents.filter(i => i.severity === 'critical').length,
      high: incidents.filter(i => i.severity === 'high').length,
      medium: incidents.filter(i => i.severity === 'medium').length,
      low: incidents.filter(i => i.severity === 'low').length
    }
  };
}

function calculateBusinessUnitStats(businessUnits: BusinessUnit[], incidents: Incident[]) {
  return businessUnits.map(unit => ({
    name: unit.name,
    location: unit.location,
    incidents: incidents.filter(i => i.businessUnitId === unit.id).length,
    performance: calculatePerformanceScore(incidents.filter(i => i.businessUnitId === unit.id))
  }));
}

function calculateEmissionStats(emissions: any[]) {
  return {
    total: emissions.reduce((sum, e) => sum + parseFloat(e.amount), 0),
    by_scope: {
      scope1: emissions.filter(e => e.scope === 'Scope 1').length,
      scope2: emissions.filter(e => e.scope === 'Scope 2').length,
      scope3: emissions.filter(e => e.scope === 'Scope 3').length
    },
    by_category: emissions.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
}

function calculateIncidentTrends(incidents: Incident[]) {
  // Group incidents by month
  const monthlyIncidents = incidents.reduce((acc, incident) => {
    const month = new Date(incident.createdAt).toISOString().slice(0, 7);
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    monthly: monthlyIncidents,
    trend: Object.values(monthlyIncidents)
  };
}

function calculateEmissionTrends(emissions: any[]) {
  // Group emissions by month and calculate total
  const monthlyEmissions = emissions.reduce((acc, emission) => {
    const month = new Date(emission.date).toISOString().slice(0, 7);
    acc[month] = (acc[month] || 0) + parseFloat(emission.amount);
    return acc;
  }, {} as Record<string, number>);

  return {
    monthly: monthlyEmissions,
    trend: Object.values(monthlyEmissions)
  };
}

function calculatePerformanceScore(incidents: Incident[]) {
  // Calculate a simple performance score based on incident severity and resolution time
  const weights = { critical: 4, high: 3, medium: 2, low: 1 };
  let score = 100;

  incidents.forEach(incident => {
    score -= weights[incident.severity as keyof typeof weights];
    if (incident.status === 'open') score -= 2;
  });

  return Math.max(0, score);
}

function generateAppropriateChart(message: string, context: any) {
  // Auto-generate appropriate chart based on user query and data context
  if (message.toLowerCase().includes('pie chart')) {
    return {
      type: 'pie',
      data: {
        labels: Object.keys(context.incidentStats.by_severity),
        datasets: [{
          data: Object.values(context.incidentStats.by_severity),
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
        }]
      }
    };
  }

  if (message.toLowerCase().includes('trend')) {
    return {
      type: 'line',
      data: {
        labels: Object.keys(context.trends.incidents.monthly),
        datasets: [{
          label: 'Incidents',
          data: Object.values(context.trends.incidents.monthly),
          borderColor: '#36A2EB',
          tension: 0.1
        }]
      }
    };
  }

  return null;
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