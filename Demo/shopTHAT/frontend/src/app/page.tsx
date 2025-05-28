// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import MainWrapper from '@/components/MainWrapper';
import CampaignCard from '@/components/CampaignCard';

// Helper: "core_value_campaign" → "Core Value Campaign"
function slugToTitle(slug: string) {
  return slug
    .split(/[_-]/g)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function HomePage() {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/campaigns')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: string[]) => {
        setSlugs(data);
        setError(null);
      })
      .catch(err => {
        console.error(err);
        setError('Could not load campaigns.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <MainWrapper>
      <h2 style={{ fontSize: '18px' }}>Campaigns</h2>

      {loading && <p>Loading campaigns…</p>}
      {error   && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '24px',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: '32px',
          }}
        >
          {slugs.map(slug => (
            <CampaignCard
              key={slug}
              slug={slug}
              title={slugToTitle(slug)}
            />
          ))}
        </div>
      )}

      {!loading && !error && slugs.length === 0 && (
        <p>No campaigns available.</p>
      )}
    </MainWrapper>
  );
}
