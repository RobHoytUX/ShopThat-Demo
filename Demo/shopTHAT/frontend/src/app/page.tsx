'use client';
import MainWrapper from '@/components/MainWrapper';
import CampaignCard from '@/components/CampaignCard';

const containerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '24px',
  flexWrap: 'wrap',
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: '48px',
};

export default function HomePage() {
  return (
    <MainWrapper>
      <h2 style={{ fontSize: '18px' }}>Campaigns</h2>
      <div style={containerStyle}>
        <CampaignCard title="Roger Feder" slug="roger-feder" />
        <CampaignCard title="LV x Murakami" slug="lv-murakami" />
        <CampaignCard title="LV x Kusama" slug="lv-kusama" />
      </div>
    </MainWrapper>
  );
}
