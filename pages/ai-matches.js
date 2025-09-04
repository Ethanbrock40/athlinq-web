import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseConfig';
import LoadingLogo from '../src/components/LoadingLogo'; // NEW: Import LoadingLogo

export default function AIMatchesPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { userId, userType } = router.query;

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);

      if (!userId || !userType || user.uid !== userId) {
        setError('Invalid request for AI matches.');
        setLoading(false);
        return;
      }

      const currentUserDocRef = doc(db, 'users', user.uid);
      const currentUserDocSnap = await getDoc(currentUserDocRef);
      if (currentUserDocSnap.exists()) {
          setCurrentUserData(currentUserDocSnap.data());
      } else {
          setError('User data not found for current user.');
          setLoading(false);
          return;
      }

      try {
        const response = await fetch('/api/ai-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid, userType: userType }),
        });
        const data = await response.json();

        if (response.ok) {
          setMatches(data.matches);
        } else {
          setError(data.message || 'Failed to get AI matches.');
        }
      } catch (fetchError) {
        console.error('Error fetching AI matches:', fetchError);
        setError('Error fetching AI matches.');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [router, userId, userType]);

  // NEW: Render the LoadingLogo component
  if (loading) {
    return <LoadingLogo size="100px" />;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#1e1e1e', color: '#e0e0e0', fontFamily: 'Inter, sans-serif' }}>
        <h1 style={{ color: '#dc3545', marginBottom: '20px' }}>Error Generating Matches</h1>
        <p>{error}</p>
        <button onClick={() => router.push('/dashboard')} style={{ marginTop: '20px', padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Back to Dashboard</button>
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#1e1e1e', color: '#e0e0e0', fontFamily: 'Inter, sans-serif' }}>
        <h1 style={{ color: '#007bff', marginBottom: '20px' }}>AI Matches</h1>
        <p>No matches found at this time. Try updating your profile details for better recommendations!</p>
        <button onClick={() => router.push('/dashboard')} style={{ marginTop: '20px', padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Back to Dashboard</button>
      </div>
    );
  }

  const isAthlete = currentUserData?.userType === 'athlete';

  return (
    <div style={{
        fontFamily: 'Inter, sans-serif',
        backgroundColor: '#0a0a0a',
        color: '#e0e0e0',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px'
    }}>
      <div style={{ maxWidth: '900px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h1 style={{ color: '#ff69b4', marginBottom: '10px', textAlign: 'center' }}>Your Top AI Matches ✨</h1>
        <p style={{ color: '#aaa', textAlign: 'center', marginBottom: '20px' }}>
            Based on your profile, here are some recommended {isAthlete ? 'businesses' : 'athletes'}:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {matches.map(match => (
            <div
              key={match.id}
              style={{
                backgroundColor: '#1e1e1e',
                padding: '25px',
                borderRadius: '12px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                border: '1px solid #ff69b455',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.3em', color: '#007bff' }}>{match.name}</h3>
              <p style={{ margin: 0, fontSize: '0.95em', color: '#bbb' }}>{match.reason}</p>
              <button
                onClick={() => router.push(isAthlete ? `/public-business-profile/${match.id}` : `/public-athlete-profile/${match.id}`)}
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  backgroundColor: '#ff69b4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e05cb4'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff69b4'}
              >
                View Profile
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          style={{
            marginTop: '30px',
            padding: '10px 15px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            alignSelf: 'center',
            width: 'fit-content'
          }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}