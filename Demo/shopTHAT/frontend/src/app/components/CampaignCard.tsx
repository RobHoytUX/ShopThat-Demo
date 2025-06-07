'use client';

import React from 'react';
import Link from 'next/link';

const backgroundMap: Record<string, string> = {
  'ai_research': '/background/home_bg.jpg',
  'climate_change': '/background/bg2.avif',
  'core_values_campaign': '/background/bg.avif',
  'kusama_campaign': '/background/bggirl.jpg',
  'murakami_campaign': '/background/bg_murakami.avif',
};

export interface CampaignCardProps {
  slug: string;
  title: string;
}

export default function CampaignCard({ slug, title }: CampaignCardProps) {
  const normalizedSlug = slug.replace(/[-\s]/g, '_').toLowerCase();
  const bgImage = backgroundMap[normalizedSlug] ?? '/background/default.jpg';

  return (
    <Link href={`/campaigns/${slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        className="campaign-card"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="campaign-overlay">
          <div className="campaign-title">{title}</div>
          <div className="campaign-cta">View ➜</div>
        </div>
      </div>
    </Link>
  );
}
