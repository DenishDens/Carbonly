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
    // Fetch all data
    const businessUnits = await storage.getBusinessUnits(context.organizationId);
    const incidents = await storage.getIncidents(context.organizationId);
    const emissions = await storage.getEmissions(context.organizationId);

    // Calculate severity statistics
    const severityStats = {
      critical: incidents.filter(i => i.severity === 'critical').length,
      high: incidents.filter(i => i.severity === 'high').length,
      medium: incidents.filter(i => i.severity === 'medium').length,
      low: incidents.filter(i => i.severity === 'low').length
    };

    // Calculate total and percentages
    const total = Object.values(severityStats).reduce((sum, val) => sum + val, 0);
    const severityPercentages = Object.entries(severityStats).reduce((acc, [key, value]) => {
      acc[key] = total > 0 ? Math.round((value / total) * 100) : 0;
      return acc;
    }, {} as Record<string, number>);

    // Calculate business unit specific stats
    const businessUnitStats = businessUnits.map(unit => ({
      name: unit.name,
      incidents: incidents.filter(i => i.businessUnitId === unit.id),
      severityBreakdown: {
        critical: incidents.filter(i => i.businessUnitId === unit.id && i.severity === 'critical').length,
        high: incidents.filter(i => i.businessUnitId === unit.id && i.severity === 'high').length,
        medium: incidents.filter(i => i.businessUnitId === unit.id && i.severity === 'medium').length,
        low: incidents.filter(i => i.businessUnitId === unit.id && i.severity === 'low').length
      }
    }));

    console.log("Analysis context:", {
      severityStats,
      severityPercentages,
      businessUnitStats,
      totalIncidents: total
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant for Carbonly.ai's carbon emission tracking platform.
You help users understand their emission data and incidents across their business units.

Current Context:
- Total Incidents: ${total}
- Severity Stats: ${JSON.stringify(severityStats)}
- Severity Percentages: ${JSON.stringify(severityPercentages)}
- Business Unit Stats: ${JSON.stringify(businessUnitStats)}

Guidelines:
1. For severity queries, ALWAYS include:
   - Exact numbers for each severity level
   - Percentages of total
   - Total number of incidents
2. If a business unit is mentioned, focus on that unit's data
3. Provide clear, numerical insights
4. Only include charts when explicitly requested

Example Response for "Show incidents by severity":
{
  "message": "Here's the breakdown of incidents by severity:\\n- Critical: ${severityStats.critical} (${severityPercentages.critical}%)\\n- High: ${severityStats.high} (${severityPercentages.high}%)\\n- Medium: ${severityStats.medium} (${severityPercentages.medium}%)\\n- Low: ${severityStats.low} (${severityPercentages.low}%)\\n\\nTotal: ${total} incidents"
}`
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

    // Add chart for visualization requests
    if (!parsedResponse.chart && 
        (message.toLowerCase().includes('chart') || 
         message.toLowerCase().includes('graph') ||
         message.toLowerCase().includes('show me'))) {
      parsedResponse.chart = {
        type: 'pie',
        data: {
          labels: Object.keys(severityStats),
          datasets: [{
            data: Object.values(severityStats),
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
          }]
        }
      };
    }

    return parsedResponse;
  } catch (error: any) {
    console.error("Error getting chat response:", error);
    return {
      message: "I apologize, but I encountered an error analyzing the incident data. Please try rephrasing your question.",
      chart: null
    };
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