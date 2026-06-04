import { useState, useEffect } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import styles from './KeywordManager.module.css';

const isStaticMode = typeof window !== 'undefined' && (
  window.location.hostname.endsWith('github.io') || 
  process.env.NEXT_PUBLIC_STATIC_MODE === 'true'
);

export default function KeywordManager() {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const res = await fetch(`${basePath}/data/keywords.json`);
      if (res.ok) {
        const data = await res.json();
        setKeywords(data);
      } else {
        // Fallback to API if static file not available (e.g. initial setup)
        const apiRes = await fetch(`${basePath}/api/keywords`);
        if (apiRes.ok) {
          const data = await apiRes.json();
          setKeywords(data);
        }
      }
    } catch (err) {
      console.error('Error fetching keywords:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStaticMode || !newKeyword.trim()) return;

    try {
      setAdding(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const res = await fetch(`${basePath}/api/keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: newKeyword }),
      });
      const data = await res.json();
      setKeywords(data);
      setNewKeyword('');
    } catch (err) {
      console.error('Error adding keyword:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (keyword: string) => {
    if (isStaticMode) return;
    try {
      setDeleting(keyword);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const res = await fetch(`${basePath}/api/keywords?keyword=${encodeURIComponent(keyword)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      setKeywords(data);
    } catch (err) {
      console.error('Error deleting keyword:', err);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading keywords...</div>;
  }

  return (
    <div className={styles.container}>
      {isStaticMode && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#f87171',
          padding: '1rem',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          lineHeight: '1.4',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem'
        }}>
          <strong>Demo Mode (Read-Only)</strong>
          <span>Keyword editing is disabled on the live site. To add or remove tracked topics, modify <code>public/data/keywords.json</code> in the repository and commit the changes.</span>
        </div>
      )}

      <form onSubmit={handleAdd} className={styles.addForm}>
        <input
          type="text"
          className="input"
          placeholder={isStaticMode ? "Keyword editing is disabled" : "Add a new keyword (e.g. Artificial Intelligence)"}
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          disabled={adding || isStaticMode}
        />
        <button type="submit" className="btn" disabled={adding || isStaticMode || !newKeyword.trim()}>
          {adding ? <Loader2 size={18} className={styles.spin} /> : <Plus size={18} />}
          Add
        </button>
      </form>

      <div className={styles.list}>
        {keywords.length === 0 ? (
          <p className={styles.empty}>No keywords added yet.</p>
        ) : (
          keywords.map((kw) => (
            <div key={kw} className={styles.item}>
              <span className={styles.keywordText}>{kw}</span>
              <button
                className="btn-ghost"
                style={{ padding: '0.4rem', border: 'none', color: 'var(--text-secondary)' }}
                onClick={() => handleDelete(kw)}
                disabled={deleting === kw || isStaticMode}
              >
                {deleting === kw ? <Loader2 size={16} className={styles.spin} /> : <X size={16} />}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
