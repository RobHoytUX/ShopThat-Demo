'use client';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';



interface ToggleItem { name: string; enabled: boolean }
interface CampaignConfig {
  keywords: ToggleItem[];
  sources: { internal_sources: ToggleItem[]; external_sources: ToggleItem[] };
}
interface ChatResponse {
  response: string;
  evaluation: string;
  similarity_score: number;
  sources: string[];
}

export default function Chatbot() {
  const { slug } = useParams() as { slug: string };
  const [config, setConfig] = useState<CampaignConfig | null>(null);
  const [allMap, setAllMap] = useState<Record<string, string[]>>({});
  const [enabled, setEnabled] = useState<string[]>([]);
  const [disabled, setDisabled] = useState<string[]>([]);
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  const [isScrolled, setIsScrolled] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

useEffect(() => {
  const scrollThreshold = 300;

  const handleScroll = () => {
    const currentScroll = window.scrollY;

    if (currentScroll >= scrollThreshold) {
      setIsScrolled(true);
      setIsExpanded(true);
    } else {
      setIsScrolled(false);
      setIsExpanded(false);
      setHovered(false);
    }
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [slug]);



  useEffect(() => {
    if (!slug) return;
    fetch(`${API_BASE}/api/campaigns/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((c: CampaignConfig) => setConfig(c))
      .catch(() => setConfig(null));

    fetch(`${API_BASE}/api/campaigns`)
      .then(r => r.json())
      .then((keys: string[]) =>
        Promise.all(
          keys.map(k =>
            fetch(`${API_BASE}/api/campaigns/${k}/keywords`)
              .then(r => r.json())
              .then((kw: string[]) => ({ key: k, kw }))
          )
        )
      )
      .then(entries => {
        const m: Record<string, string[]> = {};
        entries.forEach(({ key, kw }) => m[key] = kw);
        setAllMap(m);
      })
      .catch(() => { });
  }, [slug]);

  useEffect(() => {
    if (!config || !Object.keys(allMap).length) return;
    setEnabled(config.keywords.filter(t => t.enabled).map(t => t.name));
    const others: string[] = [];
    for (const [k, kw] of Object.entries(allMap)) {
      if (k !== slug) others.push(...kw);
    }
    setDisabled(others);
  }, [config, allMap, slug]);

  const titleCase = (s: string) =>
    s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  const clickKw = (kw: string) => {
    setInput(titleCase(kw));
    ref.current?.focus();
  };

  const send = async () => {
    const txt = input.trim();
    if (!txt) return;
    setMessages(ms => [...ms, { sender: 'user', text: txt }]);
    setInput('');
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: txt, enabled, disabled })
      });
      if (!res.ok) throw new Error(res.statusText);
      const d: ChatResponse = await res.json();
      setMessages(ms => [...ms, { sender: 'bot', text: d.response }]);
    } catch {
      setMessages(ms => [...ms, { sender: 'bot', text: '❗ Failed to fetch response' }]);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  };

  if (!slug) return null;
if (!config || !enabled.length) return null;

  const campaignTitle = titleCase(slug.replace(/_/g, ' '));
  const shouldShowFullChatbot = hovered || isExpanded;

  return (
    <div
      style={{
        ...styles.wrapper,
        opacity: isScrolled || hovered || isExpanded ? (hovered || isExpanded ? 1 : 0.3) : 0,
        pointerEvents: isScrolled || hovered || isExpanded ? 'auto' : 'none',
        transition: 'opacity 0.3s ease, pointer-events 0.3s ease',
        backgroundColor:
  isExpanded
    ? hovered
      ? 'white' 
      : 'rgba(255, 255, 255, 0.4)'
    : 'transparent',

      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          ...styles.toggle,
          opacity: isScrolled ? 0.3 : 0,
          pointerEvents: isScrolled ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {isExpanded ? '➖' : '💬'}
      </div>

      {shouldShowFullChatbot && (
        <div style={styles.chatbox}>
          <div style={styles.header}>
            <div style={styles.campaignTitle}>{campaignTitle}</div>
            <p style={styles.subtitle}>Learn more about these topics:</p>
            <div style={styles.options}>
              {enabled.map(kw => (
                <button key={kw} style={styles.optionButton} onClick={() => clickKw(kw)}>
                  {titleCase(kw)}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.messages}>
            {messages.map((m, i) => (
              <div key={i} style={m.sender === 'user' ? styles.userMessage : styles.botMessage}>
                {m.sender === 'user' ? (
                  <span>{m.text}</span>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {`\n${m.text}`}
                  </ReactMarkdown>
                )}
              </div>
            ))}
          </div>

          <div style={styles.inputWrapper}>
            <input
              ref={ref}
              style={styles.input}
              placeholder="Type your message"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
            />
            <button style={styles.sendButton} onClick={send}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'fixed',
    bottom: '72px',
    right: '20px',
    zIndex: 999,
  },
  toggle: {
    background: '#000',
    color: '#fff',
    borderRadius: '50%',
    padding: '10px 14px',
    fontSize: '20px',
    cursor: 'pointer',
    position: 'absolute',
    bottom: '-36px',
    right: '8px',
    boxShadow: '0 0 6px rgba(0,0,0,0.4)',
  },
  chatbox: {
    height: '500px',
    width: '400px',
    backgroundColor: 'transparent',
    color: 'black',
    borderRadius: '20px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 0 12px rgba(0,0,0,0.2)',
  },
  header: { textAlign: 'center' },
  campaignTitle: { fontSize: '18px', fontWeight: 600, marginBottom: '8px' },
  subtitle: { fontSize: '14px', color: '#555', marginBottom: '8px' },
  options: {
    display: 'flex', flexWrap: 'wrap', gap: '6px',
    justifyContent: 'center', marginBottom: '12px'
  },
  optionButton: {
    padding: '6px 10px',
    border: '1px solid #ccc',
    borderRadius: '12px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '12px'
  },
  messages: { flexGrow: 1, overflowY: 'auto', marginBottom: '8px' },
  userMessage: { textAlign: 'right', fontWeight: 'bold', margin: '4px 0' },
  botMessage: { textAlign: 'left', margin: '4px 0' },
  inputWrapper: { display: 'flex', gap: '8px' },
  input: {
    flexGrow: 1,
    padding: '8px',
    borderRadius: '8px',
    border: '1px solid #ccc'
  },
  sendButton: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: 'none',
    background: 'black',
    color: 'white',
    cursor: 'pointer'
  }
};
