'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import MainWrapper from '@/components/MainWrapper';


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
      <h1>Campaign: {title}</h1>
      <p>This is the detail page for the campaign.</p>
    </MainWrapper>
  );
}
