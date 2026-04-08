import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
  type: 'grammar' | 'spelling' | 'punctuation' | 'style' | 'tense';
}

export interface GrammarResult {
  correctedText: string;
  corrections: Correction[];
  summary: string;
}

export async function correctGrammar(text: string, tone: string = 'professional'): Promise<GrammarResult> {
  if (!text.trim()) {
    return { correctedText: '', corrections: [], summary: '' };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Correct the grammar, spelling, punctuation, and verb tense of the following text. 
      Ensure all sentences are complete and grammatically sound.
      Maintain a ${tone} tone.
      Provide the result in JSON format with the following structure:
      {
        "correctedText": "the full corrected text",
        "corrections": [
          {
            "original": "the original word or phrase",
            "corrected": "the corrected word or phrase",
            "explanation": "why this change was made",
            "type": "grammar" | "spelling" | "punctuation" | "style" | "tense"
          }
        ],
        "summary": "a brief summary of the improvements"
      }
      
      Text to correct: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            correctedText: { type: Type.STRING },
            corrections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  corrected: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['grammar', 'spelling', 'punctuation', 'style', 'tense'] }
                },
                required: ['original', 'corrected', 'explanation', 'type']
              }
            },
            summary: { type: Type.STRING }
          },
          required: ['correctedText', 'corrections', 'summary']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as GrammarResult;
  } catch (error) {
    console.error("Error correcting grammar:", error);
    throw error;
  }
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export async function chatWithAI(messages: ChatMessage[], context?: string): Promise<string> {
  try {
    const systemInstruction = context 
      ? `You are Linguist AI, a helpful writing assistant. The user is currently working on this text: "${context}". Help them with their questions about this text or writing in general.`
      : `You are Linguist AI, a helpful writing assistant. Help the user with their writing questions.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      })),
      config: {
        systemInstruction: systemInstruction
      }
    });

    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Error in chat:", error);
    throw error;
  }
}
