'use client';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface ToggleItem { name: string; enabled: boolean }
interface CampaignConfig {
  keywords: ToggleItem[];
  internal_sources: ToggleItem[];
  external_sources: ToggleItem[];
}
interface ChatResponse { answer: string; sources: string[]; }

interface KeywordDTO {
  id: string;
  name: string;
  parent?: string | null; // id or name
}
interface KwNode {
  id: string;
  name: string;
  children: KwNode[];
  descCount: number;
}

export default function Chatbot() {
  const { slug } = useParams() as { slug: string };

  const [config, setConfig] = useState<CampaignConfig | null>(null);
  const [allMap, setAllMap] = useState<Record<string, string[]>>({});
  const [enabled, setEnabled] = useState<string[]>([]);
  const [disabled, setDisabled] = useState<string[]>([]);

  const [messages, setMessages] = useState<{ sender: 'user' | 'bot'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  // floating widget UI
  const [isScrolled, setIsScrolled] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // keyword nav state
  const [kwRoots, setKwRoots] = useState<KwNode[]>([]);
  const [kwStack, setKwStack] = useState<KwNode[]>([]);
  const [kwFilter, setKwFilter] = useState('');

  const titleCase = (s: string) =>
    s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  const clickKw = (kw: string) => {
    setInput(titleCase(kw));
    inputRef.current?.focus();
  };

  const computeDescCount = (node: KwNode): number => {
    if (!node.children.length) return 0;
    let total = node.children.length;
    for (const c of node.children) total += computeDescCount(c);
    return total;
  };

  const buildTree = (items: KeywordDTO[]): KwNode[] => {
    const byId = new Map<string, KwNode>();
    const byName = new Map<string, KwNode>();

    // first pass: create nodes
    items.forEach(k => {
      const node: KwNode = { id: k.id, name: k.name, children: [], descCount: 0 };
      byId.set(k.id, node);
      byName.set(k.name.trim().toLowerCase(), node);
    });

    // second pass: attach children
    const roots: KwNode[] = [];
    items.forEach(k => {
      const node = byId.get(k.id)!;
      const pRaw = (k.parent ?? '').trim();
      if (pRaw) {
        const parentNode = byId.get(pRaw) || byName.get(pRaw.toLowerCase());
        if (parentNode) parentNode.children.push(node);
        else roots.push(node); // orphan → root
      } else {
        roots.push(node);
      }
    });

    // sort + counts
    const sortRec = (nodes: KwNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach(n => sortRec(n.children));
    };
    sortRec(roots);

    const countRec = (node: KwNode) => {
      node.descCount = computeDescCount(node);
      node.children.forEach(countRec);
    };
    roots.forEach(countRec);

    return roots;
  };

  const currentNodes: KwNode[] = useMemo(
    () => (kwStack.length ? kwStack[kwStack.length - 1].children : kwRoots),
    [kwStack, kwRoots]
  );

  const filteredNodes = useMemo(() => {
    const f = kwFilter.trim().toLowerCase();
    if (!f) return currentNodes;
    return currentNodes.filter(n => n.name.toLowerCase().includes(f));
  }, [currentNodes, kwFilter]);

  // show/hide widget on scroll
  useEffect(() => {
    const scrollThreshold = 300;
    const onScroll = () => {
      const s = window.scrollY;
      if (s >= scrollThreshold) {
        setIsScrolled(true);
        setIsExpanded(true);
      } else {
        setIsScrolled(false);
        setIsExpanded(false);
        setHovered(false);
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [slug]);

  // load config + keywords
  useEffect(() => {
    if (!slug) return;

    fetch(`${API_BASE}/api/campaigns/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((c: CampaignConfig) => setConfig(c))
      .catch(err => { console.error('campaign config error', err); setConfig(null); });

    fetch(`${API_BASE}/api/campaigns`)
      .then(r => r.json())
      .then((campaigns: { key: string; display_name: string }[]) =>
        Promise.all(
          campaigns.map(c =>
            fetch(`${API_BASE}/api/campaigns/${c.key}/keywords`)
              .then(r => r.json())
              .then((keywords: KeywordDTO[]) => ({ key: c.key, kw: keywords.map(k => k.name) }))
              .catch(() => ({ key: c.key, kw: [] }))
          )
        )
      )
      .then(entries => {
        const m: Record<string, string[]> = {};
        entries.forEach(({ key, kw }) => (m[key] = kw || []));
        setAllMap(m);
      })
      .catch(err => { console.error('campaigns fetch error', err); setAllMap({}); });

    fetch(`${API_BASE}/api/campaigns/${slug}/keywords`)
      .then(r => r.json())
      .then((kws: KeywordDTO[]) => {
        setKwRoots(buildTree(kws));
        setKwStack([]);
        setKwFilter('');
      })
      .catch(err => { console.error('keyword tree error', err); setKwRoots([]); setKwStack([]); setKwFilter(''); });
  }, [slug]);

  // compute enabled/disabled sets
  useEffect(() => {
    if (!config || !Object.keys(allMap).length) return;

    setEnabled(config.keywords.filter(t => t.enabled).map(t => t.name));

    const others: string[] = [];
    for (const [k, kw] of Object.entries(allMap)) {
      if (k !== slug && Array.isArray(kw)) others.push(...kw);
    }
    setDisabled(others);
  }, [config, allMap, slug]);

  // auto-scroll chat pane
  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, isLoading]);

  // ---------------- chat helpers ----------------
  const askLLM = useCallback(async (txt: string, kw?: { id: string; name: string }) => {
    const message = txt.trim();
    if (!message) return;
    setIsLoading(true);
    setMessages(ms => [...ms, { sender: 'user', text: message }]);

    try {
      const body: any = { message, enabled, disabled, top_k: 5 };
      // ONLY include keyword when it's a keyword click
      if (kw) {
        body.keyword_id = kw.id;
        body.keyword_name = kw.name;
        body.source = 'keyword_click';
      }

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ChatResponse = await res.json();
      setMessages(ms => [...ms, { sender: 'bot', text: data.answer }]);
    } catch (e) {
      console.error('Chat error:', e);
      setMessages(ms => [...ms, { sender: 'bot', text: '❗ Failed to fetch response. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, disabled]);

  // FREE-TEXT → never scoped
  const send = async () => {
    const txt = input.trim();
    if (!txt || isLoading) return;
    setInput('');
    await askLLM(txt); // no keyword_id here
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // keyword click behavior
  const handleNodeClick = (node: KwNode) => {
    const msg = titleCase(node.name);
    const top = kwStack[kwStack.length - 1];
    const isTop = !!top && top.id === node.id;
    const hasKids = node.children.length > 0;

    if (hasKids) {
      if (isTop) {
        setKwStack(prev => prev.slice(0, -1)); // collapse
      } else {
        setKwStack(prev => [...prev, node]);   // expand
        void askLLM(msg, { id: node.id, name: node.name }); // scoped ask
      }
    } else {
      // leaf → ask + keep input handy
      void askLLM(msg, { id: node.id, name: node.name });
      clickKw(node.name);
    }
  };

  const goBackOne = () => { if (kwStack.length) { setKwStack(kwStack.slice(0, -1)); setKwFilter(''); } };
  const goToCrumb = (i: number) => { setKwStack(kwStack.slice(0, i + 1)); setKwFilter(''); };
  const resetToRoot = () => { setKwStack([]); setKwFilter(''); };

  if (!slug || !config || !enabled.length) return null;

  const campaignTitle = titleCase(slug.replace(/_/g, ' '));
  const shouldShowFullChatbot = hovered || isExpanded;

  return (
    <div
      style={{
        ...styles.wrapper,
        opacity: isScrolled || hovered || isExpanded ? (hovered || isExpanded ? 1 : 0.3) : 0,
        pointerEvents: isScrolled || hovered || isExpanded ? 'auto' : 'none',
        transition: 'opacity 0.3s ease, pointer-events 0.3s ease',
        backgroundColor: isExpanded ? (hovered ? 'white' : 'rgba(255,255,255,0.4)') : 'transparent',
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

            {/* breadcrumb */}
            <div style={styles.breadcrumb}>
              <button style={styles.breadcrumbBtn} onClick={resetToRoot}>All topics</button>
              {kwStack.map((n, i) => (
                <span key={n.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <span style={{ padding: '0 6px', color: '#888' }}>›</span>
                  <button style={styles.breadcrumbBtn} onClick={() => goToCrumb(i)}>
                    {titleCase(n.name)}
                  </button>
                </span>
              ))}
              {kwStack.length > 0 && (
                <button style={styles.backBtn} onClick={goBackOne}>← Back</button>
              )}
            </div>

            {/* filter */}
            <div style={styles.controlsRow}>
              <input
                value={kwFilter}
                onChange={e => setKwFilter(e.target.value)}
                placeholder="Filter this level…"
                style={styles.filterInput}
              />
            </div>

            {/* chips for current level */}
            <div style={styles.options}>
              {filteredNodes.map(node => {
                const isActive = kwStack[kwStack.length - 1]?.id === node.id;
                const hasKids = node.children.length > 0;
                return (
                  <button
                    key={node.id}
                    style={{
                      ...styles.optionButton,
                      ...(isActive ? styles.optionActive : {}),
                      ...(hasKids ? styles.optionHasKids : {})
                    }}
                    onClick={() => handleNodeClick(node)}
                    title={hasKids ? 'Expand topic' : 'Ask about this'}
                  >
                    {titleCase(node.name)}
                    {hasKids ? <span style={styles.chev}>›</span> : null}
                    {hasKids && (
                      <span style={styles.badge} aria-label="descendant count">
                        {node.descCount}
                      </span>
                    )}
                  </button>
                );
              })}
              {!filteredNodes.length && (
                <div style={{ fontSize: 12, color: '#777' }}>No matches at this level.</div>
              )}
            </div>
          </div>

          <div style={styles.messages} ref={messagesRef}>
            {messages.map((m, i) => (
              <div key={i} style={m.sender === 'user' ? styles.userMessage : styles.botMessage}>
                {m.sender === 'user'
                  ? <span>{m.text}</span>
                  : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                      {`\n${m.text}`}
                    </ReactMarkdown>
                  )}
              </div>
            ))}
            {isLoading && (
              <div style={styles.botMessage}><div style={styles.loading}>Thinking...</div></div>
            )}
          </div>

          <div style={styles.inputWrapper}>
            <input
              ref={inputRef}
              style={styles.input}
              placeholder="Type your message"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              disabled={isLoading}
            />
            <button
              style={{ ...styles.sendButton, opacity: isLoading ? 0.6 : 1 }}
              onClick={send}
              disabled={isLoading}
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { position: 'fixed', bottom: '72px', right: '20px', zIndex: 999 },
  toggle: {
    background: '#000', color: '#fff', borderRadius: '50%',
    padding: '10px 14px', fontSize: '20px', cursor: 'pointer',
    position: 'absolute', bottom: '-36px', right: '8px',
    boxShadow: '0 0 6px rgba(0,0,0,0.4)'
  },
  chatbox: {
    height: '560px', width: '420px', backgroundColor: 'transparent', color: 'black',
    borderRadius: '20px', padding: '16px', display: 'flex', flexDirection: 'column',
    boxShadow: '0 0 12px rgba(0,0,0,0.2)'
  },
  header: { textAlign: 'center' },
  campaignTitle: { fontSize: '18px', fontWeight: 600, marginBottom: '8px' },
  subtitle: { fontSize: '14px', color: '#555', marginBottom: '8px' },

  breadcrumb: {
    display: 'flex', justifyContent: 'center', flexWrap: 'wrap',
    gap: 6, marginBottom: 8, alignItems: 'center'
  },
  breadcrumbBtn: {
    padding: '4px 8px', border: '1px solid #ddd', borderRadius: 12,
    background: 'white', cursor: 'pointer', fontSize: 12
  },
  backBtn: {
    marginLeft: 8, padding: '4px 8px', border: 'none',
    background: '#f2f2f2', borderRadius: 10, cursor: 'pointer', fontSize: 12
  },

  controlsRow: {
    display: 'flex', gap: 8, justifyContent: 'center',
    alignItems: 'center', marginBottom: 8
  },
  filterInput: {
    flex: 1, minWidth: 160, padding: '6px 8px',
    border: '1px solid #ddd', borderRadius: 10
  },

  options: {
    display: 'flex', flexWrap: 'wrap', gap: '6px',
    justifyContent: 'center', marginBottom: '12px'
  },
  optionButton: {
    position: 'relative', padding: '6px 24px 6px 10px',
    border: '1px solid #ccc', borderRadius: '12px',
    background: 'white', cursor: 'pointer',
    fontSize: '12px', transition: 'all 0.15s ease'
  },
  optionHasKids: {
    borderColor: '#bbb',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.03) inset'
  },
  optionActive: {
    background: '#000', color: '#fff', borderColor: '#000'
  },
  chev: {
    position: 'absolute', right: 8, top: '50%',
    transform: 'translateY(-50%)', opacity: 0.6
  },
  badge: {
    position: 'absolute', top: -6, right: -6,
    background: '#000', color: '#fff', borderRadius: 12,
    fontSize: 10, padding: '2px 6px'
  },

  messages: { flexGrow: 1, overflowY: 'auto', marginBottom: '8px', paddingRight: 4 },
  userMessage: { textAlign: 'right', fontWeight: 'bold', margin: '4px 0' },
  botMessage: { textAlign: 'left', margin: '4px 0' },
  loading: { fontStyle: 'italic', color: '#666', display: 'flex', alignItems: 'center', gap: '8px' },
  inputWrapper: { display: 'flex', gap: '8px' },
  input: { flexGrow: 1, padding: '8px', borderRadius: '8px', border: '1px solid #ccc' },
  sendButton: {
    padding: '8px 12px', borderRadius: '8px', border: 'none',
    background: 'black', color: 'white', cursor: 'pointer', transition: 'opacity 0.2s ease'
  }
};
