import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebaseConfig';
import LoadingLogo from '../src/components/LoadingLogo';
import LandingPage from '../src/components/LandingPage'; // NEW: Import LandingPage

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        router.push('/dashboard');
      } else {
        setIsAuthenticated(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#000' }}>
        <LoadingLogo size="100px" />
      </div>
    );
  }

  // Only render the landing page if the user is not authenticated and loading is complete
  if (!isAuthenticated && !loading) {
    return <LandingPage />;
  }

  return null; // Don't render anything while redirecting or if user is authenticated
}