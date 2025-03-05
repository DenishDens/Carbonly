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
  userRole?: string;
}): Promise<ChatResponse> {
  try {
    // Fetch all data
    const businessUnits = await storage.getBusinessUnits(context.organizationId);
    const incidents = await storage.getIncidents(context.organizationId);
    const emissions = await storage.getEmissions(context.organizationId);

    // Calculate comprehensive statistics
    const stats = {
      incidents: {
        severity: calculateIncidentStats(incidents),
        trends: calculateIncidentTrends(incidents)
      },
      emissions: {
        total: calculateEmissionStats(emissions),
        trends: calculateEmissionTrends(emissions)
      },
      businessUnits: calculateBusinessUnitStats(businessUnits, incidents)
    };

    console.log("Analysis context:", stats);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant for Carbonly.ai's ESG and emission tracking platform.
You help environmental engineers and managers understand their environmental data across business units.

Current Context:
${JSON.stringify(stats, null, 2)}

User Role: ${context.userRole || 'user'}

Guidelines:
1. For incident queries:
   - Show exact numbers and percentages
   - Include severity breakdowns
   - Highlight critical incidents first
   - Compare with historical data

2. For emission analysis:
   - Compare against industry benchmarks
   - Show month-over-month trends
   - Highlight unusual patterns
   - Calculate intensity metrics
   - Provide scope-specific analysis

3. For environmental metrics:
   - Focus on compliance thresholds
   - Show resource efficiency
   - Identify optimization opportunities
   - Compare against targets
   - Analyze by business unit

4. Always provide actionable insights:
   - Suggest potential improvements
   - Highlight areas needing attention
   - Compare with best practices
   - Identify cost-saving opportunities

5. Natural Language Understanding:
   - Interpret user intent beyond keywords
   - Consider context from previous queries
   - Provide relevant follow-up suggestions
   - Handle ambiguous queries with clarification

Response Format:
{
  "message": "Clear analysis with specific metrics and recommendations",
  "chart": {
    "type": "line|bar|pie",
    "data": {...},
    "options": {...}
  }
}`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      response_format: { type: "json_object" },
    });

    if (!response.choices[0].message.content) {
      throw new Error("Failed to get response from OpenAI");
    }

    const parsedResponse = JSON.parse(response.choices[0].message.content);

    // Auto-generate appropriate chart if needed
    if (!parsedResponse.chart && shouldAddChart(message)) {
      parsedResponse.chart = generateAppropriateChart(message, stats);
    }

    return parsedResponse;
  } catch (error: any) {
    console.error("Error getting chat response:", error);
    return {
      message: "I apologize, but I encountered an error analyzing the environmental data. Please try rephrasing your question.",
      chart: null
    };
  }
}

function shouldAddChart(message: string): boolean {
  const chartTriggers = [
    'chart', 'graph', 'trend', 'compare', 'show me',
    'visualization', 'pattern', 'distribution', 'how many',
    'what is the breakdown', 'analyze', 'display'
  ];
  return chartTriggers.some(trigger =>
    message.toLowerCase().includes(trigger)
  );
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

  // Calculate month-over-month change
  const months = Object.keys(monthlyIncidents).sort();
  const trend = months.map((month, i) => {
    if (i === 0) return 0;
    const prev = monthlyIncidents[months[i - 1]] || 0;
    const curr = monthlyIncidents[month] || 0;
    return ((curr - prev) / prev) * 100;
  });

  return {
    monthly: monthlyIncidents,
    trend,
    change: trend[trend.length - 1] || 0
  };
}

function calculateEmissionTrends(emissions: any[]) {
  // Group emissions by month and calculate total
  const monthlyEmissions = emissions.reduce((acc, emission) => {
    const month = new Date(emission.date).toISOString().slice(0, 7);
    acc[month] = (acc[month] || 0) + parseFloat(emission.amount);
    return acc;
  }, {} as Record<string, number>);

  // Calculate month-over-month change
  const months = Object.keys(monthlyEmissions).sort();
  const trend = months.map((month, i) => {
    if (i === 0) return 0;
    const prev = monthlyEmissions[months[i - 1]] || 0;
    const curr = monthlyEmissions[month] || 0;
    return ((curr - prev) / prev) * 100;
  });

  return {
    monthly: monthlyEmissions,
    trend,
    change: trend[trend.length - 1] || 0
  };
}

function calculatePerformanceScore(incidents: Incident[]) {
  // Calculate a simple performance score based on incident severity and resolution time
  const weights = { critical: 4, high: 3, medium: 2, low: 1 };
  let score = 100;

  incidents.forEach(incident => {
    const severity = incident.severity as keyof typeof weights;
    score -= weights[severity];
    if (incident.status === 'open') score -= 2;
  });

  return Math.max(0, score);
}

function generateAppropriateChart(message: string, context: any) {
  const messageLower = message.toLowerCase();

  // Handle severity-specific queries
  if (messageLower.includes('severity') || messageLower.includes('by severity')) {
    const severityData = context.incidents.severity.by_severity;
    return {
      type: 'pie',
      data: {
        labels: Object.keys(severityData).map(s => s.charAt(0).toUpperCase() + s.slice(1)), // Capitalize labels
        datasets: [{
          data: Object.values(severityData),
          backgroundColor: [
            '#FF6384', // critical - red
            '#FFCE56', // high - yellow
            '#36A2EB', // medium - blue
            '#4BC0C0'  // low - green
          ]
        }]
      },
      options: {
        plugins: {
          legend: {
            position: 'right' as const,
            labels: {
              padding: 20,
              font: {
                size: 12
              }
            }
          },
          title: {
            display: true,
            text: 'Incidents by Severity',
            font: {
              size: 16
            }
          }
        }
      }
    };
  }

  // Rest of the chart generation logic remains the same
  if (messageLower.includes('breakdown') || messageLower.includes('distribution') || messageLower.includes('by type')) {
    return {
      type: 'pie',
      data: {
        labels: Object.keys(context.incidents.severity.by_severity),
        datasets: [{
          data: Object.values(context.incidents.severity.by_severity),
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
        }]
      },
      options: {
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    };
  }

  if (messageLower.includes('trend') || messageLower.includes('over time')) {
    const isEmission = messageLower.includes('emission');
    const data = isEmission ? context.emissions.trends : context.incidents.trends;

    return {
      type: 'line',
      data: {
        labels: Object.keys(data.monthly),
        datasets: [{
          label: isEmission ? 'Emissions' : 'Incidents',
          data: Object.values(data.monthly),
          borderColor: '#36A2EB',
          tension: 0.1,
          fill: false
        }]
      },
      options: {
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    };
  }

  if (messageLower.includes('compare') || messageLower.includes('across')) {
    return {
      type: 'bar',
      data: {
        labels: context.businessUnits.map((bu: any) => bu.name),
        datasets: [{
          label: 'Incidents',
          data: context.businessUnits.map((bu: any) => bu.incidents),
          backgroundColor: '#36A2EB'
        }]
      },
      options: {
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
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