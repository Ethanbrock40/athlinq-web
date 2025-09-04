import React from 'react';
import { useRouter } from 'next/router';
import styles from './LandingPage.module.css';

const LandingPage = () => {
  const router = useRouter();

  return (
    <div className={styles['landing-container']}>
      <div className={styles['landing-card']}>
        <img
          src="/AthLinq no BG.png"
          alt="AthLinQ Logo"
          className={styles['logo']}
        />
        <h1 className={styles['heading']}>Your NIL Connection Hub</h1>
        <p className={styles['subheading']}>
          AthLinQ is the premier platform designed to streamline NIL partnerships, connecting college athletes and businesses to forge deals that build lasting legacies beyond the classroom.
        </p>
        <div className={styles['button-group']}>
          <button 
            className={styles['primary-button']}
            onClick={() => router.push('/login')}
          >
            Log In
          </button>
          <button 
            className={styles['secondary-button']}
            onClick={() => router.push('/signup')}
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;