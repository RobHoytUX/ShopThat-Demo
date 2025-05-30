'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import MainWrapper from '@/components/MainWrapper';
import Chatbot from '@/components/Chatbot';


const backgroundMap: Record<string, string> = {
  'ai_research': '/background/bg.avif',
  'climate_change': '/background/bg2.avif',
  'core_values_campaign': '/background/bggirl.jpg',
  'kusama_campaign': '/background/bggirl2.jpg',
  'murakami_campaign': '/background/bgboy.jpg',
};



export default function CampaignPage() {
  const { slug } = useParams() as { slug: string };
  const [title, setTitle] = useState('');

  // Normalize slug to match backgroundMap keys
  const normalizedSlug = slug.replace(/[-\s]/g, '_').toLowerCase();
  const backgroundImage = backgroundMap[normalizedSlug];

  // Create a human-readable title from the normalized slug
  useEffect(() => {
    if (!slug) return;

    const readableTitle = normalizedSlug
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    setTitle(readableTitle);
  }, [slug, normalizedSlug]);

  // Debugging (optional)
  console.log('slug:', slug);
  console.log('normalizedSlug:', normalizedSlug);
  console.log('backgroundImage:', backgroundImage);

  return (
    <MainWrapper backgroundImage={backgroundImage}>
      <h1>Campaign: {title}</h1>
      <p>This is the detail page for the campaign.</p>
      <Chatbot slug={slug} />
    </MainWrapper>
  );
}
