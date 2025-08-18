// pages/dashboard.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

import { auth, db } from '../lib/firebaseConfig';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [stripeConnectStatus, setStripeConnectStatus] = useState('not_connected');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserData(data);

          if (data.stripeAccountId) {
            setStripeConnectStatus('pending_onboarding');
          } else {
            setStripeConnectStatus('not_connected');
          }
        } else {
          console.log('No user data found for current user.');
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error.message);
    }
  };

  const handleConnectStripe = async () => {
    if (!user || !userData) return;

    try {
      const response = await fetch('/api/create-connect-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.uid, 
          userEmail: user.email 
        }),
      });
      const data = await response.json();

      if (response.ok && data.url) {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
            stripeAccountId: data.stripeAccountId,
        });
        setStripeConnectStatus('pending_onboarding');
        window.location.href = data.url;
      } else {
        alert(data.message || 'Failed to connect Stripe account. Please try again.');
        console.error('API Error connecting Stripe:', data.message);
      }
    } catch (error) {
      console.error('Client-side error connecting Stripe:', error);
      alert('Error connecting Stripe account. Please try again.');
    }
  };


  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  if (!user || !userData) {
    return null;
  }

  const displayName = userData.userType === 'athlete' 
    ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email
    : userData.userType === 'business'
      ? userData.companyName || userData.email
      : userData.email;
      
  const profileImageUrl = userData.userType === 'athlete' 
    ? userData.profileImageUrl 
    : userData.businessLogoUrl;


  return (
    <div style={{ 
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#121212',
        color: '#e0e0e0',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        padding: '20px'
    }}>
      <div style={{ 
          maxWidth: '900px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
      }}>
        
        {/* User Profile Card */}
        <div style={{ 
            backgroundColor: '#1e1e1e', 
            padding: '25px', 
            borderRadius: '12px', 
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '20px'
        }}>
          {profileImageUrl && (
            <img 
              src={profileImageUrl} 
              alt="Profile" 
              style={{ 
                  width: '80px', 
                  height: '80px', 
                  borderRadius: userData.userType === 'athlete' ? '50%' : '8px',
                  objectFit: userData.userType === 'athlete' ? 'cover' : 'contain',
                  border: '2px solid #007bff' 
              }} 
            />
          )}
          <div>
            <h1 style={{ margin: 0, fontSize: '2em', color: '#007bff' }}>Hello, {displayName}!</h1>
            <p style={{ margin: 0, color: '#aaa' }}>Welcome to your AthLinq Dashboard.</p>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px'
        }}>
            <ActionButton 
                text="My Profile" 
                icon="👤" 
                onClick={() => router.push(userData.userType === 'athlete' ? '/athlete-profile' : '/business-profile')} 
                backgroundColor="#007bff"
            />
            {userData.userType === 'athlete' && (
                <ActionButton 
                    text="Find your next deal" 
                    icon="💼" 
                    onClick={() => router.push('/find-businesses')} 
                    backgroundColor="#28a745"
                />
            )}
            {userData.userType === 'business' && (
                <ActionButton 
                    text="Find Athletes" 
                    icon="🏃‍♂️" 
                    onClick={() => router.push('/find-athletes')} 
                    backgroundColor="#28a745"
                />
            )}
            <ActionButton 
                text="Messages (Inbox)" 
                icon="✉️" 
                onClick={() => router.push('/inbox')} 
                backgroundColor="#ffc107"
            />
            <ActionButton 
                text="My Deals" 
                icon="🤝" 
                onClick={() => router.push('/my-deals')} 
                backgroundColor="#6f42c1"
            />
            {userData.userType === 'athlete' && stripeConnectStatus !== 'connected' && (
                <ActionButton 
                    text={stripeConnectStatus === 'pending_onboarding' ? 'Continue Stripe Setup' : 'Connect Stripe Account'}
                    icon="💳" 
                    onClick={handleConnectStripe} 
                    backgroundColor="#6772E5"
                />
            )}
             <ActionButton 
                text="Logout" 
                icon="🚪" 
                onClick={handleLogout} 
                backgroundColor="#dc3545"
            />
        </div>
      </div>
    </div>
  );
}

// --- ActionButton Component (to be placed in the same file for now) ---
const ActionButton = ({ text, icon, onClick, backgroundColor }) => (
    <button 
        onClick={onClick}
        style={{
            backgroundColor: backgroundColor,
            color: 'white',
            padding: '20px',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1.2em',
            fontWeight: 'bold',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
        <span style={{ fontSize: '1.5em' }}>{icon}</span>
        {text}
    </button>
);