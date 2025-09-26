'use client';

import React, { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import BubbleExplorer from '@/components/ui/BubbleExplorer';

interface ToggleItem { name: string; enabled: boolean }
interface DocItem { title: string; enabled: boolean }
interface ExternalDocItem { title: string; enabled: boolean }
interface PubItem { name: string; percent: string }
interface KeywordItem { keyword: string; percent: string }
interface ArticleItem { title: string; views: string }

interface DashboardData {
  toggles: { left: ToggleItem[]; right: ToggleItem[] };
  documents: {
    internal: DocItem[];
    external: ExternalDocItem[];
  };
  topPublications: PubItem[];
  topKeywords: KeywordItem[];
  topArticles: ArticleItem[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [showInternal, setShowInternal] = useState(true);
  const [showExternal, setShowExternal] = useState(true);
  const [leftToggles, setLeftToggles] = useState<ToggleItem[]>([]);
  const [rightToggles, setRightToggles] = useState<ToggleItem[]>([]);
  const [internalPage, setInternalPage] = useState(1);
  const [externalPage, setExternalPage] = useState(1);
  const [activeTab, setActiveTab] = useState('Internals');
  const itemsPerPage = 5;

  useEffect(() => {
    fetch('/admin-dashboard-mock.json')
      .then(res => res.json())
      .then((json: DashboardData) => {
        setData(json);
        setLeftToggles(json.toggles?.left || []);
        setRightToggles(json.toggles?.right || []);
      })
      .catch(err => {
        console.error('Failed to load admin data:', err);
      });
  }, []);

  const toggleHandler = (index: number, side: 'left' | 'right') => {
    const updated = [...(side === 'left' ? leftToggles : rightToggles)];
    updated[index].enabled = !updated[index].enabled;
    side === 'left' ? setLeftToggles(updated) : setRightToggles(updated);
  };

  if (!data) return <div style={{ padding: '24px', textAlign: 'center' }}>Loading admin dashboard...</div>;

  if (activeTab === 'Internals') {
    return (
      <div style={{ padding: '24px', background: 'linear-gradient(to bottom right, #e2e8f0, #fefce8)', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['Home', 'Internals', 'Publishers', 'Open Source', 'Ecommerce'].map((tab: string) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: tab === activeTab ? '#d1d5db' : '#f1f5f9',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  cursor: 'pointer'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'white', padding: '20px', borderRadius: '12px', maxWidth: '500px' }}>
          <h3 style={{ fontWeight: 'bold' }}>Upload Internals</h3>
          <input type="file" accept="application/pdf" />
          <input type="text" placeholder="Enter link to document" style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #ccc' }} />
        </div>
      </div>
    );
  }

  const pagedInternalDocs = data.documents.internal.slice((internalPage - 1) * itemsPerPage, internalPage * itemsPerPage);
  const pagedExternalDocs = data.documents.external.slice((externalPage - 1) * itemsPerPage, externalPage * itemsPerPage);

  return (
    <div style={{ padding: '24px', background: 'linear-gradient(to bottom right, #e2e8f0, #fefce8)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['Home', 'Internals', 'Publishers', 'Open Source', 'Ecommerce'].map((tab: string) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: tab === activeTab ? '#d1d5db' : '#f1f5f9',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #ccc',
                cursor: 'pointer'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href="#" style={{ background: '#3b82f6', color: '#fff', padding: '6px 12px', borderRadius: '8px', textDecoration: 'none' }}>↗ Add URL Link</a>
          <a href="#" style={{ background: '#22c55e', color: '#fff', padding: '6px 12px', borderRadius: '8px', textDecoration: 'none' }}>↗ Upload Media</a>
        </div>
      </div>

    <div style={{ display: 'flex', gap: '20px' }}>
        {/* Filter Card */}
        <div style={{ width: '220px', background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>Document Filter</h3>
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <input type="checkbox" checked={showInternal} onChange={() => setShowInternal(!showInternal)} />
            <span style={{ marginLeft: '8px' }}>Internal</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input type="checkbox" checked={showExternal} onChange={() => setShowExternal(!showExternal)} />
            <span style={{ marginLeft: '8px' }}>External</span>
          </label>
        </div>

        {/* Center Column with Bubbles */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <BubbleExplorer />

          {/* Documents */}
          <div style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontWeight: 'bold', marginBottom: '12px' }}>Matching Articles</h3>

            {showInternal && (
              <>
                <h4 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Internal</h4>
                {pagedInternalDocs.map((doc: DocItem, idx: number) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Switch checked={doc.enabled} />
                    <span>{doc.title}</span>
                  </div>
                ))}
                <div>
                  {Array.from({ length: Math.ceil(data.documents.internal.length / itemsPerPage) }, (_, i: number) => (
                    <button key={i} onClick={() => setInternalPage(i + 1)} style={{ marginRight: '6px' }}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              </>
            )}

            {showExternal && (
              <>
                <h4 style={{ fontWeight: 'bold', marginTop: '16px', marginBottom: '8px' }}>External</h4>
                {pagedExternalDocs.map((doc: DocItem, idx: number) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Switch checked={doc.enabled} />
                    <span>{doc.title}</span>
                  </div>
                ))}
                <div>
                  {Array.from({ length: Math.ceil(data.documents.external.length / itemsPerPage) }, (_, i: number) => (
                    <button key={i} onClick={() => setExternalPage(i + 1)} style={{ marginRight: '6px' }}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {[{ title: 'Top Publications', items: data.topPublications, key: 'name', value: 'percent' },
            { title: 'Top Grossing Keywords', items: data.topKeywords, key: 'keyword', value: 'percent' },
            { title: 'Top Articles Used', items: data.topArticles, key: 'title', value: 'views' }]
            .map((section, idx: number) => (
              <div key={idx} style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <h4 style={{ fontWeight: 'bold', marginBottom: '8px' }}>{section.title}</h4>
                {section.items.map((item: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95em', marginBottom: '4px' }}>
                    <span>{item[section.key]}</span>
                    <span>{item[section.value]}</span>
                  </div>
                ))}
              </div>
          ))}
        </div>
      </div>
    </div>
  );
}
