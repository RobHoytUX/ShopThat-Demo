'use client';

import { useParams } from 'next/navigation';
import Chatbot from '@/components/Chatbot';


export default function CampaignPage() {
  const params = useParams(); // gets slug from the URL

  return (
    <div style={{ padding: '40px' }}>
      <h1>Campaign: {params.slug}</h1>
      <p>This is the detail page for the campaign.</p>

      <Chatbot />

    </div>
  );
}