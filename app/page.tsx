'use client';

import { useEffect, useState, useRef } from 'react';
import { Search, GripVertical, Calendar as CalendarIcon } from 'lucide-react';
import NewsCard, { NewsItem } from '@/components/NewsCard';
import styles from './page.module.css';

const isStaticMode = typeof window !== 'undefined' && (
  window.location.hostname.endsWith('github.io') || 
  process.env.NEXT_PUBLIC_STATIC_MODE === 'true'
);

export default function Dashboard() {
  const [data, setData] = useState<{ date: string | null; news: Record<string, NewsItem[]> } | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [keywordOrder, setKeywordOrder] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  const calendarRef = useRef<HTMLDivElement>(null);

  const loadNews = async (isInitial = false, targetDate?: string) => {
    try {
      if (isInitial) setLoading(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

      let dates: string[] = [];
      let currentSelectedDate: string | null = null;
      let newsData: Record<string, NewsItem[]> = {};

      try {
        const summaryUrl = `${basePath}/data/news/summary.json`;
        const summaryRes = await fetch(summaryUrl);
        if (summaryRes.ok) {
          const summary = await summaryRes.json();
          dates = summary.availableDates || [];
          setAvailableDates(dates);
        }
      } catch (err) {
        console.warn('Could not load news summary:', err);
      }

      const dateToLoad = targetDate || dates[0];
      if (dateToLoad) {
        currentSelectedDate = dateToLoad;
        setSelectedDate(dateToLoad);
        
        try {
          const newsUrl = `${basePath}/data/news/${dateToLoad}.json`;
          const newsRes = await fetch(newsUrl);
          if (newsRes.ok) {
            newsData = await newsRes.json();
          }
        } catch (err) {
          console.warn(`Could not load news for date ${dateToLoad}:`, err);
        }
      }

      setData({ date: currentSelectedDate, news: newsData });

      // Load actual keyword order from public keywords.json or localStorage
      let kwList: string[] = [];
      const localOrder = localStorage.getItem('localKeywordOrder');
      if (localOrder) {
        try {
          kwList = JSON.parse(localOrder);
        } catch (e) {}
      }

      if (!kwList || kwList.length === 0) {
        try {
          const keywordsUrl = `${basePath}/data/keywords.json`;
          const kwRes = await fetch(keywordsUrl);
          if (kwRes.ok) {
            kwList = await kwRes.json();
          }
        } catch (err) {
          console.warn('Could not load keywords:', err);
        }
      }

      if (kwList && Array.isArray(kwList)) {
        const fetchedKeys = Object.keys(newsData);
        // Keep keywords from the saved order if they exist in the fetched news
        const orderedKeys = kwList.filter(k => fetchedKeys.includes(k));
        // Append any extra keys that might not be in the saved order yet
        const extraKeys = fetchedKeys.filter(k => !kwList.includes(k));
        setKeywordOrder([...orderedKeys, ...extraKeys]);
      } else {
        setKeywordOrder(Object.keys(newsData));
      }

      if (isInitial) {
        const fetchedKeys = Object.keys(newsData);
        // Load selected keywords from localStorage if exists
        const saved = localStorage.getItem('selectedKeywords');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              // Intersect to filter out keywords that are no longer fetched
              const validKeys = parsed.filter(k => fetchedKeys.includes(k));
              setSelectedKeywords(validKeys);
              setIsLoaded(true);
              return;
            }
          } catch (e) {
            console.error('Failed to parse selected keywords from localStorage', e);
          }
        }
        // Fallback to select all if nothing in localStorage
        setSelectedKeywords(fetchedKeys);
        setIsLoaded(true);
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

  // Sync calendar focus month to selectedDate when it changes
  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(new Date(selectedDate));
    }
  }, [selectedDate]);

  // Click outside to close calendar popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    }
    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

  // Save selected keywords to localStorage whenever they change
  useEffect(() => {
    // Only write to localStorage after initial selections have been loaded from localStorage to avoid wiping storage
    if (isLoaded) {
      localStorage.setItem('selectedKeywords', JSON.stringify(selectedKeywords));
    }
  }, [selectedKeywords, isLoaded]);

  const handleDateChange = (dateStr: string) => {
    setSelectedDate(dateStr);
    loadNews(false, dateStr);
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

  const handleDragEnd = async () => {
    setDraggedIndex(null);
    if (isStaticMode) {
      localStorage.setItem('localKeywordOrder', JSON.stringify(keywordOrder));
      return;
    }
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      // Save the new keyword order to local keywords.json via PUT API
      await fetch(`${basePath}/api/keywords`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ keywords: keywordOrder })
      });
    } catch (err) {
      console.error('Failed to save keyword order:', err);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const renderCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const cells = [];
    
    // Padding empty cells for days of the week before month starts
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className={styles.calendarDayEmpty} />);
    }
    
    // Render each day cell
    for (let day = 1; day <= totalDays; day++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      
      const hasData = availableDates.includes(dateStr);
      const isSelected = selectedDate === dateStr;
      
      cells.push(
        <button
          key={dateStr}
          className={`${styles.calendarDay} ${hasData ? styles.hasData : ''} ${isSelected ? styles.selected : ''}`}
          disabled={!hasData}
          onClick={() => {
            handleDateChange(dateStr);
            setShowCalendar(false);
          }}
          title={!hasData ? 'No intel available' : `View intel for ${dateStr}`}
        >
          {day}
        </button>
      );
    }
    
    return cells;
  };

  return (
    <div className={`container animate-fade-in ${styles.dashboard}`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Your Daily Intel</h1>
          <p className={styles.subtitle}>
            {selectedDate ? (
              <>
                Showing Intel for: {selectedDate}{' '}
                {selectedDate === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}` && (
                  <strong>(Today)</strong>
                )}
              </>
            ) : (
              'No news found'
            )}
          </p>
        </div>

        
        {/* Date Selector Popover (Calendar) */}
        {availableDates.length > 0 && (
          <div className={styles.dateSelectorContainer} ref={calendarRef}>
            <button 
              className={styles.calendarTriggerBtn}
              onClick={() => setShowCalendar(!showCalendar)}
            >
              <CalendarIcon size={16} />
              <span>
                {selectedDate 
                  ? new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
                  : 'Select Date'}
              </span>
            </button>
            
            {showCalendar && (
              <div className={styles.calendarPopover}>
                <div className={styles.calendarHeader}>
                  <button className={styles.calNavBtn} onClick={handlePrevMonth}>&lt;</button>
                  <span className={styles.calendarMonthName}>
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <button className={styles.calNavBtn} onClick={handleNextMonth}>&gt;</button>
                </div>
                <div className={styles.calendarWeekdays}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className={styles.weekday}>{day}</div>
                  ))}
                </div>
                <div className={styles.calendarDaysGrid}>
                  {renderCalendarDays()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className={styles.loading}>Loading your intel...</div>
      ) : !data || Object.keys(data.news).length === 0 ? (
        <div className={styles.emptyState}>
          <Search size={48} className={styles.emptyIcon} />
          <h2>No data found</h2>
          <p>Please check schedule task configuration or add keywords in settings.</p>
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
                  <div 
                    className={styles.itemClickArea}
                    onClick={() => toggleKeyword(keyword)}
                  >
                    <div className={styles.checkbox}>
                      {selectedKeywords.includes(keyword) && <div className={styles.checkedDot} />}
                    </div>
                    <span className={styles.filterText}>{keyword}</span>
                  </div>
                  <div className={styles.dragHandle}>
                    <GripVertical size={16} />
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
