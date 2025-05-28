'use client';
import React from 'react';
import Link from 'next/link';

export default function CampaignCard({ title, slug, onClick }: CampaignCardProps) {
  return (
    <div style={cardStyle} onClick={onClick}>
      <Link href={`/campaigns/${slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={titleStyle}>{title}</div>
        <div style={viewStyle}>View &gt;</div>
      </Link>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  color: '#1a1a1a',
  padding: '48px 24px',
  borderRadius: '16px',
  textAlign: 'center',
  width: '280px',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  transition: 'transform 0.2s ease',
};

const titleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  marginBottom: '12px',
};

const viewStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#666',
};

interface CampaignCardProps {
  title: string;
  slug: string;
  onClick?: () => void;
}
