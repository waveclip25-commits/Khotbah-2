import { GoogleGenAI } from "@google/genai";

export const generateWithFallback = async (
  apiKey: string,
  prompt: string,
  preferredModel: string,
  fallbackModels: string[]
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });
  const models = [preferredModel, ...fallbackModels];
  
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      return response.text || '';
    } catch (error: any) {
      console.warn(`Model ${model} failed:`, error.message);
      // Check for rate limit or quota errors
      if (error.status === 429 || 
          error.message.includes('quota') || 
          error.message.includes('rate limit') ||
          error.message.includes('429')) {
        continue; // Try next model
      }
      throw error; // Rethrow if it's not a quota/rate limit error
    }
  }
  throw new Error("All models failed due to quota/rate limits.");
};
