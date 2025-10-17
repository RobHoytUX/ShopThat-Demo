import {Controller, Get, Post, Body, Patch} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { randomUUID } from 'crypto';

@ApiTags('Chat')
@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('init')
  @ApiOperation({ summary: 'Get a random conversationId' })
  @ApiResponse({
    status: 200,
    description: 'Returns an object containing a random conversationId',
    schema: {
      properties: {
        conversationId: { type: 'string' },
      },
    },
  })
  getConversationId() {
    // Generate a random conversationId (UUID)
    return { conversationId: randomUUID() };
  }

  @Post('message')
  @ApiOperation({ summary: 'Simulate sending a message to Groq API' })
  @ApiResponse({
    status: 200,
    description: 'Always responds with "OK"',
    schema: {
      properties: {
        reply: { type: 'string', example: 'OK' },
      },
    },
  })
  sendMessageToGroqApi(
      @Body() body: { conversationId: string; message: string },
  ) {
    // Here we pretend to send the message to Groq API
    // but just respond with "OK"
    return { reply: 'OK' };
  }

  @Post('create-chat')
  @ApiOperation({ summary: 'Create a new chat and return the chatId' })
  @ApiResponse({
    status: 200,
    description: 'Returns the ID of the newly created chat',
    schema: {
      properties: {
        chatId: { type: 'string' },
      },
    },
  })
  async createChat() {
    const chatId = await this.chatService.createChat();
    return { chatId };
  }

  @Post('add-message')
  @ApiOperation({ summary: 'Add a new message to a chat' })
  @ApiResponse({
    status: 200,
    description: 'Adds a new message to a chat',
    schema: {
      properties: {
        messageId: { type: 'string' },
      },
    },
  })
  @ApiBody({
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
  })
  async addMessage(
    @Body()
    body: {
      chatId: string;
      role: 'customer' | 'groq' | '';
      content: string;
      tags: string[];
    },
  ) {
    const { chatId, role, content, tags } = body;
    const message = await this.chatService.addMessage(
      chatId,
      role,
      content,
      tags,
    );
    return { messageId: message.id };
  }

  @Post('ensure-groq-id')
  @ApiOperation({ summary: 'Ensure groqId exists for a chat' })
  @ApiResponse({
    status: 200,
    description: 'Ensures a groqId exists and returns it',
    schema: {
      properties: {
        groqId: { type: 'string' },
      },
    },
  })
  async ensureGroqId(@Body() body: { chatId: string }) {
    const groqId = await this.chatService.ensureGroqId(body.chatId);
    return { groqId };
  }

  @Post('send-to-groq')
  @ApiOperation({ summary: 'Send a message to Groq API' })
  @ApiResponse({
    status: 200,
    description: 'Sends the user message to Groq API and returns the response',
    schema: {
      properties: {
        reply: { type: 'string' },
      },
    },
  })
  async sendToGroqApi(@Body() body: { groqId: string; userMessage: string }) {
    const reply = await this.chatService.sendToGroqApi(
      body.groqId,
      body.userMessage,
    );
    return { reply };
  }

  @Post('get-chat-history')
  @ApiOperation({ summary: 'Get chat history by chatId' })
  @ApiResponse({
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
  })
  @ApiBody({
    description: 'Get chat history by chat ID',
    schema: {
      type: 'object',
      properties: {
        chatId: { type: 'string', description: 'Chat ID' },
      },
    },
  })
  async getChatHistory(@Body() body: { chatId: string }) {
    const history = await this.chatService.getChatHistory(body.chatId);
    return { messages: history };
  }

  @Get('system-prompt')
  @ApiOperation({ summary: 'Get chat system prompt' })
  @ApiResponse({
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
  })
  async getChatSystemPrompt() {
    const history = await this.chatService.getChatSystemPrompt();
    return { messages: history };
  }

  @Patch('system-prompt')
  @ApiBody({
    description: 'Get chat system prompt',
    schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Chat Bot system prompt' },
      },
    },
  })
  async updateChatSystemPrompt(@Body() body: { prompt: string }) {
    const response = await this.chatService.updateChatSystemPrompt(body.prompt);
    return { status: response ? 'OK' : 'KO' };
  }
}
