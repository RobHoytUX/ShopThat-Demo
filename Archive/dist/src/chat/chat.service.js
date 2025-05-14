"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const axios_1 = require("axios");
const groq_sdk_1 = require("groq-sdk");
let ChatService = class ChatService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createChat() {
        const chat = await this.prisma.chat.create({
            data: {},
        });
        return chat.id;
    }
    async addMessage(chatId, role, content, tags) {
        console.log('Saving message:', chatId, role, content, tags);
        return this.prisma.message.create({
            data: {
                chatId,
                role,
                content,
                tags,
            },
        });
    }
    async ensureGroqId(chatId) {
        const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
        if (chat.groqId) {
            return chat.groqId;
        }
        const response = await axios_1.default.post('https://pangee-siecwauy.xyz/api/chat/init', {});
        const groqId = response.data.conversationId;
        await this.prisma.chat.update({
            where: { id: chatId },
            data: { groqId },
        });
        return groqId;
    }
    async sendToGroqApi(groqId, userMessage) {
        const response = await this.getGroqChatCompletion(userMessage);
        return response.choices[0].message.content;
    }
    async getGroqChatCompletion(message) {
        const systemPrompt = await this.prisma.chatBotSettings.findFirst({ where: { key: 'system' } });
        const groq = new groq_sdk_1.default({ apiKey: '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' });
        const disabledWords = await this.prisma.keyWords.findMany({ where: { active: false } });
        const disabledWordsString = disabledWords.map(word => word.keyWord).join(',');
        const excludeRule = 'Word Exclusion Policy:\n' +
            'Exclude the following words from responses whenever possible, without blocking or altering the overall quality of the answer: ' + disabledWordsString +
            '\nIf a response requires a restricted word to maintain clarity or relevance, rephrase it using an appropriate luxury-aligned alternative.';
        console.log(systemPrompt.value + (disabledWords.length ? excludeRule : ''));
        return groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: systemPrompt.value + (disabledWords.length ? excludeRule : ''),
                },
                {
                    role: "user",
                    content: message,
                },
            ],
            model: "llama-3.3-70b-versatile",
        });
    }
    async getChatHistory(chatId) {
        return this.prisma.message.findMany({
            where: { chatId },
            orderBy: { createdAt: 'asc' },
        });
    }
    async getChatSystemPrompt() {
        return await this.prisma.chatBotSettings.findFirst({ where: { key: 'system' } });
    }
    async updateChatSystemPrompt(prompt) {
        const systemPrompt = await this.prisma.chatBotSettings.findFirst({ where: { key: 'system' } });
        await this.prisma.chatBotSettings.update({
            where: { id: systemPrompt.id },
            data: { value: prompt },
        });
        return true;
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChatService);
//# sourceMappingURL=chat.service.js.map