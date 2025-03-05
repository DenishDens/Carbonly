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

    // Fetch data concurrently
    const [incidents, businessUnits] = await Promise.all([
      storage.getIncidents(context.organizationId),
      storage.getBusinessUnits(context.organizationId)
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an incident management assistant. Analyze and respond to queries about incident data.

Current Data Context (Last 30 Days):
${JSON.stringify(metrics, null, 2)}

Focus on:
1. Resolution rates and trends
2. Severity distributions
3. Business unit performance
4. Critical incident tracking

Provide specific numbers and suggest improvements.

Response Format:
{
  "message": "Clear analysis with specific metrics",
  "chart": {
    "type": "line|bar|pie",
    "data": {...},
    "options": {...}
  }
}`
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

export { openai };