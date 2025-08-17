// pages/dashboard.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

import { auth, db } from '../lib/firebaseConfig';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [stripeConnectStatus, setStripeConnectStatus] = useState('not_connected');
  const [chattedAthletes, setChattedAthletes] = useState([]); // NEW: State for athletes the business has chatted with
  const [selectedAthleteId, setSelectedAthleteId] = useState(''); // NEW: State for selected athlete
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserData(data);

          if (data.stripeAccountId) {
            setStripeConnectStatus('pending_onboarding');
          } else {
            setStripeConnectStatus('not_connected');
          }

          // NEW: Fetch all chats for the current user
          const chatsCollectionRef = collection(db, 'chats');
          const q1 = query(chatsCollectionRef, where('participant1Id', '==', currentUser.uid));
          const q2 = query(chatsCollectionRef, where('participant2Id', '==', currentUser.uid));
          
          const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
          let chats = {};
          snapshot1.docs.forEach(doc => { chats[doc.id] = { id: doc.id, ...doc.data() }; });
          snapshot2.docs.forEach(doc => { chats[doc.id] = { id: doc.id, ...doc.data() }; });
          const activeChatsList = Object.values(chats);

          // Find athletes among the chat participants
          const athletesInChats = [];
          for (const chat of activeChatsList) {
            const otherParticipantId = chat.participant1Id === currentUser.uid ? chat.participant2Id : chat.participant1Id;
            const otherParticipantDocRef = doc(db, 'users', otherParticipantId);
            const otherParticipantDocSnap = await getDoc(otherParticipantDocRef);
            if (otherParticipantDocSnap.exists() && otherParticipantDocSnap.data().userType === 'athlete') {
              const athleteData = otherParticipantDocSnap.data();
              athletesInChats.push({
                uid: otherParticipantId,
                name: `${athleteData.firstName} ${athleteData.lastName}`,
              });
            }
          }
          setChattedAthletes(athletesInChats);
        } else {
          console.log('No user data found for current user.');
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error.message);
    }
  };

  const handleConnectStripe = async () => {
    if (!user || !userData) return;

    try {
      const response = await fetch('/api/create-connect-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.uid, 
          userEmail: user.email 
        }),
      });
      const data = await response.json();

      if (response.ok && data.url) {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
            stripeAccountId: data.stripeAccountId,
        });
        setStripeConnectStatus('pending_onboarding');
        window.location.href = data.url;
      } else {
        alert(data.message || 'Failed to connect Stripe account. Please try again.');
        console.error('API Error connecting Stripe:', data.message);
      }
    } catch (error) {
      console.error('Client-side error connecting Stripe:', error);
      alert('Error connecting Stripe account. Please try again.');
    }
  };


  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  if (!user || !userData) {
    return null;
  }

  const displayName = userData.userType === 'athlete' 
    ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email
    : userData.userType === 'business'
      ? userData.companyName || userData.email
      : userData.email;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h1>Welcome to your AthLinq Dashboard!</h1>
      <p>Hello, {displayName}!</p>
      <p>This is a protected page. Only logged-in users can see this content.</p>

      <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {/* Button to go to user's own profile */}
        {userData.userType === 'athlete' && (
          <button 
            onClick={() => router.push('/athlete-profile')}
            style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Go to My Profile
          </button>
        )}
        {userData.userType === 'business' && (
          <button 
            onClick={() => router.push('/business-profile')}
            style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Go to My Profile
          </button>
        )}

        {/* Conditional buttons to find other user types */}
        {userData.userType === 'athlete' && (
          <button 
            onClick={() => router.push('/find-businesses')}
            style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Find your next deal
          </button>
        )}
        {userData.userType === 'business' && (
          <button 
            onClick={() => router.push('/find-athletes')}
            style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Find Athletes
          </button>
        )}

        {/* Messages Inbox Button */}
        <button 
          onClick={() => router.push('/inbox')}
          style={{ padding: '10px 15px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          Messages (Inbox)
        </button>

        {/* My Deals Button */}
        <button 
          onClick={() => router.push('/my-deals')}
          style={{ padding: '10px 15px', backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          My Deals
        </button>

        {/* Connect Stripe Account Button (for Athletes only) */}
        {userData.userType === 'athlete' && stripeConnectStatus !== 'connected' && (
          <button 
            onClick={handleConnectStripe}
            style={{ padding: '10px 15px', backgroundColor: '#6772E5', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            {stripeConnectStatus === 'pending_onboarding' ? 'Continue Stripe Setup' : 'Connect Stripe Account'}
          </button>
        )}

        <button
          onClick={handleLogout}
          style={{ padding: '10px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>

      {/* NEW: Propose Deal Section (for businesses only) */}
      {userData.userType === 'business' && chattedAthletes.length > 0 && (
        <div style={{ marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
          <h2 style={{ color: '#007bff' }}>Propose a New Deal</h2>
          <select
            value={selectedAthleteId}
            onChange={(e) => setSelectedAthleteId(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', marginBottom: '15px' }}
          >
            <option value="">Select an Athlete</option>
            {chattedAthletes.map(athlete => (
              <option key={athlete.uid} value={athlete.uid}>{athlete.name}</option>
            ))}
          </select>
          <button
            onClick={() => router.push(`/propose-deal/${selectedAthleteId}`)}
            disabled={!selectedAthleteId} // Disable button if no athlete is selected
            style={{ 
              width: '100%', 
              padding: '10px 15px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer',
              opacity: selectedAthleteId ? 1 : 0.5
            }}
          >
            Propose Deal to Selected Athlete
          </button>
        </div>
      )}
    </div>
  );
}