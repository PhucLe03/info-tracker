import styles from './NewsCard.module.css';

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  snippet: string;
  thumbnail: string | null;
  source: string;
}

export default function NewsCard({ item }: { item: NewsItem }) {
  const date = new Date(item.pubDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer" className={styles.card}>
      <div className={styles.content}>
        <div className={styles.meta}>
          <span className={styles.source}>{item.source || 'News'}</span>
          <span className={styles.date}>{date}</span>
        </div>
        <h3 className={styles.title}>{item.title}</h3>
        <p className={styles.snippet} dangerouslySetInnerHTML={{ __html: item.snippet }}></p>
      </div>
    </a>
  );
}
