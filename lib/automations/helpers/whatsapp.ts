import { env } from "@/env.mjs";
import { NextApiRequest, NextApiResponse } from "next";

export enum WebhookEvent {
  APPLICATION_STARTUP = "APPLICATION_STARTUP",
  QRCODE_UPDATED = "QRCODE_UPDATED",
  MESSAGES_SET = "MESSAGES_SET",
  MESSAGES_UPSERT = "MESSAGES_UPSERT",
  MESSAGES_UPDATE = "MESSAGES_UPDATE",
  MESSAGES_DELETE = "MESSAGES_DELETE",
  SEND_MESSAGE = "SEND_MESSAGE",
  CONTACTS_SET = "CONTACTS_SET",
  CONTACTS_UPSERT = "CONTACTS_UPSERT",
  CONTACTS_UPDATE = "CONTACTS_UPDATE",
  PRESENCE_UPDATE = "PRESENCE_UPDATE",
  CHATS_SET = "CHATS_SET",
  CHATS_UPSERT = "CHATS_UPSERT",
  CHATS_UPDATE = "CHATS_UPDATE",
  CHATS_DELETE = "CHATS_DELETE",
  GROUPS_UPSERT = "GROUPS_UPSERT",
  GROUP_UPDATE = "GROUP_UPDATE",
  GROUP_PARTICIPANTS_UPDATE = "GROUP_PARTICIPANTS_UPDATE",
  CONNECTION_UPDATE = "CONNECTION_UPDATE",
  LABELS_EDIT = "LABELS_EDIT",
  LABELS_ASSOCIATION = "LABELS_ASSOCIATION",
  CALL = "CALL",
  TYPEBOT_START = "TYPEBOT_START",
  TYPEBOT_CHANGE_STATUS = "TYPEBOT_CHANGE_STATUS"
}

export interface QuotedMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
    participant?: string;
  };
  message: {
    conversation?: string;
    // Add other message types if needed
  };
}

export interface SendTextOptions {
  number: string;
  text: string;
  delay?: number;
  quoted?: QuotedMessage;
  linkPreview?: boolean;
  mentionsEveryOne?: boolean;
  mentioned?: string[];
}

export interface SendTextResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    extendedTextMessage?: {
      text: string;
    };
    conversation?: string;
  };
  messageTimestamp: string;
  status: string;
}

export interface WhatsAppNumberCheckResponse {
  exists: boolean;
  jid: string;
  number: string;
}

export interface WebhookConfig {
  enabled: boolean;
  url: string;
  events: WebhookEvent[];
  webhookByEvents?: boolean;
  webhookBase64?: boolean;
}

export interface WebhookSetResponse {
  webhook: {
    instanceName: string;
    webhook: {
      url: string;
      events: WebhookEvent[];
      enabled: boolean;
    };
  };
}

export interface WhatsAppError extends Error {
  status?: number;
  response?: any;
}

export interface QRCodeResponse {
    base64: string;
    code: string;
    pairingCode?: string; // Optional based on API/usage
    count?: number; // Optional
}

export interface WhatsappInstanceData {
    instanceName: string;
    number?: string; // Make number optional if not always needed at creation
    qrcode?: boolean;
    integration?: 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS';
    token?: string; // API key for the instance, if not using global key
    webhook?: string; // Webhook URL
    webhook_by_events?: boolean;
    businessId?: string;
    events?: WebhookEvent[];
    reject_call?: boolean;
    msg_call?: string;
    groups_ignore?: boolean;
    always_online?: boolean;
    read_messages?: boolean;
    read_status?: boolean;
}
export interface WhatsappInstanceResponse {
    instance: {
        instanceName: string;
        instanceId?: string; // Seems optional in basic create response
        status: 'created' | 'connecting' | 'connected' | string; // Allow other strings
        owner?: string; // Add owner if present
        profileName?: string;
        profileStatus?: string;
        profilePictureUrl?: string;
        // Add fields relevant to the response of '/instance/create'
    };
    hash: { apikey: string; }; // Contains the instance API key
    qrcode?: QRCodeResponse; // QR code might be returned directly on creation if qrcode=true
    settings?: Record<string, any>; // Keep flexible or type strictly
}
export interface WhatsappDeleteResponse {
    status: "SUCCESS" | "ERROR" | boolean; // API might return boolean true
    error?: boolean | string; // Error might be boolean or string
    response?: { message: string; } | string; // Response might be object or string
    message?: string; // Sometimes message is top-level
}
export interface WhatsappConnectionStateResponse {
    instance: {
        instanceName: string;
        state: 'open' | 'connecting' | 'close' | 'refused' | string; // Allow other potential states
    };
}


export class WhatsAppService {
    private apiKey: string;
    private baseUrl: string;
    // instanceName is now optional for methods that don't need it at construction
    private instanceName?: string;

