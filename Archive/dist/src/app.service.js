"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
let AppService = class AppService {
    getHello() {
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
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)()
], AppService);
//# sourceMappingURL=app.service.js.map