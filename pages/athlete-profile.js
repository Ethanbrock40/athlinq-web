// pages/athlete-profile.js
// This page is for viewing the athlete's own profile (non-editable)
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseConfig';
import LoadingLogo from '../src/components/LoadingLogo'; // NEW: Import LoadingLogo
import Avatar from '../src/components/Avatar'; // NEW: Import the Avatar component
import ErrorBoundary from '../src/components/ErrorBoundary';

export default function AthleteProfile() {
  const [user, setUser] = useState(null); // Firebase Auth user object
  const [profileData, setProfileData] = useState(null); // Data from Firestore
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login'); // Redirect to login if not authenticated
        return;
      }
      setUser(currentUser);

      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        setProfileData(data);
        if (data.userType !== 'athlete') {
          router.push('/dashboard'); // Redirect if not an athlete
        }
      } else {
        console.log('No user profile document found for UID:', currentUser.uid);
        // If profile doesn't exist, redirect to edit page to create it
        router.push('/edit-athlete-profile'); 
        return;
      }
      setLoading(false);
    });

    return () => unsubscribe(); // Clean up subscription
  }, [router]);

  if (loading) {
    return <LoadingLogo size="100px" />;
  }

  if (!user || !profileData || profileData.userType !== 'athlete') {
    return null; // Redirect handled by useEffect
  }

  // Helper to display data gracefully if null/undefined
  const displayField = (value) => value || 'N/A';
  // UPDATED: Added Array.isArray check to prevent error on new accounts
  const displayList = (list) => (Array.isArray(list) && list.length > 0 ? list.join(', ') : 'N/A');

  // Helper for social media links to handle both string and object formats
  const displaySocialMediaLinks = (links) => {
    if (!links) return 'N/A';
    if (typeof links === 'string') {
      return links;
    } else if (typeof links === 'object' && !Array.isArray(links)) {
      const values = Object.values(links).filter(link => typeof link === 'string' && link.trim() !== '');
      return values.length > 0 ? values.join(', ') : 'N/A';
    }
    return 'N/A';
  };

  // Get user initials for fallback
  const initials = profileData.firstName && profileData.lastName 
    ? `${profileData.firstName.charAt(0)}${profileData.lastName.charAt(0)}`.toUpperCase() 
    : (profileData.firstName ? profileData.firstName.charAt(0).toUpperCase() : '');

  return (
    <ErrorBoundary>
      <div style={{ 
          fontFamily: 'Inter, sans-serif',
          backgroundColor: '#0a0a0a', 
          color: '#e0e0e0',
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          padding: '20px'
      }}>
        <div style={{ 
            maxWidth: '900px',
            width: '100%',
            backgroundColor: '#1e1e1e', 
            padding: '30px', 
            borderRadius: '12px', 
            boxShadow: '0 6px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '25px'
        }}>
          <h1 style={{ color: '#007bff', textAlign: 'center', marginBottom: '15px' }}>{profileData.firstName}'s Athlete Profile</h1>
          
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <Avatar 
              url={profileData.profileImageUrl} 
              name={`${profileData.firstName} ${profileData.lastName}`} 
              size="large" 
            />
          </div>

          <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
              <h2 style={{ color: '#007bff', fontSize: '1.5em', marginBottom: '15px' }}>Personal Details</h2>
              <p style={{ margin: '5px 0' }}><strong>Name:</strong> {displayField(profileData.firstName)} {displayField(profileData.lastName)}</p>
              <p style={{ margin: '5px 0' }}><strong>Email:</strong> {displayField(profileData.email)}</p>
              <p style={{ margin: '5px 0' }}><strong>University/College:</strong> {displayField(profileData.universityCollege)}</p>
              <p style={{ margin: '5px 0' }}><strong>Sport(s):</strong> {displayList(profileData.sports)}</p>
          </div>

          <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
              <h2 style={{ color: '#007bff', fontSize: '1.5em', marginBottom: '15px' }}>About Me (Interests)</h2>
              <p>{displayField(profileData.bio)}</p>
          </div>

          <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
              <h2 style={{ color: '#007bff', fontSize: '1.5em', marginBottom: '15px' }}>Achievements & Socials</h2>
              <p style={{ margin: '5px 0' }}><strong>Achievements/Stats:</strong> {displayField(profileData.achievementsStats)}</p>
              <p style={{ margin: '5px 0' }}><strong>Social Media:</strong> {displaySocialMediaLinks(profileData.socialMediaLinks)}</p>
          </div>

          <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
              <h2 style={{ color: '#007bff', fontSize: '1.5em', marginBottom: '15px' }}>NIL Interests</h2>
              <p>{displayList(profileData.nilInterests)}</p>
          </div>

          <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button 
              onClick={() => router.push('/edit-athlete-profile')} 
              style={{ 
                padding: '10px 20px', 
                backgroundColor: '#28a745', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer', 
                fontSize: '1em',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#218838'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
            >
              Edit Profile
            </button>
            <button 
              onClick={() => router.push('/dashboard')} 
              style={{ 
                padding: '10px 20px', 
                backgroundColor: '#6c757d', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontSize: '1em',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  </ErrorBoundary>
  );
}