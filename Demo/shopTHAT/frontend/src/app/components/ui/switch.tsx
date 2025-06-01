'use client';

import * as React from 'react';

interface Props {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = ({ checked, onCheckedChange }: Props) => {
  return (
    <div
      onClick={() => onCheckedChange?.(!checked)}
      style={{
        width: '36px',
        height: '20px',
        borderRadius: '999px',
        background: checked ? '#111827' : '#d1d5db',
        display: 'flex',
        alignItems: 'center',
        padding: '2px',
        cursor: 'pointer',
        transition: 'background 0.3s ease',
      }}
    >
      <div
        style={{
          height: '16px',
          width: '16px',
          borderRadius: '999px',
          background: 'white',
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
          transition: 'transform 0.3s ease',
        }}
      />
    </div>
  );
};
