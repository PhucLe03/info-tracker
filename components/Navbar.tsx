import Link from 'next/link';
import { Newspaper, Settings } from 'lucide-react';
import styles from './Navbar.module.css';

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={`container ${styles.navContainer}`}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <Newspaper size={24} color="var(--bg-color)" />
          </div>
          <span className="text-gradient">InfoTracker</span>
        </Link>
        <div className={styles.links}>
          <Link href="/" className={styles.navLink}>
            Dashboard
          </Link>
          <Link href="/settings" className={styles.navLink}>
            <Settings size={18} />
            Settings
          </Link>
        </div>
      </div>
    </nav>
  );
}
