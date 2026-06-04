'use client';

import KeywordManager from '@/components/KeywordManager';

export default function Settings() {
  return (
    <div className="container animate-fade-in" style={{ padding: '3rem 1.5rem' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '2rem' }}>Settings</h1>
      
      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Manage Keywords</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Add or remove keywords. The app will fetch news based on these topics.
        </p>
        
        <KeywordManager />
      </div>
    </div>
  );
}
