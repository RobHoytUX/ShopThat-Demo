'use client';

import { useEffect, useState } from 'react';
import { useParams }        from 'next/navigation';
import Chatbot              from '@/components/Chatbot';

export default function CampaignPage() {
  const { slug } = useParams() as { slug: string };
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!slug) return;
    setTitle(
      slug
        .split('_')
        .map(w => w[0].toUpperCase() + w.slice(1))
        .join(' ')

    );
  }, [slug]);

  return (
    <main style={{ padding: 24 }}>
      <h1>Campaign: {title}</h1>
      <p>This is the detail page for the campaign.</p>
      <Chatbot slug={slug} />
    </main>
  );
}
