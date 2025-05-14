import { ChatService } from './chat.service';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    getConversationId(): {
        conversationId: `${string}-${string}-${string}-${string}-${string}`;
    };
    sendMessageToGroqApi(body: {
        conversationId: string;
        message: string;
    }): {
        reply: string;
    };
    createChat(): Promise<{
        chatId: string;
    }>;
    addMessage(body: {
        chatId: string;
        role: 'customer' | 'groq' | '';
        content: string;
        tags: string[];
    }): Promise<{
        messageId: string;
    }>;
    ensureGroqId(body: {
        chatId: string;
    }): Promise<{
        groqId: string;
    }>;
    sendToGroqApi(body: {
        groqId: string;
        userMessage: string;
    }): Promise<{
        reply: string;
    }>;
    getChatHistory(body: {
        chatId: string;
    }): Promise<{
        messages: {
            id: string;
            createdAt: Date;
            content: string;
            chatId: string;
            role: string;
            tags: string[];
        }[];
    }>;
    getChatSystemPrompt(): Promise<{
        messages: {
            id: string;
            createdAt: Date;
            value: string;
            key: string;
        };
    }>;
    updateChatSystemPrompt(body: {
        prompt: string;
    }): Promise<{
        status: string;
    }>;
}
