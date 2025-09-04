import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebaseConfig';
import LoadingLogo from '../../src/components/LoadingLogo';
import Avatar from '../../src/components/Avatar';
import ErrorBoundary from '../../src/components/ErrorBoundary';

export default function PublicAthleteProfile() {
    const [currentUser, setCurrentUser] = useState(null);
    const [currentUserData, setCurrentUserData] = useState(null);
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
            
            const currentUserDocRef = doc(db, 'users', user.uid);
            const currentUserDocSnap = await getDoc(currentUserDocRef);
            if(currentUserDocSnap.exists()) {
                setCurrentUserData(currentUserDocSnap.data());
            }

            if (uid) {
                if (user && uid === user.uid) {
                    router.push('/athlete-profile');
                    return;
                }

                const athleteDocRef = doc(db, 'users', uid);
                const athleteDocSnap = await getDoc(athleteDocRef);

                if (athleteDocSnap.exists() && athleteDocSnap.data().userType === 'athlete') {
                    setProfileData(athleteDocSnap.data());
                } else {
                    console.log('No athlete profile document found for UID:', uid);
                    setProfileData(null);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router, uid]);

    const getChatId = (user1Id, user2Id) => {
        return [user1Id, user2Id].sort().join('_');
    };

    const displayField = (value) => value || 'N/A';
    const displayList = (list) => (list && list.length > 0 ? list.join(', ') : 'N/A');

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

    if (loading) {
        return <LoadingLogo size="100px" />;
    }

    if (!profileData) {
        return (
            <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#1e1e1e', color: '#e0e0e0', fontFamily: 'Inter, sans-serif' }}>
                <p>Athlete profile not found or is invalid.</p>
                <button onClick={() => router.push('/find-athletes')} style={{ marginTop: '20px', padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Back to Find Athletes</button>
            </div>
        );
    }

    return (
      <ErrorBoundary>
        <div style={{
            fontFamily: 'Inter, sans-serif',
            backgroundColor: '#0a0a0a',
            color: '#e0e0e0',
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
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
                <h1 style={{ color: '#007bff', textAlign: 'center', marginBottom: '15px' }}>{profileData.firstName}'s Athlete Profile</h1>
                
                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                    <Avatar
                        url={profileData.profileImageUrl}
                        name={`${profileData.firstName} ${profileData.lastName}`}
                        size="large"
                    />
                </div>

                <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                    <h2 style={{ color: '#007bff', fontSize: '1.5em', marginBottom: '15px' }}>Personal Details</h2>
                    <p style={{ margin: '5px 0' }}><strong>Name:</strong> {displayField(profileData.firstName)} {displayField(profileData.lastName)}</p>
                    <p style={{ margin: '5px 0' }}><strong>Email:</strong> {displayField(profileData.email)}</p>
                    <p style={{ margin: '5px 0' }}><strong>University/College:</strong> {displayField(profileData.universityCollege)}</p>
                    <p style={{ margin: '5px 0' }}><strong>Sport(s):</strong> {displayList(profileData.sports)}</p>
                </div>

                <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                    <h2 style={{ color: '#007bff', fontSize: '1.5em', marginBottom: '15px' }}>About Me (Interests)</h2>
                    <p>{displayField(profileData.bio)}</p>
                </div>

                <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                    <h2 style={{ color: '#007bff', fontSize: '1.5em', marginBottom: '15px' }}>Achievements & Socials</h2>
                    <p style={{ margin: '5px 0' }}><strong>Achievements/Stats:</strong> {displayField(profileData.achievementsStats)}</p>
                    <p style={{ margin: '5px 0' }}><strong>Social Media:</strong> {displaySocialMediaLinks(profileData.socialMediaLinks)}</p>
                </div>

                <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                    <h2 style={{ color: '#007bff', fontSize: '1.5em', marginBottom: '15px' }}>NIL Interests</h2>
                    <p>{displayList(profileData.nilInterests)}</p>
                </div>

                <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {currentUserData?.userType === 'business' && (
                        <>
                        <button
                            onClick={() => router.push(`/chat/${getChatId(currentUser.uid, uid)}`)}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '1em',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
                        >
                            Message {profileData.firstName}
                        </button>
                        <button
                            onClick={() => router.push(`/propose-deal/${uid}`)}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#ffaa00',
                                color: 'black',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '1em',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e09800'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffaa00'}
                        >
                            Propose Deal
                        </button>
                        </>
                    )}
                    <button
                        onClick={() => router.push('/find-athletes')}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '1em',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
                    >
                        Back to Find Athletes
                    </button>
                </div>
            </div>
        </div>
      </ErrorBoundary>
    );
}