import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult } from "../types";

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(",")[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const analyzeVideoInterview = async (videoBlob: Blob): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const base64Data = await blobToBase64(videoBlob);
  
  // Determine mime type (defaulting to webm if specific one isn't on the blob)
  const mimeType = videoBlob.type || 'video/webm';

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      transcript: {
        type: Type.STRING,
        description: "A full text transcription of what the person said in the video.",
      },
      candidateName: {
        type: Type.STRING,
        description: "The name of the person if they introduced themselves, otherwise 'Unknown Candidate'.",
      },
      professionalSummary: {
        type: Type.STRING,
        description: "A professional CV summary derived from the video content (max 50 words).",
      },
      hardSkills: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of technical or hard skills mentioned or implied.",
      },
      softSkills: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of soft skills demonstrated or mentioned.",
      },
      tags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "General metadata tags for categorizing this video interview.",
      },
    },
    required: ["transcript", "candidateName", "professionalSummary", "hardSkills", "softSkills", "tags"],
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: "You are an expert HR recruiter. Analyze this video interview. Provide a transcription, extract skills, and create a professional summary for a CV. Return the response in JSON format."
          }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.2, // Low temperature for factual extraction
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    // Clean the text in case Gemini wraps it in markdown code blocks
    const cleanText = text.replace(/```json|```/g, '').trim();
    
    return JSON.parse(cleanText) as AnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};