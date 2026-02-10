import { GoogleGenAI } from "@google/genai";
import { extractBase64Data, resizeImage } from '../utils/file';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

interface EditImageOptions {
  imageBase64: string; // Full Data URL
  mimeType: string;
  prompt: string;
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  // Handle nested error objects from Google API
  if (error?.error?.message) return error.error.message; 
  return JSON.stringify(error);
};

export const generateIdPhoto = async ({ imageBase64, mimeType, prompt }: EditImageOptions): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment variables.");
  }

  // 1. Resize image to max 1024px to reduce token usage and payload size
  // This helps avoid timeouts and reduces resource usage on the API side
  let processedBase64 = imageBase64;
  try {
    processedBase64 = await resizeImage(imageBase64, 1024);
  } catch (e) {
    console.warn("Image resize failed, using original:", e);
  }

  const base64Data = extractBase64Data(processedBase64);
  
  // Use JPEG mime type if we resized (resizeImage returns jpeg)
  const finalMimeType = processedBase64 !== imageBase64 ? 'image/jpeg' : mimeType;

  let lastError: any = null;
  
  // 5 Attempts with exponential backoff
  const MAX_ATTEMPTS = 5;

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
      console.error(`Gemini API Error (Attempt ${attempt + 1}/${MAX_ATTEMPTS}):`, errorMsg);
      lastError = error;
      
      const isQuotaError = 
        error.status === 429 || 
        errorMsg.includes('429') || 
        errorMsg.includes('quota') || 
        errorMsg.includes('RESOURCE_EXHAUSTED') ||
        errorMsg.includes('overloaded');

      // If it's a quota/rate limit error and we haven't exhausted retries
      if (isQuotaError && attempt < MAX_ATTEMPTS - 1) {
        // Exponential backoff with jitter: 2s, 4s, 8s, 16s
        // Adding random jitter helps prevents thundering herd if multiple clients retry at once
        const baseDelay = 2000 * Math.pow(2, attempt);
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;
        
        console.log(`Rate limited. Retrying in ${Math.round(delay)}ms...`);
        await wait(delay);
        continue;
      }
      
      // If it's not a retryable error, break immediately
      if (!isQuotaError) {
        break;
      }
    }
  }

  const finalErrorMessage = getErrorMessage(lastError);
  
  if (finalErrorMessage.includes('429') || finalErrorMessage.includes('quota') || finalErrorMessage.includes('RESOURCE_EXHAUSTED')) {
    // Check for hard billing limit vs rate limit
    if (finalErrorMessage.includes('billing') || finalErrorMessage.includes('plan')) {
      throw new Error("Usage limit reached. Please check your API billing status or try again later.");
    }
    throw new Error("System is currently busy (Rate Limited). Please wait 30 seconds and try again.");
  }

  throw new Error(finalErrorMessage || "Failed to generate image.");
};