import { GoogleGenAI } from "@google/genai";
import { extractBase64Data, resizeImage } from '../utils/file';

// Initialize the API client using process.env.API_KEY directly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface EditImageOptions {
  imageBase64: string; // Full Data URL
  mimeType: string;
  prompt: string;
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error?.message) return error.error.message; 
  return JSON.stringify(error);
};

export const generateIdPhoto = async ({ imageBase64, mimeType, prompt }: EditImageOptions): Promise<string> => {
  // 1. Resize image to max 512px (Further reduced to minimize token usage and avoid Quota errors)
  let processedBase64 = imageBase64;
  try {
    // Reduced to 512px. This is sufficient for ID photo previews and significantly reduces payload size (Tokens).
    processedBase64 = await resizeImage(imageBase64, 512); 
  } catch (e) {
    console.warn("Image resize failed, using original:", e);
  }

  const base64Data = extractBase64Data(processedBase64);
  const finalMimeType = processedBase64 !== imageBase64 ? 'image/jpeg' : mimeType;

  let lastError: any = null;
  const MAX_ATTEMPTS = 3;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
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
      console.error(`Gemini API Error (Attempt ${attempt + 1}):`, errorMsg);
      lastError = error;
      
      // CRITICAL: Check for Leaked Key or Permission Denied immediately
      if (errorMsg.includes('leaked') || errorMsg.includes('PERMISSION_DENIED') || errorMsg.includes('API_KEY_INVALID')) {
         throw new Error("CRITICAL: API Key issue detected. Please check your configuration.");
      }

      const isQuotaError = 
        error.status === 429 || 
        error.status === 503 || 
        errorMsg.includes('429') || 
        errorMsg.includes('503') || 
        errorMsg.includes('quota') || 
        errorMsg.includes('RESOURCE_EXHAUSTED') ||
        errorMsg.includes('Overloaded');

      if (isQuotaError && attempt < MAX_ATTEMPTS - 1) {
        // The free tier has a limit of ~2 requests per minute.
        // We must wait long enough to cross the minute boundary to reset the quota.
        // Attempt 0: Wait 15 seconds
        // Attempt 1: Wait 40 seconds (Total 55s wait, almost a full minute)
        const delay = attempt === 0 ? 15000 : 40000;
        console.log(`Quota limit hit (429). Waiting ${delay/1000}s for quota to reset...`);
        await wait(delay);
        continue;
      }
      
      if (!isQuotaError) break;
    }
  }

  const finalErrorMessage = getErrorMessage(lastError);
  
  if (finalErrorMessage.includes('429') || finalErrorMessage.includes('quota') || finalErrorMessage.includes('RESOURCE_EXHAUSTED')) {
    throw new Error("Server is extremely busy (Free Tier Limit Reached). Please wait at least 1 full minute before trying again.");
  }
  
  if (finalErrorMessage.includes('leaked') || finalErrorMessage.includes('PERMISSION_DENIED')) {
      throw new Error("CRITICAL: API Key blocked or invalid. Please check your configuration.");
  }

  if (finalErrorMessage.includes('API_KEY_INVALID')) {
    throw new Error("Invalid API Key.");
  }

  throw new Error(`Error: ${finalErrorMessage}`);
};