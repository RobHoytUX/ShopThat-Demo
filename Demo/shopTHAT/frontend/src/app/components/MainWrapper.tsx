'use client';

import React from 'react';

interface MainWrapperProps {
  children: React.ReactNode;
  backgroundImage?: string;
}

export default function MainWrapper({ children, backgroundImage }: MainWrapperProps) {
  const wrapperStyle: React.CSSProperties = {
    minHeight: '100vh',
    width: '100%',
    backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
    padding: '40px 24px',
    boxSizing: 'border-box',
    overflowY: 'auto',
  };

  const contentStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '32px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(8px)',
    borderRadius: '16px',
    color: 'white',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    animation: 'fadeIn 1.2s ease-in-out',
    minHeight: '100vh',
    boxSizing: 'border-box',
  };

  const fadeInStyle = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  return (
    <>
      <style>{fadeInStyle}</style>
      <main style={wrapperStyle}>
        <div style={contentStyle}>{children}</div>
      </main>
    </>
  );
}
