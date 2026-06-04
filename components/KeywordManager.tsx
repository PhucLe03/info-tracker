import { useState, useEffect } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import styles from './KeywordManager.module.css';

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
      const res = await fetch('/api/keywords');
      const data = await res.json();
      setKeywords(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    try {
      setAdding(true);
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: newKeyword }),
      });
      const data = await res.json();
      setKeywords(data);
      setNewKeyword('');
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (keyword: string) => {
    try {
      setDeleting(keyword);
      const res = await fetch(`/api/keywords?keyword=${encodeURIComponent(keyword)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      setKeywords(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading keywords...</div>;
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleAdd} className={styles.addForm}>
        <input
          type="text"
          className="input"
          placeholder="Add a new keyword (e.g. Artificial Intelligence)"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          disabled={adding}
        />
        <button type="submit" className="btn" disabled={adding || !newKeyword.trim()}>
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
                disabled={deleting === kw}
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
