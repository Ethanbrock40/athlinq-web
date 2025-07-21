// pages/business-profile.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseConfig';

export default function BusinessProfile() {
  const [user, setUser] = useState(null); // Firebase Auth user object
  const [profileData, setProfileData] = useState(null); // Data from Firestore
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  console.log('BusinessProfile: Component Rendered'); // LOG 1: Component is rendering

  useEffect(() => {
    console.log('BusinessProfile: useEffect triggered'); // LOG 2: useEffect started
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('BusinessProfile: onAuthStateChanged fired. currentUser:', currentUser); // LOG 3: Auth state
      if (currentUser) {
        setUser(currentUser);
        // Fetch user data from Firestore
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setProfileData(data);
          console.log('BusinessProfile: Profile data fetched:', data); // LOG 4: Data fetched
          // Optional: Redirect if not a business
          if (data.userType !== 'business') {
            console.log('BusinessProfile: User is not a business, redirecting to dashboard.'); // LOG 5: Redirect check
            router.push('/dashboard');
          }
        } else {
          console.log('BusinessProfile: No user profile document found for UID:', currentUser.uid); // LOG 6: No doc found
          setProfileData({}); // Set empty object if no profile found
        }
      } else {
        console.log('BusinessProfile: User not authenticated, redirecting to login.'); // LOG 7: Not authenticated
        router.push('/login');
      }
      setLoading(false);
      console.log('BusinessProfile: Loading set to false.'); // LOG 8: Loading finished
    });

    return () => unsubscribe(); // Clean up subscription
  }, [router]);

  // Helper to display data gracefully if null/undefined
  const displayField = (value) => value || 'N/A';
  const displayList = (list) => (list && list.length > 0 ? list.join(', ') : 'N/A');

  console.log('BusinessProfile: Render state check - loading:', loading, 'user:', !!user, 'profileData:', !!profileData); // LOG 9: Pre-render check

  if (loading) {
    return <p>Loading business profile...</p>;
  }

  if (!user || !profileData || profileData.userType !== 'business') {
    console.log('BusinessProfile: Rendering null (due to user/profileData/userType check)'); // LOG 10: Returning null
    return null;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9', color: '#333' }}>
      <h1 style={{ color: '#007bff' }}>{profileData.companyName}'s Business Profile</h1>
      
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
      
      <div style={{ marginTop: '30px' }}>
        <button 
          onClick={() => {
            console.log('BusinessProfile: Edit Profile button clicked!'); // LOG 11: Button click confirmed
            router.push('/edit-business-profile'); 
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