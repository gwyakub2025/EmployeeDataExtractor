
import { GoogleGenAI } from "@google/genai";
import { DataRow } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateDataSummary(data: DataRow[]): Promise<string> {
  if (!process.env.API_KEY) return "AI Summary requires an API Key.";
  const sample = data.slice(0, 20);
  const prompt = `Analyze this dataset and provide a high-level executive summary. Identify trends, anomalies, and key takeaways.
  
  Data Sample (JSON):
  ${JSON.stringify(sample, null, 2)}
  
  Total records: ${data.length}.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Unable to generate summary.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating AI summary.";
  }
}

export async function translateQueryToFilter(query: string, headers: string[]): Promise<{ logic: string }> {
  if (!process.env.API_KEY) throw new Error("API Key Missing");

  const prompt = `You are a data analyst. Transform the user's natural language query into a Javascript logical expression that can be used inside an array.filter() function.
  
  Available columns: ${headers.join(", ")}
  User Query: "${query}"
  
  Rules:
  1. Return ONLY the Javascript expression (e.g., row["Status"] === "Expired" && row["Nationality"] === "India").
  2. Use the exact column names provided.
  3. The expression will be executed in a context where "row" is the current object.
  4. Handle case-insensitivity where appropriate using .toLowerCase().
  5. If the query is vague, return "true" (match all).
  6. DO NOT include any markdown formatting or explanations.`;

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
