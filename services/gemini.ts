import { GoogleGenAI } from "@google/genai";
import { extractBase64Data } from '../utils/file';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

interface EditImageOptions {
  imageBase64: string; // Full Data URL
  mimeType: string;
  prompt: string;
}

export const generateIdPhoto = async ({ imageBase64, mimeType, prompt }: EditImageOptions): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment variables.");
  }

  const base64Data = extractBase64Data(imageBase64);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    // Handle response and extract image
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      throw new Error("No content generated");
    }

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image data found in response");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};