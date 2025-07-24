// pages/my-deals.js
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseConfig';

export default function MyDealsPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [allDeals, setAllDeals] = useState([]); // Stores all fetched deals
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all'); // New state for filter

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

      const qAthlete = query(dealsCollectionRef, where('athleteId', '==', user.uid));
      const qBusiness = query(dealsCollectionRef, where('proposingBusinessId', '==', user.uid));

      const [snapshotAthlete, snapshotBusiness] = await Promise.all([
        getDocs(qAthlete),
        getDocs(qBusiness)
      ]);

      let allUserDeals = {}; // Use object to merge and de-duplicate
      snapshotAthlete.docs.forEach(doc => {
        allUserDeals[doc.id] = { id: doc.id, ...doc.data() };
      });
      snapshotBusiness.docs.forEach(doc => {
        allUserDeals[doc.id] = { id: doc.id, ...doc.data() };
      });

      const dealsList = await Promise.all(Object.values(allUserDeals).map(async (deal) => {
        let otherPartyName = 'N/A';
        // The names are already stored on the deal document during proposal, no need to re-fetch
        if (userData.userType === 'athlete') {
          otherPartyName = deal.proposingBusinessName || 'Unknown Business';
        } else if (userData.userType === 'business') {
          otherPartyName = deal.athleteName || 'Unknown Athlete';
        }

        return { ...deal, otherPartyName };
      }));

      // Sort by latest timestamp (most recent deals first)
      dealsList.sort((a, b) => {
        const timeA = a.timestamp ? a.timestamp.toDate().getTime() : 0;
        const timeB = b.timestamp ? b.timestamp.toDate().getTime() : 0;
        return timeB - timeA;
      });

      setAllDeals(dealsList); // Store all deals
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Use useMemo to filter deals based on selectedStatus
  const filteredDeals = useMemo(() => {
    if (selectedStatus === 'all') {
      return allDeals;
    }
    return allDeals.filter(deal => deal.status === selectedStatus);
  }, [allDeals, selectedStatus]);


  // Helper to format deal status
  const getStatusStyle = (status) => {
    switch (status) {
      case 'proposed': return { color: '#007bff', fontWeight: 'bold' };
      case 'accepted': return { color: '#28a745', fontWeight: 'bold' };
      case 'rejected': return { color: '#dc3545', color: 'white', fontWeight: 'bold' };
      case 'paid': return { color: '#888', fontWeight: 'bold' };
      case 'revoked': return { color: '#ffc107', fontWeight: 'bold' };
      default: return { color: '#6c757d' };
    }
  };

  if (loading) {
    return <p>Loading your deals...</p>;
  }

  if (!currentUser || !currentUserData) {
    return null;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9', color: '#333' }}>
      <h1 style={{ color: '#007bff', marginBottom: '20px' }}>My Deals</h1>

      {/* Status Filter Dropdown */}
      <div style={{ marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
        <label htmlFor="dealStatusFilter" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Filter by Status:</label>
        <select
          id="dealStatusFilter"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          <option value="all">All Deals</option>
          <option value="proposed">Proposed</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="paid">Paid (Finalized)</option>
          <option value="revoked">Revoked</option> {/* NEW: Option for Revoked */}
        </select>
      </div>

      {filteredDeals.length === 0 ? (
        <p>You have no deals matching the selected criteria.</p>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {filteredDeals.map(deal => (
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