    // Constructor allows optional instanceName
    constructor(apiKey: string, baseUrl: string, instanceName?: string) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.instanceName = instanceName;
    }

    // Updated makeRequest to handle optional instanceName in URL path
    private async makeRequest(
        endpoint: string,
        method: string = "GET",
        data?: any,
        requiresInstanceInPath: boolean = true
    ): Promise<any> {
        // Construct URL based on whether instanceName is required in the path
        const urlPath = requiresInstanceInPath
            ? `${endpoint}/${this.instanceName}`
            : endpoint;
        const url = `${this.baseUrl}${urlPath}`;

        if (requiresInstanceInPath && !this.instanceName) {
            throw new Error(`WhatsAppService: Instance name is required for endpoint '${endpoint}' but was not provided.`);
        }

        console.log(`[WhatsAppService] Request: ${method} ${url}`); // Log request

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    apikey: this.apiKey, // Use the global API key for authentication
                },
                body: data ? JSON.stringify(data) : undefined,
            });

            if (!response.ok) {
                let errorBody: any;
                try {
                    errorBody = await response.json();
                    console.error(`[WhatsAppService] API Error Response (${response.status}):`, errorBody);
                    console.dir(errorBody,{depth:null})
                } catch (e) {
                    errorBody = await response.text();
                    console.error(`[WhatsAppService] API Error Response (${response.status}, non-JSON):`, errorBody);
                }
                const error: WhatsAppError = new Error(`WhatsApp API Error (${response.status}): ${typeof errorBody === 'string' ? errorBody : errorBody?.message || errorBody?.error || 'Unknown error'}`);
                error.status = response.status;
                error.response = errorBody;
                throw error;
            }

            // Handle potential empty responses for success codes like 200/204
            if (response.status === 204) {
                 console.log(`[WhatsAppService] Response: ${response.status} No Content`);
                 return { success: true }; // Return success indicator for No Content
            }

            const responseData = await response.json();
            // console.log(`[WhatsAppService] Response: ${response.status}`, responseData); // Log success response
            return responseData;

        } catch (error) {
            // Log error caught during fetch or processing
            console.error(`[WhatsAppService] Fetch/Processing Error for ${method} ${url}:`, error);
            throw error; // Re-throw the error
        }
    }

    
    async createInstance(instanceData: WhatsappInstanceData): Promise<WhatsappInstanceResponse> {
        // '/instance/create' does not take instanceName in the path
        return this.makeRequest("/instance/create", "POST", instanceData, false);
    }

    /**
     * Get the connection state of the current instance.
     */
    async getConnectionState(): Promise<WhatsappConnectionStateResponse> {
        // Requires instanceName to be set in the constructor or method call
        return this.makeRequest("/instance/connectionState", "GET");
    }

    /**
     * Initiate connection and get QR code for the current instance.
     */
    async connectInstance(): Promise<QRCodeResponse> {
        // Requires instanceName
        return this.makeRequest("/instance/connect", "GET");
    }

    /**
     * Logout the current instance.
     */
    async logoutInstance(): Promise<WhatsappDeleteResponse> {
        // Requires instanceName
        return this.makeRequest("/instance/logout", "DELETE");
    }

    /**
     * Delete the current instance.
     */
    async deleteInstance(): Promise<WhatsappDeleteResponse> {
        // Requires instanceName
        return this.makeRequest("/instance/delete", "DELETE");
    }


    // --- Messaging and Webhook Methods (require instanceName) ---

    /**
     * Send a plain text message.
     */
    async sendText(options: SendTextOptions): Promise<SendTextResponse> {
        return this.makeRequest("/message/sendText", "POST", options);
    }

    /**
     * Configure the webhook for the current instance.
     */
    async setWebhook(config: WebhookConfig): Promise<WebhookSetResponse> {
        const payload = {
            webhook: config 
        };
        return this.makeRequest("/webhook/set", "POST", payload);
    }

    /**
     * Send a template message with variables.
     */
    async sendTemplate(
        to: string,
        templateContent: string, // Renamed from templateName for clarity
        variables: Record<string, string>
        // language is not directly supported by sendText, handled via template content
    ): Promise<SendTextResponse> {
        let messageText = templateContent;
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            // Use global flag 'g' for multiple occurrences
            messageText = messageText.replace(new RegExp(this.escapeRegExp(placeholder), 'g'), value);
        }

        return this.sendText({ number: to, text: messageText });
    }

    // Helper to escape regex special characters in placeholder
    private escapeRegExp(string: string): string {
         return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }

    /**
     * Check if phone numbers exist on WhatsApp.
     */
    async checkWhatsAppNumbers(numbers: string[]): Promise<WhatsAppNumberCheckResponse[]> {
        return this.makeRequest("/chat/whatsappNumbers", "POST", { numbers });
    }


    // --- Static Methods ---

    /**
     * Create an instance of WhatsAppService from a device record.
     * Requires device.name (as instanceName).
     */
    static fromDevice(device: { name: string }): WhatsAppService {
        const baseUrl = env.AP_WHATSAPPIER_SERVER_URL;
        const apiKey = env.AP_WHATSAPPIER_API_KEY;

        if (!baseUrl || !apiKey) {
            throw new Error("WhatsApp API Base URL or Key not configured in environment.");
        }
        if (!device || !device.name) {
             throw new Error("Invalid device object provided or missing device name.");
        }

        return new WhatsAppService(apiKey, baseUrl, device.name);
    }
}
