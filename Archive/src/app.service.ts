// src/app.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    // Return a minimal HTML page with Socket.IO to test WebSocket connection
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Local WebSocket Test</title>
</head>
<body>
  <h1>WebSocket Chat Test</h1>
  <div>
    <label for="messageInput">Message:</label>
    <input type="text" id="messageInput" placeholder="Type your message" />
    <button id="sendBtn">Send</button>
  </div>
  <h2>Chat Output</h2>
  <pre id="output" style="border: 1px solid #ccc; padding: 10px; width: 400px; height: 200px; overflow-y: auto;"></pre>
  
  <script>
  
  function initSocket() {
    const socket = io('https://pangee-siecwauy.xyz/chat', { transports: ['websocket'] });
    let chatId = '';
    const outputEl = document.getElementById('output');
    const sendBtn = document.getElementById('sendBtn');
    const messageInput = document.getElementById('messageInput');

    function logMessage(msg) {
      outputEl.textContent += msg + '\\n';
      outputEl.scrollTop = outputEl.scrollHeight;
    }
    socket.on('connect', () => {
      logMessage('Connected to WebSocket server.');
      socket.emit('joinChat', {});
    });
    socket.on('disconnect', () => {
      logMessage('Disconnected from server.');
    });
    socket.on('joinedChat', (data) => {
        chatId = data.chatId;
        logMessage('Joined chat: ' + chatId);
        socket.emit('chatHistory', {});
    });
    socket.on('newMessage', (message) => {
      logMessage(\`[\${message.role}] \${message.content}\`);
    });
    sendBtn.addEventListener('click', () => {
      const content = messageInput.value;
      if (!content) return;
      socket.emit('sendMessage', {
        chatId: chatId,
        content,
      });
      messageInput.value = '';
    });
  }
    
  </script>
  
  <script 
    src="https://cdn.socket.io/4.5.4/socket.io.min.js"
    crossorigin="anonymous"
    onload="initSocket()">
  </script>

  
</body>
</html>
    `;
  }
}
