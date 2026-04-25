
import { GoogleGenAI } from "@google/genai";
import { DataRow } from "../types";

// The API key is injected by Vercel from Environment Variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export async function generateDataSummary(data: DataRow[]): Promise<string> {
  const sample = data.slice(0, 15);
  const prompt = `Analyze this dataset and provide a high-level executive summary for HR leadership. Identify trends, anomalies, and risks.
  
  Total records: ${data.length}.
  Data Sample (JSON):
  ${JSON.stringify(sample, null, 2)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Unable to generate summary.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating AI summary. Please check API Key configuration.";
  }
}

export async function translateQueryToFilter(query: string, headers: string[]): Promise<{ logic: string }> {
  const prompt = `Transform the following natural language query into a JavaScript logical expression for an array.filter() function.
  
  Columns: ${headers.join(", ")}
  Query: "${query}"
  
  Rules:
  1. Return ONLY the JS expression (e.g., row["Status"] === "Expired").
  2. Use "row" as the object name.
  3. No markdown, no explanation.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return { logic: response.text?.trim() || "true" };
  } catch (error) {
    console.error("Gemini Query Error:", error);
    return { logic: "true" };
  }
}
