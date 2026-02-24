import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateChatResponse(
  prompt: string,
  file?: { data: string; mimeType: string },
  useThinking: boolean = false,
  useFast: boolean = false
) {
  try {
    let model = "gemini-3-flash-preview";
    let config: any = {};

    if (file) {
      model = "gemini-3.1-pro-preview";
    } else if (useThinking) {
      model = "gemini-3.1-pro-preview";
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    } else if (useFast) {
      model = "gemini-2.5-flash-lite-latest";
    } else {
      config.tools = [{ googleSearch: {} }];
    }

    const parts: any[] = [];
    if (file) {
      parts.push({
        inlineData: {
          data: file.data,
          mimeType: file.mimeType,
        },
      });
    }
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config,
    });

    return response.text;
  } catch (error) {
    console.error("AI Error:", error);
    throw error;
  }
}
