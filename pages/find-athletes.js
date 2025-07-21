// pages/find-athletes.js
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link'; // Import Link for navigation
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseConfig';

// --- Dropdown Options (Copied from edit-athlete-profile for consistency) ---
const SPORTS_OPTIONS = [
  'Football', 'Basketball', 'Baseball', 'Soccer', 'Track & Field / Cross Country',
  'Volleyball', 'Softball', 'Swimming & Diving', 'Tennis', 'Golf', 'Other'
];

const NIL_INTERESTS_OPTIONS = [
  'Apparel & Footwear', 'Food & Beverage', 'Technology & Apps', 'Fitness & Wellness',
  'Automotive', 'Gaming', 'Financial Services', 'Retail', 'Hospitality & Travel',
  'Media & Entertainment', 'Other'
];
// --- End Dropdown Options ---

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

  const filteredAthletes = useMemo(() => {
    return allAthletes.filter(athlete => {
      const matchesSearch = (athlete.firstName && athlete.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            (athlete.lastName && athlete.lastName.toLowerCase().includes(searchTerm.toLowerCase()));

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
    return <p>Loading athletes...</p>;
  }

  if (!user) {
    return null;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9', color: '#333' }}>
      <h1 style={{ color: '#007bff' }}>Find Athletes</h1>
      <p>Browse athletes looking for NIL partnerships.</p>

      {/* Search and Filter Controls */}
      <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
        <input
          type="text"
          placeholder="Search by Name or University..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <select
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
            style={{ flex: '1', minWidth: '150px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
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
            style={{ flex: '1', minWidth: '150px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <select
            value={selectedNILInterest}
            onChange={(e) => setSelectedNILInterest(e.target.value)}
            style={{ flex: '1', minWidth: '150px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="">All NIL Interests</option>
            {NIL_INTERESTS_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredAthletes.length === 0 ? (
        <p>No athletes found matching your criteria.</p>
      ) : (
        <div style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
          {filteredAthletes.map(athlete => (
            // Make the card clickable to the public profile
            <Link key={athlete.id} href={`/public-athlete-profile/${athlete.id}`} passHref>
              <div 
                style={{ 
                  border: '1px solid #ddd', 
                  padding: '15px', 
                  borderRadius: '8px', 
                  backgroundColor: '#fff', 
                  cursor: 'pointer', // Indicate it's clickable
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)', // Add subtle shadow
                  transition: 'transform 0.2s ease-in-out', // Smooth transition on hover
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>{athlete.firstName} {athlete.lastName}</h2>
                <p><strong>Sport(s):</strong> {athlete.sports && athlete.sports.length > 0 ? athlete.sports.join(', ') : 'N/A'}</p>
                <p><strong>University:</strong> {athlete.universityCollege || 'N/A'}</p>
                <p><strong>NIL Interests:</strong> {athlete.nilInterests && athlete.nilInterests.length > 0 ? athlete.nilInterests.join(', ') : 'N/A'}</p>
              </div>
            </Link>
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