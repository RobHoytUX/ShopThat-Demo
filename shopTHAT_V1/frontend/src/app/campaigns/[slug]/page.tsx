'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import MainWrapper from '@/components/MainWrapper';
import Chatbot from '@/components/Chatbot';

// Map campaign slug to background image
const backgroundMap: Record<string, string> = {
  'ai_research': '/background/home_bg.jpg',
  'climate_change': '/background/bg2.avif',
  'core_values_campaign': '/background/bg.avif',
  'kusama_campaign': '/background/bggirl.jpg',
  'murakami_campaign': '/background/bg_murakami.avif',
};

export default function CampaignPage() {
  const { slug } = useParams() as { slug: string };
  const [title, setTitle] = useState('');

  const normalizedSlug = slug.replace(/[-\s]/g, '_').toLowerCase();
  const backgroundImage = backgroundMap[normalizedSlug];

  useEffect(() => {
    if (!slug) return;

    const readableTitle = normalizedSlug
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    setTitle(readableTitle);
  }, [slug, normalizedSlug]);

  return (
    <MainWrapper backgroundImage={backgroundImage}>
      <div style={styles.contentWrapper}>
        <h1 style={styles.heading}>Campaign: {title}</h1>
        <p style={styles.subtitle}>
          This is the detail page for the campaign. Explore exclusive insights, stories, and key themes surrounding <strong>{title}</strong>.
        </p>
        <div style={styles.scrollPrompt}>↓ Scroll down</div>
      </div>
      <Chatbot />
    </MainWrapper>
  );
}

// Inline styles
const styles: Record<string, React.CSSProperties> = {
  contentWrapper: {
    backdropFilter: 'blur(8px)',
    backgroundColor: 'rgba(255,255,255,0.2)',
    border: '1px solid rgba(255,255,255,0.3)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    padding: '2rem',
    borderRadius: '20px',
    color: '#fff',
    animation: 'fadeInUp 1s ease',
    maxWidth: '800px',
    margin: '100px auto 0 auto',
    textAlign: 'center',
    position: 'relative',
  },
  heading: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '12px',
  },
  subtitle: {
    fontSize: '18px',
    color: '#fff',
    marginBottom: '20px',
  },
  scrollPrompt: {
    position: 'absolute',
    bottom: '-40px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '24px',
    color: '#fff',
    animation: 'pulseDown 2s infinite',
  },
};
