// pages/public-business-profile/[uid].js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebaseConfig';

export default function PublicBusinessProfile() {
  const [currentUser, setCurrentUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { uid } = router.query;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);

      if (uid) {
        if (currentUser && uid === currentUser.uid) {
            router.push('/business-profile');
            return;
        }

        const businessDocRef = doc(db, 'users', uid);
        const businessDocSnap = await getDoc(businessDocRef);

        if (businessDocSnap.exists()) {
          const data = businessDocSnap.data();
          if (data.userType !== 'business') {
            router.push('/dashboard');
            return;
          }
          setProfileData(data);
        } else {
          console.log('No business profile document found for UID:', uid);
          setProfileData(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, uid, currentUser]);

  const getChatId = (user1Id, user2Id) => {
    return [user1Id, user2Id].sort().join('_');
  };

  if (loading) {
    return <p>Loading business profile...</p>;
  }

  if (!profileData) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9', color: '#333' }}>
        <p>Business profile not found or is invalid.</p>
        <button onClick={() => router.push('/find-businesses')} style={{ marginTop: '20px', padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Back to Find Businesses</button>
      </div>
    );
  }

  const displayField = (value) => value || 'N/A';
  const displayList = (list) => (list && list.length > 0 ? list.join(', ') : 'N/A');

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9', color: '#333' }}>
      <h1 style={{ color: '#007bff' }}>{profileData.companyName}'s Business Profile</h1>
      
      {/* NEW: Business Logo Display */}
      {profileData.businessLogoUrl && (
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <img src={profileData.businessLogoUrl} alt="Business Logo" style={{ width: '150px', height: '150px', objectFit: 'contain', border: '3px solid #007bff' }} />
        </div>
      )}

      <p><strong>Company Name:</strong> {displayField(profileData.companyName)}</p>
      <p><strong>Email:</strong> {displayField(profileData.email)}</p>
      
      <p><strong>Company Website:</strong> {profileData.companyWebsite ? <a href={profileData.companyWebsite} target="_blank" rel="noopener noreferrer">{profileData.companyWebsite}</a> : 'N/A'}</p>
      <p><strong>About Us:</strong> {displayField(profileData.aboutCompany)}</p>
      <p><strong>Industry Sector:</strong> {displayList(profileData.industrySector)}</p>
      <p><strong>Contact Person:</strong> {displayField(profileData.contactPerson)}</p>
      <p><strong>Types of Deals Offered:</strong> {displayList(profileData.typesOfDealsOffered)}</p>
      
      <div style={{ marginTop: '30px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {/* Message Business Button (only if viewing someone else's profile) */}
        {currentUser && currentUser.uid !== uid && (
            <button 
                onClick={() => router.push(`/chat/${getChatId(currentUser.uid, uid)}`)}
                style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
                Message {profileData.companyName}
            </button>
        )}
        <button onClick={() => router.push('/find-businesses')} style={{ padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Back to Find Businesses
        </button>
      </div>
    </div>
  );
}