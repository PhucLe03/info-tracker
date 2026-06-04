'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Search, GripVertical } from 'lucide-react';
import NewsCard, { NewsItem } from '@/components/NewsCard';
import styles from './page.module.css';

export default function Dashboard() {
  const [data, setData] = useState<{ date: string | null; news: Record<string, NewsItem[]> } | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [keywordOrder, setKeywordOrder] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  const loadNews = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await fetch('/api/news');
      const result = await res.json();
      setData(result);
      if (result?.news && isInitial) {
        setSelectedKeywords(Object.keys(result.news));
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    loadNews(true);
  }, []);

  // Sync keywordOrder whenever data changes
  useEffect(() => {
    if (data?.news) {
      const keys = Object.keys(data.news);
      setKeywordOrder(prev => {
        if (prev.length > 0) {
          // Keep existing order but filter out deleted keys and append new keys
          const filteredPrev = prev.filter(k => keys.includes(k));
          const newKeys = keys.filter(k => !prev.includes(k));
          return [...filteredPrev, ...newKeys];
        }
        return keys;
      });
    }
  }, [data]);

  const handleFetchNews = async () => {
    try {
      setFetching(true);
      await fetch('/api/fetch-news', { method: 'POST' });
      const currentSelection = [...selectedKeywords];
      await loadNews(false);
      
      // Preserve selection if it's not empty, otherwise default to all new keys
      if (currentSelection.length > 0) {
        setSelectedKeywords(currentSelection);
      } else {
        const res = await fetch('/api/news');
        const result = await res.json();
        if (result?.news) {
          setSelectedKeywords(Object.keys(result.news));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords(prev => 
      prev.includes(keyword) 
        ? prev.filter(k => k !== keyword) 
        : [...prev, keyword]
    );
  };

  const handleSelectAll = () => {
    if (data?.news) {
      setSelectedKeywords(Object.keys(data.news));
    }
  };

  const handleSelectNone = () => {
    setSelectedKeywords([]);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newOrder = [...keywordOrder];
    const draggedItem = newOrder[draggedIndex];
    
    // Swap in state for real-time visual swap while dragging
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setKeywordOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className={`container animate-fade-in ${styles.dashboard}`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Your Daily Intel</h1>
          <p className={styles.subtitle}>
            {data?.date ? `Latest update: ${data.date}` : 'No news fetched yet'}
          </p>
        </div>
        <button 
          className={`btn ${fetching ? styles.spin : ''}`} 
          onClick={handleFetchNews}
          disabled={fetching}
        >
          <RefreshCw size={18} />
          {fetching ? 'Fetching...' : 'Fetch Now'}
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading your intel...</div>
      ) : !data || Object.keys(data.news).length === 0 ? (
        <div className={styles.emptyState}>
          <Search size={48} className={styles.emptyIcon} />
          <h2>No data found</h2>
          <p>Add keywords in settings and click Fetch Now.</p>
        </div>
      ) : (
        <div className={styles.layout}>
          {/* Filter Sidebar */}
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <h3 className={styles.sidebarTitle}>Filter Topics</h3>
            </div>
            <div className={styles.quickActions}>
              <button className={styles.actionBtn} onClick={handleSelectAll}>Select All</button>
              <button className={styles.actionBtn} onClick={handleSelectNone}>Clear All</button>
            </div>
            <div className={styles.filterList}>
              {keywordOrder.map((keyword, index) => (
                <div 
                  key={keyword} 
                  className={`${styles.filterItem} ${selectedKeywords.includes(keyword) ? styles.active : ''} ${draggedIndex === index ? styles.dragging : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <div className={styles.dragHandle}>
                    <GripVertical size={16} />
                  </div>
                  <div 
                    className={styles.itemClickArea}
                    onClick={() => toggleKeyword(keyword)}
                  >
                    <div className={styles.checkbox}>
                      {selectedKeywords.includes(keyword) && <div className={styles.checkedDot} />}
                    </div>
                    <span className={styles.filterText}>{keyword}</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Main Content */}
          <main className={styles.mainContent}>
            {selectedKeywords.length === 0 ? (
              <div className={styles.emptyFilterState}>
                <Search size={32} className={styles.emptyFilterIcon} />
                <p>No topics selected. Select at least one topic from the sidebar to view news.</p>
              </div>
            ) : (
              <div className={styles.keywordSections}>
                {keywordOrder
                  .filter((keyword) => selectedKeywords.includes(keyword))
                  .map((keyword) => {
                    const items = data.news[keyword] || [];
                    return (
                      <section key={keyword} className={styles.section}>
                        <h2 className={styles.sectionTitle}>
                          <span className={styles.hash}>#</span> {keyword}
                        </h2>
                        {items.length === 0 ? (
                          <p className={styles.noItems}>No recent news for this keyword.</p>
                        ) : (
                          <div className={styles.grid}>
                            {items.map((item, idx) => (
                              <NewsCard key={idx} item={item} />
                            ))}
                          </div>
                        )}
                      </section>
                    );
                  })}
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
