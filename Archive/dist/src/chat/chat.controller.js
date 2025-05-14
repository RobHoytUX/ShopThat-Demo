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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const chat_service_1 = require("./chat.service");
const crypto_1 = require("crypto");
let ChatController = class ChatController {
    constructor(chatService) {
        this.chatService = chatService;
    }
    getConversationId() {
        return { conversationId: (0, crypto_1.randomUUID)() };
    }
    sendMessageToGroqApi(body) {
        return { reply: 'OK' };
    }
    async createChat() {
        const chatId = await this.chatService.createChat();
        return { chatId };
    }
    async addMessage(body) {
        const { chatId, role, content, tags } = body;
        const message = await this.chatService.addMessage(chatId, role, content, tags);
        return { messageId: message.id };
    }
    async ensureGroqId(body) {
        const groqId = await this.chatService.ensureGroqId(body.chatId);
        return { groqId };
    }
    async sendToGroqApi(body) {
        const reply = await this.chatService.sendToGroqApi(body.groqId, body.userMessage);
        return { reply };
    }
    async getChatHistory(body) {
        const history = await this.chatService.getChatHistory(body.chatId);
        return { messages: history };
    }
    async getChatSystemPrompt() {
        const history = await this.chatService.getChatSystemPrompt();
        return { messages: history };
    }
    async updateChatSystemPrompt(body) {
        const response = await this.chatService.updateChatSystemPrompt(body.prompt);
        return { status: response ? 'OK' : 'KO' };
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)('init'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a random conversationId' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns an object containing a random conversationId',
        schema: {
            properties: {
                conversationId: { type: 'string' },
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "getConversationId", null);
__decorate([
    (0, common_1.Post)('message'),
    (0, swagger_1.ApiOperation)({ summary: 'Simulate sending a message to Groq API' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Always responds with "OK"',
        schema: {
            properties: {
                reply: { type: 'string', example: 'OK' },
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "sendMessageToGroqApi", null);
__decorate([
    (0, common_1.Post)('create-chat'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new chat and return the chatId' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns the ID of the newly created chat',
        schema: {
            properties: {
                chatId: { type: 'string' },
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "createChat", null);
__decorate([
    (0, common_1.Post)('add-message'),
    (0, swagger_1.ApiOperation)({ summary: 'Add a new message to a chat' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Adds a new message to a chat',
        schema: {
            properties: {
                messageId: { type: 'string' },
            },
        },
    }),
    (0, swagger_1.ApiBody)({
        description: 'Post new message in chat',
        schema: {
            type: 'object',
            properties: {
                chatId: { type: 'string', description: 'Chat ID' },
                role: {
                    type: 'string',
                    enum: ['customer', 'groq', ''],
                    description: 'Sender role',
                },
                content: { type: 'string', description: 'Content' },
                tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Tags for messages',
                },
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "addMessage", null);
__decorate([
    (0, common_1.Post)('ensure-groq-id'),
    (0, swagger_1.ApiOperation)({ summary: 'Ensure groqId exists for a chat' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Ensures a groqId exists and returns it',
        schema: {
            properties: {
                groqId: { type: 'string' },
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "ensureGroqId", null);
__decorate([
    (0, common_1.Post)('send-to-groq'),
    (0, swagger_1.ApiOperation)({ summary: 'Send a message to Groq API' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Sends the user message to Groq API and returns the response',
        schema: {
            properties: {
                reply: { type: 'string' },
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "sendToGroqApi", null);
__decorate([
    (0, common_1.Post)('get-chat-history'),
    (0, swagger_1.ApiOperation)({ summary: 'Get chat history by chatId' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns the chat history',
        schema: {
            properties: {
                messages: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            chatId: { type: 'string' },
                            role: { type: 'string' },
                            content: { type: 'string' },
                            tags: { type: 'array', items: { type: 'string' } },
                        },
                    },
                },
            },
        },
    }),
    (0, swagger_1.ApiBody)({
        description: 'Get chat history by chat ID',
        schema: {
            type: 'object',
            properties: {
                chatId: { type: 'string', description: 'Chat ID' },
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getChatHistory", null);
__decorate([
    (0, common_1.Get)('system-prompt'),
    (0, swagger_1.ApiOperation)({ summary: 'Get chat system prompt' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        schema: {
            type: 'array',
            items: {
                properties: {
                    id: { type: 'string' },
                    key: { type: 'string' },
                    value: { type: 'string' },
                },
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getChatSystemPrompt", null);
__decorate([
    (0, common_1.Patch)('system-prompt'),
    (0, swagger_1.ApiBody)({
        description: 'Get chat system prompt',
        schema: {
            type: 'object',
            properties: {
                prompt: { type: 'string', description: 'Chat Bot system prompt' },
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "updateChatSystemPrompt", null);
exports.ChatController = ChatController = __decorate([
    (0, swagger_1.ApiTags)('Chat'),
    (0, common_1.Controller)('api/chat'),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map