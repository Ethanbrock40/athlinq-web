// pages/athlete-profile.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseConfig';

export default function AthleteProfile() {
  const [user, setUser] = useState(null); // Firebase Auth user object
  const [profileData, setProfileData] = useState(null); // Data from Firestore
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  console.log('AthleteProfile: Component Rendered'); // LOG 1: Component is rendering

  useEffect(() => {
    console.log('AthleteProfile: useEffect triggered'); // LOG 2: useEffect started
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('AthleteProfile: onAuthStateChanged fired. currentUser:', currentUser); // LOG 3: Auth state
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setProfileData(data);
          console.log('AthleteProfile: Profile data fetched:', data); // LOG 4: Data fetched
          if (data.userType !== 'athlete') {
            console.log('AthleteProfile: User is not an athlete, redirecting to dashboard.'); // LOG 5: Redirect check
            router.push('/dashboard'); // Redirect if not an athlete
          }
        } else {
          console.log('AthleteProfile: No user profile document found for UID:', currentUser.uid); // LOG 6: No doc found
          setProfileData({}); // Set empty object if no profile found
        }
      } else {
        console.log('AthleteProfile: User not authenticated, redirecting to login.'); // LOG 7: Not authenticated
        router.push('/login');
      }
      setLoading(false);
      console.log('AthleteProfile: Loading set to false.'); // LOG 8: Loading finished
    });

    return () => unsubscribe(); // Clean up subscription
  }, [router]);

  // Helper to display data gracefully if null/undefined
  const displayField = (value) => value || 'N/A';
  const displayList = (list) => (list && list.length > 0 ? list.join(', ') : 'N/A');

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

  console.log('AthleteProfile: Render state check - loading:', loading, 'user:', !!user, 'profileData:', !!profileData); // LOG 9: Pre-render check


  if (loading) {
    return <p>Loading athlete profile...</p>;
  }

  if (!user || !profileData || profileData.userType !== 'athlete') {
    console.log('AthleteProfile: Rendering null (due to user/profileData/userType check)'); // LOG 10: Returning null
    return null;
  }

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
      <p><strong>Social Media:</strong> {displaySocialMediaLinks(profileData.socialMediaLinks)}</p>
      <p><strong>NIL Interests:</strong> {displayList(profileData.nilInterests)}</p>

      <div style={{ marginTop: '30px' }}>
        <button 
          onClick={() => {
            console.log('AthleteProfile: Edit Profile button clicked!'); // LOG 11: Button click confirmed
            router.push('/edit-athlete-profile'); // <--- CORRECTED LINE: Navigates to the edit page
          }} 
          style={{ 
            padding: '10px 15px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer', 
            marginRight: '10px' 
          }}
        >
          Edit Profile
        </button>
        <button 
          onClick={() => router.push('/dashboard')} 
          style={{ 
            padding: '10px 15px', 
            backgroundColor: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer' 
          }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}