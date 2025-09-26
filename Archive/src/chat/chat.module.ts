// src/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
    controllers: [ChatController],
    providers: [ChatGateway, ChatService, PrismaService],
})
export class ChatModule {}
