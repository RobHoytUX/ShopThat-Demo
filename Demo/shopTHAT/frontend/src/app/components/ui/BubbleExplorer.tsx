// Suggested updates for your issues:

'use client';

import React, { useState } from 'react';

interface Bubble {
  id: number;
  label: string;
  color: string;
  children?: Bubble[];
}

const bubbles: Bubble[] = [
  {
    id: 1,
    label: 'Kohli',
    color: '#f87171',
    children: [
      {
        id: 11,
        label: 'RCB',
        color: '#fca5a5',
        children: [
          { id: 111, label: 'Chinnaswamy', color: '#fecaca' },
          { id: 112, label: 'Maxwell', color: '#fecaca' },
          { id: 113, label: 'Du Plessis', color: '#fecaca' }
        ]
      },
      {
        id: 12,
        label: 'Test',
        color: '#fca5a5',
        children: [
          { id: 121, label: 'Century', color: '#fecaca' },
          { id: 122, label: 'Australia', color: '#fecaca' },
          { id: 123, label: 'WTC', color: '#fecaca' }
        ]
      },
      {
        id: 13,
        label: 'Anushka',
        color: '#fca5a5',
        children: [
          { id: 131, label: 'Movies', color: '#fecaca' },
          { id: 132, label: 'Production', color: '#fecaca' },
          { id: 133, label: 'Vamika', color: '#fecaca' }
        ]
      }
    ]
  },
  {
    id: 2,
    label: 'Rohit',
    color: '#60a5fa',
    children: [
      {
        id: 21,
        label: 'Mumbai',
        color: '#93c5fd',
        children: [
          { id: 211, label: 'Wankhede', color: '#bfdbfe' },
          { id: 212, label: 'Suryakumar', color: '#bfdbfe' },
          { id: 213, label: 'Bumrah', color: '#bfdbfe' }
        ]
      },
      {
        id: 22,
        label: 'Vadapav',
        color: '#93c5fd',
        children: [
          { id: 221, label: 'Street Food', color: '#bfdbfe' },
          { id: 222, label: 'Favorite', color: '#bfdbfe' },
          { id: 223, label: 'Mumbai Local', color: '#bfdbfe' }
        ]
      },
      {
        id: 23,
        label: 'Hardik',
        color: '#93c5fd',
        children: [
          { id: 231, label: 'GT', color: '#bfdbfe' },
          { id: 232, label: 'Captaincy', color: '#bfdbfe' },
          { id: 233, label: 'Style', color: '#bfdbfe' }
        ]
      }
    ]
  },
  {
    id: 3,
    label: 'Gill',
    color: '#34d399',
    children: [
      {
        id: 31,
        label: 'GT',
        color: '#6ee7b7',
        children: [
          { id: 311, label: 'Runs', color: '#bbf7d0' },
          { id: 312, label: 'Opening', color: '#bbf7d0' },
          { id: 313, label: 'Form', color: '#bbf7d0' }
        ]
      },
      {
        id: 32,
        label: 'ODI',
        color: '#6ee7b7',
        children: [
          { id: 321, label: 'Double Ton', color: '#bbf7d0' },
          { id: 322, label: 'Consistency', color: '#bbf7d0' },
          { id: 323, label: 'Future Star', color: '#bbf7d0' }
        ]
      },
      {
        id: 33,
        label: 'Style',
        color: '#6ee7b7',
        children: [
          { id: 331, label: 'Fashion', color: '#bbf7d0' },
          { id: 332, label: 'Endorsements', color: '#bbf7d0' },
          { id: 333, label: 'Elegance', color: '#bbf7d0' }
        ]
      }
    ]
  },
  {
    id: 4,
    label: 'Shreyas',
    color: '#fbbf24',
    children: [
      {
        id: 41,
        label: 'KKR',
        color: '#fde68a',
        children: [
          { id: 411, label: 'Captain', color: '#fef3c7' },
          { id: 412, label: 'Middle Order', color: '#fef3c7' },
          { id: 413, label: 'Comeback', color: '#fef3c7' }
        ]
      },
      {
        id: 42,
        label: 'Injury',
        color: '#fde68a',
        children: [
          { id: 421, label: 'Back', color: '#fef3c7' },
          { id: 422, label: 'Recovery', color: '#fef3c7' },
          { id: 423, label: 'Fitness', color: '#fef3c7' }
        ]
      },
      {
        id: 43,
        label: 'Calm',
        color: '#fde68a',
        children: [
          { id: 431, label: 'Composed', color: '#fef3c7' },
          { id: 432, label: 'Reliable', color: '#fef3c7' },
          { id: 433, label: 'Focus', color: '#fef3c7' }
        ]
      }
    ]
  }
];

export default function BubbleExplorer() {
  const [activeParent, setActiveParent] = useState<number | null>(null);
  const [activeChild, setActiveChild] = useState<number | null>(null);

  const radius = 120;
  const subRadius = 80;

  return (
    <div style={{ position: 'relative', minHeight: 400, padding: 40 }}>
      {bubbles.map((parent, i) => {
        const parentLeft = 100 + i * 280;
        const parentTop = 100;

        const numChildren = parent.children ? parent.children.length : 1;

        return (
          <div key={parent.id}>
            {/* Parent Bubble */}
            <div
              onClick={() => {
                setActiveParent(parent.id === activeParent ? null : parent.id);
                setActiveChild(null);
              }}
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                backgroundColor: parent.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 600,
                position: 'absolute',
                left: parentLeft,
                top: parentTop,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              {parent.label}
            </div>



            {/* Child Bubbles */}
            {activeParent === parent.id && parent.children?.map((child, j) => {
              const angle = (j / numChildren) * 2 * Math.PI;
              const childLeft = parentLeft + radius * Math.cos(angle);
              const childTop = parentTop + radius * Math.sin(angle);

              const numGrandChildren = child.children ? child.children.length : 1;

              return (
                <div key={child.id}>
                  <div
                    onClick={() => setActiveChild(child.id === activeChild ? null : child.id)}
                    style={{
                      position: 'absolute',
                      left: childLeft,
                      top: childTop,
                      width: 60,
                      height: 60,
                      backgroundColor: child.color,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#000',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                    }}
                  >
                    {child.label}
                  </div>

                  {/* Grandchild Bubbles */}
                  {activeChild === child.id && child.children?.map((grand, k) => {
                    const subAngle = (k / numGrandChildren) * 2 * Math.PI;
                    const grandLeft = childLeft + subRadius * Math.cos(subAngle);
                    const grandTop = childTop + subRadius * Math.sin(subAngle);

                    return (
                      <div
                        key={grand.id}
                        style={{
                          position: 'absolute',
                          left: grandLeft,
                          top: grandTop,
                          width: 40,
                          height: 40,
                          backgroundColor: grand.color,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          color: '#000',
                          fontWeight: 500,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                        }}
                      >
                        {grand.label}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
