import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseConfig';
import LoadingLogo from '../src/components/LoadingLogo'; // NEW: Import LoadingLogo
import Avatar from '../src/components/Avatar'; // NEW: Import Avatar

export default function BusinessProfile() {
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);

      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        setProfileData(data);
        if (data.userType !== 'business') {
          router.push('/dashboard');
        }
      } else {
        console.log('No user profile document found for UID:', currentUser.uid);
        router.push('/edit-business-profile');
        return;
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return <LoadingLogo size="100px" />;
  }

  if (!user || !profileData || profileData.userType !== 'business') {
    return null;
  }

  const displayField = (value) => value || 'N/A';
  const displayList = (list) => (list && list.length > 0 ? list.join(', ') : 'N/A');

  return (
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
        <h1 style={{ color: '#007bff', textAlign: 'center', marginBottom: '15px' }}>{profileData.companyName}'s Business Profile</h1>

        {/* NEW: Use the reusable Avatar component for the logo */}
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <Avatar 
            url={profileData.businessLogoUrl}
            name={profileData.companyName}
            size="large"
          />
        </div>

        <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
            <h2 style={{ color: '#007bff', fontSize: '1.5em', marginBottom: '15px' }}>Company Details</h2>
            <p style={{ margin: '5px 0' }}><strong>Company Name:</strong> {displayField(profileData.companyName)}</p>
            <p style={{ margin: '5px 0' }}><strong>Email:</strong> {displayField(profileData.email)}</p>
            <p style={{ margin: '5px 0' }}><strong>Company Website:</strong> {profileData.companyWebsite ? <a href={profileData.companyWebsite} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>{profileData.companyWebsite}</a> : 'N/A'}</p>
            <p style={{ margin: '5px 0' }}><strong>Industry Sector:</strong> {displayList(profileData.industrySector)}</p>
        </div>

        <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
            <h2 style={{ color: '#007bff', fontSize: '1.5em', marginBottom: '15px' }}>About Us</h2>
            <p>{displayField(profileData.aboutCompany)}</p>
        </div>

        <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
            <h2 style={{ color: '#007bff', fontSize: '1.5em', marginBottom: '15px' }}>Contact & Deal Interests</h2>
            <p style={{ margin: '5px 0' }}><strong>Contact Person:</strong> {displayField(profileData.contactPerson)}</p>
            <p style={{ margin: '5px 0' }}><strong>Types of Deals Offered:</strong> {displayList(profileData.typesOfDealsOffered)}</p>
        </div>
      
        <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button 
            onClick={() => router.push('/edit-business-profile')}
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
  );
}