import React from 'react';

const wrapperStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: 'black',
  color: 'white',
  padding: '40px 24px',
};

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  return <main style={wrapperStyle}>{children}</main>;
}
