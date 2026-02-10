import { GoogleGenAI } from "@google/genai";
import { extractBase64Data, resizeImage } from '../utils/file';

// Robustly clean the API key in case of copy-paste errors in .env
const rawApiKey = process.env.API_KEY || '';
// Removes 'YOUR_API_KEY_HERE', 'API_KEY=', and extra spaces
const apiKey = rawApiKey
  .replace(/YOUR_API_KEY_HERE/g, '')
  .replace(/API_KEY=/g, '')
  .trim();

const ai = new GoogleGenAI({ apiKey });

interface EditImageOptions {
  imageBase64: string; // Full Data URL
  mimeType: string;
  prompt: string;
}

const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error?.message) return error.error.message; 
  return JSON.stringify(error);
};

export const generateIdPhoto = async ({ imageBase64, mimeType, prompt }: EditImageOptions): Promise<string> => {
  // Check for invalid key length after cleaning
  if (apiKey.length < 20) {
    throw new Error("API Key configuration error. Please check your .env file and restart the server.");
  }

  // 1. Resize image to max 400px.
  // Smaller images = Fewer tokens = Faster generation = Less chance of timeout/quota issues
  let processedBase64 = imageBase64;
  try {
    processedBase64 = await resizeImage(imageBase64, 400); 
  } catch (e) {
    console.warn("Image resize failed, using original:", e);
  }

  const base64Data = extractBase64Data(processedBase64);
  const finalMimeType = processedBase64 !== imageBase64 ? 'image/jpeg' : mimeType;

  // We disable internal retries for 429 errors so the user isn't stuck waiting.
  // It's better to let the user click "Retry" manually.
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: finalMimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

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

  } catch (error: any) {
    const errorMsg = getErrorMessage(error);
    console.error(`Gemini API Error:`, errorMsg);
    
    // Check for Leaked Key or Permission Denied
    if (errorMsg.includes('leaked') || errorMsg.includes('PERMISSION_DENIED') || errorMsg.includes('API_KEY_INVALID')) {
       throw new Error("CRITICAL: API Key issue. Please check your .env file.");
    }

    const isQuotaError = 
      error.status === 429 || 
      error.status === 503 || 
      errorMsg.includes('429') || 
      errorMsg.includes('503') || 
      errorMsg.includes('quota') || 
      errorMsg.includes('RESOURCE_EXHAUSTED') ||
      errorMsg.includes('Overloaded');

    if (isQuotaError) {
      throw new Error("Server Busy (Rate Limit). Your API Key is working, but the Free Tier limit was reached. Please wait 30-60 seconds and try again.");
    }
    
    throw new Error(`Error: ${errorMsg}`);
  }
};