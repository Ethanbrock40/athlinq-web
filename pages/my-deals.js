// pages/my-deals.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseConfig';

export default function MyDealsPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login'); // Redirect to login if not authenticated
        return;
      }
      setCurrentUser(user);

      // Fetch current user's profile data
      const currentUserDocRef = doc(db, 'users', user.uid);
      const currentUserDocSnap = await getDoc(currentUserDocRef);
      if (!currentUserDocSnap.exists()) {
        console.error('Current user data not found in Firestore!');
        setLoading(false);
        return;
      }
      const userData = currentUserDocSnap.data();
      setCurrentUserData(userData);

      // Fetch deals where current user is the athlete OR the proposing business
      const dealsCollectionRef = collection(db, 'deals');

      // Query 1: Deals where current user is the athlete
      const qAthlete = query(dealsCollectionRef, where('athleteId', '==', user.uid));
      // Query 2: Deals where current user is the proposing business
      const qBusiness = query(dealsCollectionRef, where('proposingBusinessId', '==', user.uid));

      const [snapshotAthlete, snapshotBusiness] = await Promise.all([
        getDocs(qAthlete),
        getDocs(qBusiness)
      ]);

      let allDeals = {}; // Use object to merge and de-duplicate
      snapshotAthlete.docs.forEach(doc => {
        allDeals[doc.id] = { id: doc.id, ...doc.data() };
      });
      snapshotBusiness.docs.forEach(doc => {
        allDeals[doc.id] = { id: doc.id, ...doc.data() };
      });

      const dealsList = await Promise.all(Object.values(allDeals).map(async (deal) => {
        let otherPartyName = 'N/A';
        let otherPartyId = '';

        if (userData.userType === 'athlete' && deal.proposingBusinessId) {
          otherPartyId = deal.proposingBusinessId;
          otherPartyName = deal.proposingBusinessName || 'Unknown Business';
        } else if (userData.userType === 'business' && deal.athleteId) {
          otherPartyId = deal.athleteId;
          otherPartyName = deal.athleteName || 'Unknown Athlete';
        }

        // We already store names on the deal document, so no need to re-fetch user profiles
        return { ...deal, otherPartyName, otherPartyId };
      }));

      // Sort by latest timestamp (most recent deals first)
      dealsList.sort((a, b) => {
        const timeA = a.timestamp ? a.timestamp.toDate().getTime() : 0;
        const timeB = b.timestamp ? b.timestamp.toDate().getTime() : 0;
        return timeB - timeA;
      });

      setDeals(dealsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Helper to format deal status
  const getStatusStyle = (status) => {
    switch (status) {
      case 'proposed': return { color: '#007bff', fontWeight: 'bold' };
      case 'accepted': return { color: '#28a745', fontWeight: 'bold' };
      case 'rejected': return { color: '#dc3545', fontWeight: 'bold' };
      default: return { color: '#6c757d' };
    }
  };

  if (loading) {
    return <p>Loading your deals...</p>;
  }

  if (!currentUser) {
    return null; // Redirect handled by useEffect
  }
  
  if (!currentUserData) {
    return <p>Error: Could not load user data to fetch deals.</p>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9', color: '#333' }}>
      <h1 style={{ color: '#007bff', marginBottom: '20px' }}>My Deals</h1>

      {deals.length === 0 ? (
        <p>You have no active deals. Find an athlete or business to propose a deal!</p>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {deals.map(deal => (
            <div 
              key={deal.id} 
              onClick={() => router.push(`/deal-details/${deal.id}`)} // Navigate to deal details page
              style={{ 
                border: '1px solid #ddd', 
                padding: '15px', 
                borderRadius: '8px', 
                backgroundColor: '#fff', 
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                transition: 'transform 0.1s ease-in-out',
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>{deal.dealTitle || 'Unnamed Deal'}</h3>
              <p style={{ margin: '0 0 5px 0' }}>
                {currentUserData.userType === 'athlete' ? 'From:' : 'To:'} <strong>{deal.otherPartyName}</strong>
              </p>
              <p style={{ margin: '0 0 5px 0' }}>
                Status: <span style={getStatusStyle(deal.status)}>{deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}</span>
              </p>
              <p style={{ fontSize: '0.85em', color: '#888', margin: 0 }}>
                Proposed: {deal.timestamp ? deal.timestamp.toDate().toLocaleString() : 'N/A'}
              </p>
            </div>
          ))}
        </div>
      )}

      <button 
        onClick={() => router.push('/dashboard')} 
        style={{ 
          marginTop: '30px', 
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
  );
}