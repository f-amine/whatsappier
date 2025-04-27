// File: /whatsappier/lib/automations/helpers/ai-service.ts

import { env } from '@/env.mjs';
import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
    GenerationConfig,
    SafetySetting,
    Schema, // Import Schema type
    SchemaType // Import SchemaType enum
} from "@google/generative-ai";

const VALID_CLASSIFICATIONS = ['CONFIRM', 'DECLINE', 'UNCLEAR'] as const;
export type ReplyClassification = typeof VALID_CLASSIFICATIONS[number];

interface ClassificationResponse {
    classification: ReplyClassification;
}

export class GeminiService {

    private static genAIInstance: GoogleGenerativeAI | null = null;

    private static getGenAI(): GoogleGenerativeAI {
        if (!this.genAIInstance) {
            const apiKey = env.GEMINI_API_KEY;
            if (!apiKey) {
                console.error("[GeminiService] Error: GEMINI_API_KEY is not set in environment variables.");
                throw new Error("Gemini API Key not configured.");
            }
            this.genAIInstance = new GoogleGenerativeAI(apiKey);
        }
        return this.genAIInstance;
    }

    static async classifyOrderReply(replyText: string,  metadata: Record<string, any> | null): Promise<ReplyClassification> {
        const sentMessageContent  = metadata?.sentMessageContent || null;

        console.log(`[GeminiService] Classifying reply: "${replyText}", Previous Message: "${sentMessageContent}"`);

        try {
            const genAI = this.getGenAI();

            // --- Define Generation Config and Safety Settings ---
            const generationConfig: GenerationConfig = {
                maxOutputTokens: 50,
                temperature: 0.2,
                topP: 0.95,
                topK: 64,
                responseMimeType: "application/json",
                // *** SIMPLIFIED responseSchema ***
                responseSchema: {
                    type: SchemaType.OBJECT, // Top level is object
                    properties: {
                        classification: {
                            type: SchemaType.STRING, 
                        }
                    },
                    required: ["classification"]
                },
            };

            

            // --- Get Model with Configuration ---
            const model = genAI.getGenerativeModel({
                model: "gemini-2.0-flash",
                systemInstruction: `You are an AI assistant analyzing customer replies to an order confirmation message sent via WhatsApp. You are provided with the original automated confirmation message and the customer's reply.  Your primary goal is to determine if the customer is **confirming** or **declining** the order based *only* on the meaning of their reply text, WITH the original message in mind to better understand context,

**IMPORTANT: You must understand replies in ANY language and regional dialect.** Customers may respond informally, use slang, emojis, or make typos. Focus on the core intent: are they agreeing to proceed with the order or rejecting it?

Possible classifications:
- **CONFIRM**: The user expresses agreement to the order. Examples (in various languages): "yes", "ok", "confirm", "sure", "sounds good", "proceed", "sí", "oui", "ja", "va bene","ah", "ayh 3afak", "تمام", "好的", "👍", "✅", etc.
- **DECLINE**: The user expresses disagreement or desire to cancel. Examples: "no", "cancel", "stop", "don't want it", "decline", "non", "nein", "لا", "不要", "👎", "❌", etc.
- **UNCLEAR**: The user's reply is ambiguous, asks a question unrelated to confirming/declining (e.g., "when will it ship?"), is irrelevant, contains mixed signals, or is impossible to interpret as a clear confirm/decline.

Respond *only* with a JSON object matching this exact schema:
\`\`\`json
{
  "type": "object",
  "properties": {
    "classification": {
      "type": "string",
      "enum": ["CONFIRM", "DECLINE", "UNCLEAR"]
    }
  },
  "required": ["classification"]
}
\`\`\``,                
              generationConfig: generationConfig,
            });


            // --- Send Request ---
            console.log("[GeminiService] Sending request to Gemini API...");
              const prompt = `WhatsApp Message (Seller): "${sentMessageContent}"\n\nCustomer Reply: "${replyText}"`;
            console.log(prompt)
            const result = await model.generateContent(prompt);

            // --- Process Response ---
            const response = result.response;
            const responseText = response.text();
            console.log("[GeminiService] Raw API Response Text:", responseText);

            if (!responseText) {
                 console.warn("[GeminiService] Received empty response text from API.");
                 return 'UNCLEAR';
            }

            let parsedResponse: Partial<ClassificationResponse>;
            try {
                parsedResponse = JSON.parse(responseText);
            } catch (parseError) {
                console.error("[GeminiService] Failed to parse JSON response:", parseError);
                console.error("[GeminiService] Raw text was:", responseText);
                return 'UNCLEAR';
            }

            // *** VALIDATE the received string against our allowed values ***
            if (typeof parsedResponse === 'object' &&
                parsedResponse !== null &&
                typeof parsedResponse.classification === 'string' && // Check if it's a string
                VALID_CLASSIFICATIONS.includes(parsedResponse.classification as ReplyClassification)) // Check if it's one of the allowed enums
            {
                const finalClassification = parsedResponse.classification as ReplyClassification;
                console.log(`[GeminiService] Classified as: ${finalClassification}`);
                return finalClassification;
            } else {
                console.warn("[GeminiService] Received JSON does not match expected schema or value:", parsedResponse);
                return 'UNCLEAR';
            }

        } catch (error: any) {
            console.error("[GeminiService] Error calling Gemini API:", error);
            if (error.message?.includes("blocked") || error.message?.includes("Safety")) {
                 console.warn("[GeminiService] Request may have been blocked due to safety settings.");
            }
            return 'UNCLEAR';
        }
    }
}
