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
  const [stripeConnectStatus, setStripeConnectStatus] = useState('not_connected'); // 'not_connected', 'pending_onboarding', 'connected'
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

          // Check for Stripe Connect Account status
          if (data.stripeAccountId) {
            setStripeConnectStatus('pending_onboarding'); // Assume pending if ID exists but not fully "connected" via API check
          } else {
            setStripeConnectStatus('not_connected');
          }
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

  // Function to navigate to user's own profile page
  const goToMyProfile = () => {
    router.push(userData.userType === 'athlete' ? '/athlete-profile' : '/business-profile');
  };


  if (loading) {
    return <p style={{ color: 'white', textAlign: 'center', marginTop: '50px', fontFamily: 'Arial, sans-serif' }}>Loading dashboard...</p>;
  }

  if (!user || !userData) {
    return null; // Redirect handled by useEffect
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
    <div style={{ 
        fontFamily: 'Inter, sans-serif', // Using Inter font as per instructions
        backgroundColor: '#0a0a0a', // Even darker background
        color: '#e0e0e0',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0px' // Remove padding from outer div
    }}>
        {/* Top Navigation Bar */}
        <nav style={{
            width: '100%',
            backgroundColor: '#1a1a1a',
            padding: '15px 30px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: '0 0 8px 8px', // Rounded bottom corners
            marginBottom: '20px'
        }}>
            {/* Left side: AthLinq Logo */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <img 
                    src="https://raw.githubusercontent.com/Ethanbrock40/athlinq-web/main/public/AthLinq%20no%20BG.jpg" 
                    alt="AthLinq Logo" 
                    style={{ 
                        height: '35px', // Adjusted size for top bar
                        marginRight: '10px'
                    }} 
                />
            </div>

            {/* Right side: User Profile Pic/Initials & Logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {/* Clickable User Profile Pic/Initials */}
                <div onClick={goToMyProfile} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {profileImageUrl ? (
                        <img 
                            src={profileImageUrl} 
                            alt="User Profile" 
                            style={{ 
                                width: '40px', 
                                height: '40px', 
                                borderRadius: userData.userType === 'athlete' ? '50%' : '6px',
                                objectFit: userData.userType === 'athlete' ? 'cover' : 'contain',
                                border: '1px solid #007bff' 
                            }} 
                        />
                    ) : (
                        <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '50%', 
                            backgroundColor: '#333', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            color: '#bbb', 
                            fontSize: '1.2em' 
                        }}>
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <span style={{ fontSize: '1em', color: '#e0e0e0', fontWeight: 'bold' }}>{displayName}</span>
                </div>
                
                <button 
                    onClick={handleLogout} 
                    style={{ 
                        backgroundColor: '#dc3545', 
                        color: 'white', 
                        padding: '8px 15px', 
                        border: 'none', 
                        borderRadius: '6px', 
                        cursor: 'pointer', 
                        fontSize: '0.9em',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
                >
                    Logout
                </button>
            </div>
        </nav>

        {/* Main Content Area */}
        <div style={{ 
            maxWidth: '1200px', // Increased max-width for a wider layout
            width: '100%',
            padding: '0 20px', // Padding on sides
            display: 'flex',
            flexDirection: 'column',
            gap: '25px' // Gap between sections
        }}>
            {/* Welcome Section */}
            <div style={{ 
                backgroundColor: '#1e1e1e', 
                padding: '30px', 
                borderRadius: '12px', 
                boxShadow: '0 6px 12px rgba(0,0,0,0.3)',
                textAlign: 'center'
            }}>
                <h2 style={{ margin: '0 0 10px 0', fontSize: '2.5em', color: '#007bff' }}>Welcome, {displayName}!</h2>
                <p style={{ margin: 0, fontSize: '1.1em', color: '#aaa' }}>Your hub for NIL opportunities.</p>
            </div>

            {/* Action Cards Grid */}
            <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', // Larger min-width for cards
                gap: '20px' // Gap between cards
            }}>
                {/* Removed the 'My Profile' card as the profile picture is now clickable */}
                
                <DashboardCard 
                    title="Find Your Next Deal" 
                    description="Browse businesses offering NIL partnerships." 
                    icon="💼" 
                    color="#28a745" 
                    onClick={() => router.push('/find-businesses')} 
                    userType={userData.userType} // Pass userType to card for conditional rendering
                    requiredUserType="athlete" // Specify which userType this card is for
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
                    color="#ffc107" 
                    onClick={() => router.push('/inbox')} 
                    userType={userData.userType}
                    requiredUserType={['athlete', 'business']} // Both user types can see this
                />
                <DashboardCard 
                    title="My Deals" 
                    description="Track all your proposed, accepted, and paid deals." 
                    icon="🤝" 
                    color="#6f42c1" 
                    onClick={() => router.push('/my-deals')} 
                    userType={userData.userType}
                    requiredUserType={['athlete', 'business']} // Both user types can see this
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
            </div>
        </div>
    </div>
  );
}

// --- DashboardCard Component ---
const DashboardCard = ({ title, description, icon, color, onClick, userType, requiredUserType }) => {
    // Conditionally render the card based on userType
    const shouldRender = Array.isArray(requiredUserType) 
        ? requiredUserType.includes(userType)
        : userType === requiredUserType;

    if (!shouldRender) {
        return null; // Don't render the card if userType doesn't match
    }

    return (
        <div 
            onClick={onClick}
            style={{
                backgroundColor: '#1e1e1e', // Card background
                padding: '25px',
                borderRadius: '12px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                cursor: 'pointer',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '160px', // Ensure consistent card height
                border: `1px solid ${color}55`, // Subtle border with accent color
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = `0 8px 16px ${color}44`;
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '1.4em', color: color }}>{title}</h3>
                <span style={{ fontSize: '2em', color: color }}>{icon}</span>
            </div>
            <p style={{ fontSize: '0.9em', color: '#bbb', lineHeight: '1.4' }}>{description}</p>
        </div>
    );
};
