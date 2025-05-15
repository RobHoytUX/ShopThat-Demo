'use client';
import { useState } from 'react';

const Chatbot = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');

  const responses: Record<string, string> = {
    'Core Values Campaign': 'The Core Values Campaign celebrates timeless elegance.',
    'Roger Federer': 'Roger Federer is one of the ambassadors of LV.',
    'Rafael Nadal': 'Rafael Nadal collaborates on LV’s sports legacy.',
    'Brand Ambassadors': 'We work with iconic personalities worldwide.',
  };

  const handleClick = (topic: string) => {
    setMessages(prev => [...prev, topic, responses[topic]]);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, input, "I'm just a demo. Please click an option."]);
    setInput('');
  };

  return (
    <div style={styles.chatbox}>
      <div style={styles.header}>
        <div style={styles.logo}>LV</div>
        <div style={styles.greeting}>Hello</div>
        <p style={styles.subtitle}>Would you like to learn more about these?</p>
        <div style={styles.options}>
          {Object.keys(responses).map(key => (
            <button key={key} style={styles.optionButton} onClick={() => handleClick(key)}>
              {key}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.messages}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={idx % 2 === 0 ? styles.userMessage : styles.botMessage}
          >
            {msg}
          </div>
        ))}
      </div>

      <div style={styles.inputWrapper}>
        <input
          style={styles.input}
          placeholder="Type your message"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button style={styles.sendButton} onClick={handleSend}>↑</button>
      </div>
    </div>
  );
};

export default Chatbot;

const styles: Record<string, React.CSSProperties> = {
  chatbox: {
    height: '500px',
    width: '400px',
    backgroundColor: 'white',
    color: 'black',
    borderRadius: '28px',
    padding: '40px 16px 16px',
    position: 'fixed',
    bottom: '72px',
    right: '20px',
    boxShadow: '0 0 12px rgba(0,0,0,0.2)',
  },
  header: {
    textAlign: 'center',
  },
  logo: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  greeting: {
    fontSize: '20px',
    margin: '5px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#444',
  },
  options: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
    marginTop: '10px',
  },
  optionButton: {
    padding: '6px 10px',
    border: '1px solid #ccc',
    background: 'white',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  messages: {
    maxHeight: '200px',
    overflowY: 'auto',
    margin: '10px 0',
  },
  userMessage: {
    textAlign: 'right',
    fontWeight: 'bold',
    margin: '5px 0',
  },
  botMessage: {
    textAlign: 'left',
    margin: '5px 0',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '10px',
  },
  input: {
    flexGrow: 1,
    padding: '6px',
    borderRadius: '8px',
    border: '1px solid #ccc',
  },
  sendButton: {
    marginLeft: '8px',
    padding: '6px 10px',
    borderRadius: '8px',
    border: 'none',
    background: 'black',
    color: 'white',
    cursor: 'pointer',
  },
};
