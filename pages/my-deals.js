import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, writeBatch, orderBy } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseConfig';
import LoadingLogo from '../src/components/LoadingLogo';
import ErrorBoundary from '../src/components/ErrorBoundary';

const statusColors = {
  proposed: '#007bff',
  accepted: '#28a745',
  rejected: '#dc3545',
  paid: '#888',
  revoked: '#ffc107',
};

const statusTextColors = {
  proposed: 'white',
  accepted: 'white',
  rejected: 'white',
  paid: 'white',
  revoked: 'black',
};

const getStatusStyle = (status) => ({
  display: 'inline-block',
  padding: '4px 10px',
  borderRadius: '15px',
  backgroundColor: statusColors[status] || '#6c757d',
  color: statusTextColors[status] || 'white',
  fontWeight: 'bold',
  fontSize: '0.8rem',
  textTransform: 'capitalize',
});

const getNotificationBadgeStyle = (type) => {
  let backgroundColor;
  let text;
  switch (type) {
    case 'deal_accepted':
      backgroundColor = '#28a745';
      text = 'Accepted';
      break;
    case 'deal_rejected':
      backgroundColor = '#dc3545';
      text = 'Rejected';
      break;
    case 'deal_revoked':
      backgroundColor = '#ffc107';
      text = 'Revoked';
      break;
    default:
      backgroundColor = '#007bff';
      text = 'Update';
  }
  return {
    badge: {
      position: 'absolute',
      top: '10px',
      right: '10px',
      padding: '5px 10px',
      borderRadius: '15px',
      backgroundColor: backgroundColor,
      color: 'white',
      fontSize: '0.7rem',
      fontWeight: 'bold',
      textTransform: 'uppercase',
    },
    text: text,
  };
};

export default function MyDeals() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [allDeals, setAllDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [notifications, setNotifications] = useState({});
  const [error, setError] = useState(null); // FIX: Added error state

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);
      fetchDealsAndNotifications(user);
    });

    return () => unsubscribe();
  }, [router]);

  const fetchDealsAndNotifications = async (user) => {
    try {
      setLoading(true);
      setError(null);
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
      
      const dealsList = Object.values(allUserDeals);

      dealsList.sort((a, b) => {
        const timeA = a.timestamp ? a.timestamp.toDate().getTime() : 0;
        const timeB = b.timestamp ? b.timestamp.toDate().getTime() : 0;
        return timeB - timeA;
      });

      setAllDeals(dealsList);

      const notificationsRef = collection(db, 'notifications');
      const unreadNotifQuery = query(
        notificationsRef,
        where('recipientId', '==', user.uid),
        where('read', '==', false),
        where('type', 'in', ['deal_accepted', 'deal_rejected', 'deal_revoked'])
      );
      const notifSnapshot = await getDocs(unreadNotifQuery);

      const newNotifications = {};
      notifSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const dealId = data.link.split('/').pop();
        if (!newNotifications[dealId]) {
          newNotifications[dealId] = [];
        }
        newNotifications[dealId].push(data);
      });
      setNotifications(newNotifications);
      
    } catch (err) {
      console.error('Error fetching deals or notifications:', err);
      setError('Failed to load your deals. Please try again.'); // FIX: Set error state
    } finally {
      setLoading(false);
    }
  };

  const filteredDeals = useMemo(() => {
    if (selectedStatus === 'all') {
      return allDeals;
    }
    return allDeals.filter(deal => deal.status === selectedStatus);
  }, [allDeals, selectedStatus]);


  const handleDealClick = async (dealId) => {
    const unreadNotifQuery = query(
        collection(db, 'notifications'),
        where('link', '==', `/deal-details/${dealId}`),
        where('recipientId', '==', currentUser.uid),
        where('read', '==', false)
    );
    const unreadSnapshot = await getDocs(unreadNotifQuery);
    
    if (!unreadSnapshot.empty) {
        const batch = writeBatch(db);
        unreadSnapshot.docs.forEach(notifDoc => {
            batch.update(notifDoc.ref, { read: true });
        });
        await batch.commit();
        setNotifications(prev => {
            const newState = { ...prev };
            delete newState[dealId];
            return newState;
        });
    }

    router.push(`/deal-details/${dealId}`);
  };

  if (loading) {
    return <LoadingLogo size="100px" />;
  }

  if (error) { // FIX: Display the error message
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto', textAlign: 'center', color: 'red' }}>
        <p>{error}</p>
        <button onClick={() => router.push('/dashboard')} style={{ marginTop: '20px' }}>Back to Dashboard</button>
      </div>
    );
  }

  if (!currentUser || !currentUserData) {
    return null;
  }

  return (
    <ErrorBoundary>
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
              {filteredDeals.map(deal => {
                const unreadNotif = notifications[deal.id] && notifications[deal.id].length > 0;
                const notificationType = unreadNotif ? notifications[deal.id][0].type : null;
                const notificationBadge = getNotificationBadgeStyle(notificationType);
                
                const isProposed = deal.status === 'proposed';
                const isCurrentUserBusiness = currentUser.uid === deal.proposingBusinessId;

                return (
                  <div 
                    key={deal.id} 
                    onClick={() => handleDealClick(deal.id)}
                    style={{
                      position: 'relative',
                      padding: '15px',
                      border: '1px solid #333', 
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
                    {unreadNotif && (
                      <div style={notificationBadge.badge}>
                        {notificationBadge.text}
                      </div>
                    )}
                  </div>
                );
              })}
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
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}