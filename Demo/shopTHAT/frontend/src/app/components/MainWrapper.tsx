// Import React so JSX syntax works
import React from 'react';

// Define inline styles for the wrapper
const wrapperStyle: React.CSSProperties = {
  minHeight: '100vh',         // full screen height
  backgroundColor: 'black',   // black background
  color: 'white',             // white text
  padding: '40px 24px',       // spacing inside the wrapper
};


// Functional component that wraps children with the above styles
export default function MainWrapper({ children }: { children: React.ReactNode }) {
  return <main style={wrapperStyle}>{children}</main>;
}

