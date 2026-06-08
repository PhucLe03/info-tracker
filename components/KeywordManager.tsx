import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import styles from './KeywordManager.module.css';

export default function KeywordManager() {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKeywords = async () => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const isStaticMode = typeof window !== 'undefined' && (
        window.location.hostname.endsWith('github.io') || 
        process.env.NEXT_PUBLIC_STATIC_MODE === 'true'
      );
      const url = isStaticMode 
        ? `${basePath}/data/keywords.json` 
        : `${basePath}/api/keywords`;
      const apiRes = await fetch(url);
      if (apiRes.ok) {
        const data = await apiRes.json();
        setKeywords(data);
      }
    } catch (err) {
      console.error('Error fetching keywords:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchKeywords();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading keywords...</div>;
  }

  return (
    <div className={styles.container}>
      <div style={{
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        color: '#93c5fd',
        padding: '1rem',
        borderRadius: '12px',
        marginBottom: '1.5rem',
        fontSize: '0.9rem',
        lineHeight: '1.4',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem'
      }}>
        <strong>Read-Only Mode</strong>
        <span>To add, remove, or reorder tracked topics, please modify <code>public/data/keywords.json</code> in the repository and commit your changes. The backend database will sync automatically.</span>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className={styles.addForm}>
        <input
          type="text"
          className="input"
          placeholder="Keyword editing is managed via keywords.json"
          value=""
          disabled
        />
        <button type="submit" className="btn" disabled>
          <Plus size={18} />
          Add
        </button>
      </form>

      <div className={styles.list}>
        {keywords.length === 0 ? (
          <p className={styles.empty}>No keywords configured yet.</p>
        ) : (
          keywords.map((kw) => (
            <div key={kw} className={styles.item}>
              <span className={styles.keywordText}>{kw}</span>
              <button
                className="btn-ghost"
                style={{ padding: '0.4rem', border: 'none', color: 'var(--text-secondary)' }}
                disabled
              >
                <X size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
