import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinChat')
  async joinChat(
    @MessageBody() data: { chatId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    let { chatId } = data;
    if (!chatId) {
      chatId = await this.chatService.createChat();
    }
    client.join(chatId);
    client.emit('joinedChat', { chatId });
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { chatId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { chatId, content } = data;

    if (!chatId) {
      client.emit('error', { message: 'No chatId provided' });
      return;
    }

    // const tags = ['Core Values Campaign', 'Christopher MM Bag', 'New Arrivals', 'Brand Ambassadors'];
    const tags = ['Core Values Campaign', 'Roger Federer', 'Rafael Nadal', 'Spring Summer 2025'];

    const userMsg = await this.chatService.addMessage(
      chatId,
      'customer',
      content,
      [],
    );

    client.emit('newMessage', userMsg);

    const groqId = await this.chatService.ensureGroqId(chatId);

    const groqReply = await this.chatService.sendToGroqApi(groqId, content);

    const groqMsg = await this.chatService.addMessage(
      chatId,
      'groq',
      groqReply,
      [],
    );

    groqMsg.tags = [];

    client.emit('newMessage', groqMsg);
  }

  @SubscribeMessage('getHistory')
  async getChatHistory(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { chatId } = data;
    if (!chatId) {
      client.emit('error', { message: 'No chatId provided' });
      return;
    }

    const history = await this.chatService.getChatHistory(chatId);
    console.log('Chat History:', history);

    history.forEach((message) => {
      client.emit('newMessage', message);
    });
  }
}
