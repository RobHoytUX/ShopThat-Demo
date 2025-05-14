import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { ChatService } from './chat.service';
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly chatService;
    server: Server;
    constructor(chatService: ChatService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    joinChat(data: {
        chatId?: string;
    }, client: Socket): Promise<void>;
    handleMessage(data: {
        chatId: string;
        content: string;
    }, client: Socket): Promise<void>;
    getChatHistory(data: {
        chatId: string;
    }, client: Socket): Promise<void>;
}
