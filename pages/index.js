// pages/index.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth'; // Import for auth check
import { auth } from '../lib/firebaseConfig'; // Import auth instance

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already authenticated
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If logged in, redirect to dashboard
        router.push('/dashboard');
      } else {
        // If not logged in, redirect to login page
        router.push('/login');
      }
    });

    return () => unsubscribe(); // Clean up the listener
  }, [router]);

  // Optionally, show a loading message while redirecting
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#000', color: '#fff' }}>
      <p>Redirecting to AthLinq...</p>
    </div>
  );
}