import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseConfig';
import LoadingLogo from '../src/components/LoadingLogo'; // NEW: Import LoadingLogo

export default function MyDealsPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [allDeals, setAllDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);

      const currentUserDocRef = doc(db, 'users', user.uid);
      const currentUserDocSnap = await getDoc(currentUserDocRef);
      if (!currentUserDocSnap.exists()) {
        console.error('Current user data not found in Firestore!');
        setLoading(false);
        return;
      }
      const userData = currentUserDocSnap.data();
      setCurrentUserData(userData);

      const dealsCollectionRef = collection(db, 'deals');

      const qAthlete = query(dealsCollectionRef, where('athleteId', '==', user.uid));
      const qBusiness = query(dealsCollectionRef, where('proposingBusinessId', '==', user.uid));

      const [snapshotAthlete, snapshotBusiness] = await Promise.all([
        getDocs(qAthlete),
        getDocs(qBusiness)
      ]);

      let allUserDeals = {};
      snapshotAthlete.docs.forEach(doc => {
        allUserDeals[doc.id] = { id: doc.id, ...doc.data() };
      });
      snapshotBusiness.docs.forEach(doc => {
        allUserDeals[doc.id] = { id: doc.id, ...doc.data() };
      });

      const dealsList = await Promise.all(Object.values(allUserDeals).map(async (deal) => {
        let otherPartyName = 'N/A';
        if (userData.userType === 'athlete') {
          otherPartyName = deal.proposingBusinessName || 'Unknown Business';
        } else if (userData.userType === 'business') {
          otherPartyName = deal.athleteName || 'Unknown Athlete';
        }

        return { ...deal, otherPartyName };
      }));

      dealsList.sort((a, b) => {
        const timeA = a.timestamp ? a.timestamp.toDate().getTime() : 0;
        const timeB = b.timestamp ? b.timestamp.toDate().getTime() : 0;
        return timeB - timeA;
      });

      setAllDeals(dealsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const filteredDeals = useMemo(() => {
    if (selectedStatus === 'all') {
      return allDeals;
    }
    return allDeals.filter(deal => deal.status === selectedStatus);
  }, [allDeals, selectedStatus]);


  const getStatusStyle = (status) => {
    switch (status) {
      case 'proposed': return { backgroundColor: '#007bff', color: 'white', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' };
      case 'accepted': return { backgroundColor: '#28a745', color: 'white', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' };
      case 'rejected': return { backgroundColor: '#dc3545', color: 'white', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' };
      case 'paid': return { backgroundColor: '#6c757d', color: 'white', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' };
      case 'revoked': return { backgroundColor: '#ffc107', color: 'black', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' };
      default: return { backgroundColor: '#6c757d', color: 'white', padding: '4px 8px', borderRadius: '4px' };
    }
  };

  if (loading) {
    return <LoadingLogo size="100px" />;
  }

  if (!currentUser || !currentUserData) {
    return null;
  }

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
        <h1 style={{ color: '#007bff', textAlign: 'center', marginBottom: '20px' }}>My Deals</h1>

        <div style={{ marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #333' }}>
          <label htmlFor="dealStatusFilter" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Filter by Status:</label>
          <select
            id="dealStatusFilter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#e0e0e0' }}
          >
            <option value="all">All Deals</option>
            <option value="proposed">Proposed</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid (Finalized)</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>

        {filteredDeals.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#aaa' }}>You have no deals matching the selected criteria.</p>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {filteredDeals.map(deal => (
              <div
                key={deal.id}
                onClick={() => router.push(`/deal-details/${deal.id}`)}
                style={{
                  border: '1px solid #333',
                  padding: '15px',
                  borderRadius: '12px',
                  backgroundColor: '#2a2a2a',
                  cursor: 'pointer',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                  transition: 'transform 0.1s ease-in-out',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div>
                  <h3 style={{ margin: '0 0 5px 0', color: '#e0e0e0' }}>{deal.dealTitle || 'Unnamed Deal'}</h3>
                  <p style={{ margin: '0 0 5px 0' }}>
                    {currentUserData.userType === 'athlete' ? 'From:' : 'To:'} <strong style={{ color: '#007bff' }}>{deal.otherPartyName}</strong>
                  </p>
                  <p style={{ fontSize: '0.85em', color: '#aaa', margin: 0 }}>
                    Proposed: {deal.timestamp ? deal.timestamp.toDate().toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <span style={getStatusStyle(deal.status)}>{deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}</span>
                </div>
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
            borderRadius: '8px',
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
  );
}