import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

import { auth, db } from '../lib/firebaseConfig';
import LoadingLogo from '../src/components/LoadingLogo';
import ErrorBoundary from '../src/components/ErrorBoundary';
import DashboardCard from '../src/components/DashboardCard';
import Avatar from '../src/components/Avatar';
import styles from '../src/components/Dashboard.module.css';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [stripeConnectStatus, setStripeConnectStatus] = useState('not_connected');
  const [unreadCount, setUnreadCount] = useState(0);
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

          const chatsCollectionRef = collection(db, 'chats');
          const q1 = query(chatsCollectionRef, where('participant1Id', '==', currentUser.uid));
          const q2 = query(chatsCollectionRef, where('participant2Id', '==', currentUser.uid));
          
          const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
          let unreadChats = 0;
          
          const processDocs = (docs) => {
            docs.forEach(doc => {
              const chatData = doc.data();
              const lastMessageTimestamp = chatData.lastMessageTimestamp ? chatData.lastMessageTimestamp.toDate() : new Date(0);
              const lastReadTimestamp = data.chatsLastRead && data.chatsLastRead[doc.id] 
                                        ? data.chatsLastRead[doc.id].toDate() 
                                        : new Date(0);
              if (lastMessageTimestamp > lastReadTimestamp) {
                unreadChats++;
              }
            });
          };

          processDocs(snapshot1.docs);
          processDocs(snapshot2.docs);
          setUnreadCount(unreadChats);

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

  const goToMyProfile = () => {
    router.push(userData.userType === 'athlete' ? '/athlete-profile' : '/business-profile');
  };

  const handleGetAIMatches = () => {
    if (user && userData) {
        router.push(`/ai-matches?userId=${user.uid}&userType=${userData.userType}`);
    } else {
        alert('Please log in to get AI matches.');
    }
  };


  if (loading) {
    return <LoadingLogo size="120px" />;
  }

  if (!user || !userData) {
    return null;
  }

  const displayName = userData.userType === 'athlete' 
    ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email
    : userData.userType === 'business'
      ? userData.companyName || userData.email
      : userData.email;
      
  const profileImageUrl = userData.userType === 'athlete' 
    ? userData.profileImageUrl 
    : userData.businessLogoUrl;

  return (
    <ErrorBoundary>
      <div className={styles['dashboard-page-container']}>
        {/* The new, consolidated top banner */}
        <nav className={styles['top-banner']}>
          {/* Left side: AthLinq Logo */}
          <div className={styles['banner-left-group']}>
            <img 
                src="/Athlinq no BG.png" 
                alt="AthLinq Logo" 
                className={styles['banner-logo']}
            />
          </div>
          {/* Right side: User Profile Pic/Initials & Logout */}
          <div className={styles['banner-right-group']}>
            <div onClick={goToMyProfile} className={styles['profile-link-group']}>
                <Avatar 
                  url={profileImageUrl}
                  name={displayName}
                  size="medium"
                />
                <span className={styles['profile-name-text']}>{displayName}</span>
            </div>
            
            <button onClick={handleLogout} className={styles['logout-button']}>
                Logout
            </button>
          </div>
        </nav>

        {/* Main Content Area */}
        <div className={styles['main-content-area']}>
          {/* Welcome Banner (now a separate component below the top banner) */}
          <div className={styles['welcome-banner']}>
            <h2 className={styles['welcome-heading']}>Welcome, {displayName}!</h2>
            <p className={styles['welcome-subheading']}>Your hub for NIL opportunities.</p>
          </div>

          <div className={styles['action-cards-grid']}>
            <DashboardCard 
                title="Find Your Next Deal" 
                description="Browse businesses offering NIL partnerships." 
                icon="💼" 
                color="#28a745" 
                onClick={() => router.push('/find-businesses')} 
                userType={userData.userType}
                requiredUserType="athlete"
            />
            <DashboardCard 
                title="Find Athletes" 
                description="Discover athletes for your NIL campaigns." 
                icon="🏃‍♂️" 
                color="#28a745" 
                onClick={() => router.push('/find-athletes')} 
                userType={userData.userType}
                requiredUserType="business"
            />
            <DashboardCard 
                title="Messages" 
                description="Check your inbox for new conversations." 
                icon="✉️" 
                count={unreadCount}
                color="#ffc107" 
                onClick={() => router.push('/inbox')} 
                userType={userData.userType}
                requiredUserType={['athlete', 'business']}
            />
            <DashboardCard 
                title="My Deals" 
                description="Track all your proposed, accepted, and paid deals." 
                icon="🤝" 
                color="#6f42c1" 
                onClick={() => router.push('/my-deals')} 
                userType={userData.userType}
                requiredUserType={['athlete', 'business']}
            />
            {userData.userType === 'athlete' && stripeConnectStatus !== 'connected' && (
                <DashboardCard 
                    title={stripeConnectStatus === 'pending_onboarding' ? 'Continue Stripe Setup' : 'Connect Stripe Account'}
                    description="Receive payments directly for your NIL deals." 
                    icon="💳" 
                    color="#6772E5" 
                    onClick={handleConnectStripe} 
                    userType={userData.userType}
                    requiredUserType="athlete"
                />
            )}
            <DashboardCard 
                title="Get AI Matches" 
                description="Discover intelligent NIL recommendations." 
                icon="✨" 
                color="#ff69b4"
                onClick={handleGetAIMatches} 
                userType={userData.userType}
                requiredUserType={['athlete', 'business']}
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}