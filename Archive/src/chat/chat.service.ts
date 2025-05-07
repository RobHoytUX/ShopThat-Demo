import {Injectable} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import axios from 'axios';
import Groq from "groq-sdk";

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async createChat(): Promise<string> {
    const chat = await this.prisma.chat.create({
      data: {},
    });
    // Default tags for the initial message
    // this.addMessage(chat.id, '', '', [
    //   'Core Values Campaign',
    //   'Christopher MM Bag',
    //   'New Arrivals',
    //   'Brand Ambassadors',
    // ]);
    return chat.id;
  }

  async addMessage(
    chatId: string,
    role: 'customer' | 'groq' | '',
    content: string,
    tags: string[],
  ) {
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

  async ensureGroqId(chatId: string): Promise<string> {
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (chat.groqId) {
      return chat.groqId;
    }
    const response = await axios.post(
      'https://pangee-siecwauy.xyz/api/chat/init',
      {},
    );
    const groqId = response.data.conversationId;

    await this.prisma.chat.update({
      where: { id: chatId },
      data: { groqId },
    });
    return groqId;
  }

  async sendToGroqApi(groqId: string, userMessage: string): Promise<string> {
    const response = await this.getGroqChatCompletion(userMessage);

    //     await axios.post(
    //   'https://pangee-siecwauy.xyz/api/chat/message',
    //   {
    //     conversationId: groqId,
    //     userMessage,
    //   },
    // );
    return response.choices[0].message.content;
  }

  async getGroqChatCompletion(message: string ) {
    const systemPrompt = await this.prisma.chatBotSettings.findFirst({ where: { key: 'system' } });
    const groq = new Groq({ apiKey: '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' });
    const disabledWords = await this.prisma.keyWords.findMany({where: {active: false}})
    const disabledWordsString = disabledWords.map(word => word.keyWord).join(',');
    const excludeRule = 'Word Exclusion Policy:\n' +
    'Exclude the following words from responses whenever possible, without blocking or altering the overall quality of the answer: ' + disabledWordsString +
    '\nIf a response requires a restricted word to maintain clarity or relevance, rephrase it using an appropriate luxury-aligned alternative.'

    console.log(systemPrompt.value + (disabledWords.length?excludeRule:''))
    return groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt.value + (disabledWords.length?excludeRule:''),
        },
        {
          role: "user",
          content: message,
        },
      ],
      model: "llama-3.3-70b-versatile",
    });

  }

  async getChatHistory(chatId: string) {
    return this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getChatSystemPrompt() {
    return await this.prisma.chatBotSettings.findFirst({where: {key: 'system'}})
  }

  async updateChatSystemPrompt(prompt: string) {
    const systemPrompt = await this.prisma.chatBotSettings.findFirst({ where: { key: 'system' } });
    await this.prisma.chatBotSettings.update({
      where: { id: systemPrompt.id },
      data: { value: prompt },
    });
    return true
  }
}
