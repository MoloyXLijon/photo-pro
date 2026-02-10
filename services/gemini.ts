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
  if (error?.error?.message) return error.error.message; 
  return JSON.stringify(error);
};

export const generateIdPhoto = async ({ imageBase64, mimeType, prompt }: EditImageOptions): Promise<string> => {
  // Check for placeholder or missing key
  if (!apiKey || apiKey.includes('YOUR_') || apiKey.length < 10) {
    throw new Error("API Key is not set correctly. Please replace the placeholder in your .env file with your actual Google Gemini API Key.");
  }

  // 1. Resize image to max 1024px to reduce token usage
  let processedBase64 = imageBase64;
  try {
    processedBase64 = await resizeImage(imageBase64, 1024);
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
        config: {
          // Set aspect ratio to 3:4 for Passport Size photos
          // Note: imageConfig support depends on the specific model version capabilities
          // If the model ignores this, we rely on the prompt instructions.
          // For gemini-2.5-flash-image, prompt is primary, but we pass config if supported.
        }
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
      
      const isQuotaError = 
        error.status === 429 || 
        errorMsg.includes('429') || 
        errorMsg.includes('quota') || 
        errorMsg.includes('RESOURCE_EXHAUSTED');

      if (isQuotaError && attempt < MAX_ATTEMPTS - 1) {
        const delay = 3000 * (attempt + 1);
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await wait(delay);
        continue;
      }
      
      if (!isQuotaError) break;
    }
  }

  const finalErrorMessage = getErrorMessage(lastError);
  
  if (finalErrorMessage.includes('429') || finalErrorMessage.includes('quota')) {
    throw new Error("Server is busy (Rate Limit). Please try again in 30 seconds.");
  }

  if (finalErrorMessage.includes('API_KEY_INVALID')) {
    throw new Error("Invalid API Key. Please check your .env file.");
  }

  throw new Error(finalErrorMessage || "Failed to generate image. Please try again.");
};