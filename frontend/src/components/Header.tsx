import React from 'react';
import styles from './Header.module.css';

const Header: React.FC = () => {
  return (
    <header className={styles.header}>
      <div className={styles.logoContainer}>
        <img 
          src="/CyanVote.png" 
          alt="CyanVote Logo" 
          className={styles.logo}
        />
      </div>
    </header>
  );
};

export default Header; 