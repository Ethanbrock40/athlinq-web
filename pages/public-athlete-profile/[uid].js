// pages/public-athlete-profile/[uid].js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebaseConfig';

export default function PublicAthleteProfile() {
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
            router.push('/athlete-profile');
            return;
        }

        const athleteDocRef = doc(db, 'users', uid);
        const athleteDocSnap = await getDoc(athleteDocRef);

        if (athleteDocSnap.exists()) {
          const data = athleteDocSnap.data();
          if (data.userType !== 'athlete') {
            router.push('/dashboard');
            return;
          }
          setProfileData(data);
        } else {
          console.log('No athlete profile document found for UID:', uid);
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
    return <p>Loading athlete profile...</p>;
  }

  if (!profileData) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9', color: '#333' }}>
        <p>Athlete profile not found or is invalid.</p>
        <button onClick={() => router.push('/find-athletes')} style={{ marginTop: '20px', padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Back to Find Athletes</button>
      </div>
    );
  }

  const displayField = (value) => value || 'N/A';
  const displayList = (list) => (list && list.length > 0 ? list.join(', ') : 'N/A');

  // NEW Helper for social media links to handle both string and object formats
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

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9', color: '#333' }}>
      <h1 style={{ color: '#007bff' }}>{profileData.firstName}'s Athlete Profile</h1>
      
      {profileData.profileImageUrl && (
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <img src={profileData.profileImageUrl} alt="Profile" style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #007bff' }} />
        </div>
      )}

      <p><strong>Name:</strong> {displayField(profileData.firstName)} {displayField(profileData.lastName)}</p>
      <p><strong>Email:</strong> {displayField(profileData.email)}</p>
      <p><strong>University/College:</strong> {displayField(profileData.universityCollege)}</p>
      <p><strong>Sport(s):</strong> {displayList(profileData.sports)}</p>
      <p><strong>Bio:</strong> {displayField(profileData.bio)}</p>
      <p><strong>Achievements/Stats:</strong> {displayField(profileData.achievementsStats)}</p>
      <p><strong>Social Media:</strong> {displaySocialMediaLinks(profileData.socialMediaLinks)}</p> {/* Using new helper */}
      <p><strong>NIL Interests:</strong> {displayList(profileData.nilInterests)}</p>

      <div style={{ marginTop: '30px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {/* Message Athlete Button (only if viewing someone else's profile) */}
        {currentUser && currentUser.uid !== uid && (
            <button 
                onClick={() => router.push(`/chat/${getChatId(currentUser.uid, uid)}`)}
                style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
                Message {profileData.firstName}
            </button>
        )}

        <button onClick={() => router.push('/find-athletes')} style={{ padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Back to Find Athletes
        </button>
      </div>
    </div>
  );
}