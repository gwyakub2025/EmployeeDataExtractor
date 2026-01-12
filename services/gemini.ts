
import { GoogleGenAI } from "@google/genai";
import { DataRow } from "../types";

// Helper to safely get the API Key from Vite env or process env
const getApiKey = () => {
  const meta = import.meta as any;
  // Check standard Vite env first
  if (meta && meta.env && meta.env.VITE_API_KEY) {
    return meta.env.VITE_API_KEY;
  }
  // Check process.env (legacy/Node compatibility)
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      // @ts-ignore
      return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore ReferenceErrors
  }
  return undefined;
};

const apiKey = getApiKey();
// Initialize only if key exists to prevent immediate crash, though calls will fail
const ai = new GoogleGenAI({ apiKey: apiKey || 'DUMMY_KEY_TO_PREVENT_INIT_CRASH' });

export async function generateDataSummary(data: DataRow[]): Promise<string> {
  if (!apiKey) return "AI Summary requires a configured API Key.";
  
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
    return "Error generating AI summary. Ensure API Key is valid.";
  }
}

export async function translateQueryToFilter(query: string, headers: string[]): Promise<{ logic: string }> {
  if (!apiKey) throw new Error("API Key Missing");

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
