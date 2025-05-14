import { PrismaService } from '../prisma/prisma.service';
import Groq from "groq-sdk";
export declare class ChatService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createChat(): Promise<string>;
    addMessage(chatId: string, role: 'customer' | 'groq' | '', content: string, tags: string[]): Promise<{
        id: string;
        createdAt: Date;
        content: string;
        chatId: string;
        role: string;
        tags: string[];
    }>;
    ensureGroqId(chatId: string): Promise<string>;
    sendToGroqApi(groqId: string, userMessage: string): Promise<string>;
    getGroqChatCompletion(message: string): Promise<Groq.Chat.Completions.ChatCompletion>;
    getChatHistory(chatId: string): Promise<{
        id: string;
        createdAt: Date;
        content: string;
        chatId: string;
        role: string;
        tags: string[];
    }[]>;
    getChatSystemPrompt(): Promise<{
        id: string;
        createdAt: Date;
        value: string;
        key: string;
    }>;
    updateChatSystemPrompt(prompt: string): Promise<boolean>;
}
