import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseConfig';
import LoadingLogo from '../src/components/LoadingLogo';
import Avatar from '../src/components/Avatar';
import ErrorBoundary from '../src/components/ErrorBoundary';

const SPORTS_OPTIONS = [
  'Football', 'Basketball', 'Baseball', 'Soccer', 'Track & Field / Cross Country',
  'Volleyball', 'Softball', 'Swimming & Diving', 'Tennis', 'Golf', 'Other'
];

const NIL_INTERESTS_OPTIONS = [
  'Apparel & Footwear', 'Food & Beverage', 'Technology & Apps', 'Fitness & Wellness',
  'Automotive', 'Gaming', 'Financial Services', 'Retail', 'Hospitality & Travel',
  'Media & Entertainment', 'Other'
];

export default function FindAthletes() {
  const [user, setUser] = useState(null);
  const [allAthletes, setAllAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState('');
  const [selectedNILInterest, setSelectedNILInterest] = useState('');

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().userType !== 'business') {
          router.push('/dashboard');
          return;
        }

        const athletesCollectionRef = collection(db, 'users');
        const q = query(athletesCollectionRef, where('userType', '==', 'athlete'));
        const querySnapshot = await getDocs(q);
        const athletesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllAthletes(athletesList);
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const displayedAthletes = useMemo(() => {
    return allAthletes.filter(athlete => {
      const matchesSearch = (athlete.firstName && athlete.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            (athlete.lastName && athlete.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            (athlete.universityCollege && athlete.universityCollege.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesSport = selectedSport
        ? (athlete.sports && athlete.sports.includes(selectedSport))
        : true;
      
      const matchesUniversity = selectedUniversity
        ? (athlete.universityCollege && athlete.universityCollege.toLowerCase().includes(selectedUniversity.toLowerCase()))
        : true;

      const matchesNILInterest = selectedNILInterest
        ? (athlete.nilInterests && athlete.nilInterests.includes(selectedNILInterest))
        : true;

      return matchesSearch && matchesSport && matchesUniversity && matchesNILInterest;
    });
  }, [allAthletes, searchTerm, selectedSport, selectedUniversity, selectedNILInterest]);


  if (loading) {
    return <LoadingLogo size="100px" />;
  }

  if (!user) {
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
          <h1 style={{ color: '#007bff', textAlign: 'center', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Find Athletes</h1>
          <p style={{ color: '#aaa', textAlign: 'center' }}>Browse athletes looking for NIL partnerships.</p>

          <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #333' }}>
            <input
              type="text"
              placeholder="Search by Name or University..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #555', backgroundColor: '#333', borderRadius: '4px', color: '#e0e0e0', marginBottom: '10px' }}
            />
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                style={{ flex: '1', minWidth: '150px', padding: '10px', border: '1px solid #555', backgroundColor: '#333', borderRadius: '4px', color: '#e0e0e0' }}
              >
                <option value="">All Sports</option>
                {SPORTS_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Filter by University..."
                value={selectedUniversity}
                onChange={(e) => setSelectedUniversity(e.target.value)}
                style={{ flex: '1', minWidth: '150px', padding: '10px', border: '1px solid #555', backgroundColor: '#333', borderRadius: '4px', color: '#e0e0e0' }}
              />
              <select
                value={selectedNILInterest}
                onChange={(e) => setSelectedNILInterest(e.target.value)}
                style={{ flex: '1', minWidth: '150px', padding: '10px', border: '1px solid #555', backgroundColor: '#333', borderRadius: '4px', color: '#e0e0e0' }}
              >
                <option value="">All NIL Interests</option>
                {NIL_INTERESTS_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          {displayedAthletes.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#aaa' }}>No athletes found matching your criteria.</p>
          ) : (
            <div style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
              {displayedAthletes.map(athlete => (
                <div
                  key={athlete.id}
                  onClick={() => router.push(`/public-athlete-profile/${athlete.id}`)}
                  style={{
                    border: '1px solid #333',
                    padding: '15px',
                    borderRadius: '12px',
                    backgroundColor: '#2a2a2a',
                    cursor: 'pointer',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    transition: 'transform 0.2s ease-in-out',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <Avatar
                    url={athlete.profileImageUrl}
                    name={`${athlete.firstName} ${athlete.lastName}`}
                    size="medium"
                  />
                  <div>
                    <h2 style={{ margin: '0 0 5px 0', color: '#e0e0e0', fontSize: '1.1em' }}>{athlete.firstName} {athlete.lastName}</h2>
                    <p style={{ margin: '0', fontSize: '0.9em', color: '#aaa' }}><strong>Sport(s):</strong> {athlete.sports && athlete.sports.length > 0 ? athlete.sports.join(', ') : 'N/A'}</p>
                    <p style={{ margin: '0', fontSize: '0.9em', color: '#aaa' }}><strong>University:</strong> {athlete.universityCollege || 'N/A'}</p>
                    <p style={{ margin: '0', fontSize: '0.9em', color: '#aaa' }}><strong>NIL Interests:</strong> {athlete.nilInterests && athlete.nilInterests.length > 0 ? athlete.nilInterests.join(', ') : 'N/A'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => router.push('/dashboard')}
            style={{
              marginTop: '30px',
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1em',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              transition: 'background-color 0.2s',
              alignSelf: 'center',
              width: 'fit-content'
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