import React from 'react';
import styles from './LoadingLogo.module.css';

const LoadingLogo = ({ size = '100px' }) => {
  return (
    <div className={styles['loading-container']}>
      <img 
        src="/Linq App Icon.png" // Updated to use the correct logo path
        alt="Loading AthLinQ" 
        className={styles['loading-logo-spinner']}
        style={{ width: size, height: size }}
      />
    </div>
  );
};

export default LoadingLogo;