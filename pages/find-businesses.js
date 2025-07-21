// pages/find-businesses.js
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseConfig';

// --- Dropdown Options (Copied from edit-business-profile for consistency) ---
const INDUSTRY_SECTOR_OPTIONS = [
  'Apparel & Footwear', 'Food & Beverage', 'Technology & Apps', 'Fitness & Wellness',
  'Automotive', 'Gaming', 'Financial Services', 'Retail', 'Hospitality & Travel',
  'Media & Entertainment', 'Other'
];

const DEAL_TYPES_OFFERED_OPTIONS = [
  'Social Media Endorsements', 'Product Gifting', 'Appearances/Events', 'Autograph Signings',
  'Licensing Deals (Merchandise)', 'Camps/Clinics', 'Charitable Partnerships',
  'Content Creation', 'Brand Ambassador Programs', 'Consulting/Advisory Roles', 'Other'
];
// --- End Dropdown Options ---

export default function FindBusinesses() {
  const [user, setUser] = useState(null);
  const [allBusinesses, setAllBusinesses] = useState([]); // Stores all fetched businesses
  const [loading, setLoading] = useState(true);
  
  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedDealType, setSelectedDealType] = useState('');

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().userType !== 'athlete') {
          router.push('/dashboard');
          return;
        }

        const businessesCollectionRef = collection(db, 'users');
        const q = query(businessesCollectionRef, where('userType', '==', 'business'));
        const querySnapshot = await getDocs(q);
        const businessesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllBusinesses(businessesList); // Store all businesses
      } else {
        router.push('/login'); // Redirect to login if not authenticated
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Determine if any search/filter criteria are active
  const hasActiveSearchOrFilter = searchTerm.trim() !== '' || 
                                  selectedIndustry !== '' || 
                                  selectedDealType !== '';

  const filteredBusinesses = useMemo(() => {
    // If no search/filter active, return an empty array
    if (!hasActiveSearchOrFilter) {
      return [];
    }

    // Otherwise, apply filters
    return allBusinesses.filter(business => {
      const matchesSearch = business.companyName 
        ? business.companyName.toLowerCase().includes(searchTerm.toLowerCase())
        : false;

      const matchesIndustry = selectedIndustry 
        ? (business.industrySector && business.industrySector.includes(selectedIndustry))
        : true;

      const matchesDealType = selectedDealType
        ? (business.typesOfDealsOffered && business.typesOfDealsOffered.includes(selectedDealType))
        : true;

      return matchesSearch && matchesIndustry && matchesDealType;
    });
  }, [allBusinesses, searchTerm, selectedIndustry, selectedDealType, hasActiveSearchOrFilter]); // Added hasActiveSearchOrFilter to dependencies


  if (loading) {
    return <p>Loading businesses...</p>;
  }

  if (!user) {
    return null;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9', color: '#333' }}>
      <h1 style={{ color: '#007bff' }}>Find Businesses</h1>
      <p>Browse companies looking for NIL partnerships.</p>

      {/* Search and Filter Controls */}
      <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
        <input
          type="text"
          placeholder="Search by Company Name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            style={{ flex: '1', minWidth: '150px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="">All Industries</option>
            {INDUSTRY_SECTOR_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select
            value={selectedDealType}
            onChange={(e) => setSelectedDealType(e.target.value)}
            style={{ flex: '1', minWidth: '150px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="">All Deal Types</option>
            {DEAL_TYPES_OFFERED_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Conditional display based on whether filters are active */}
      {!hasActiveSearchOrFilter ? (
        <p>Enter a search term or select filters to find businesses.</p>
      ) : filteredBusinesses.length === 0 ? (
        <p>No businesses found matching your criteria.</p>
      ) : (
        <div style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
          {filteredBusinesses.map(business => (
            <Link key={business.id} href={`/public-business-profile/${business.id}`} passHref>
              <div 
                style={{ 
                  border: '1px solid #ddd', 
                  padding: '15px', 
                  borderRadius: '8px', 
                  backgroundColor: '#fff', 
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s ease-in-out',
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>{business.companyName || 'Unnamed Business'}</h2>
                <p><strong>Industry:</strong> {business.industrySector && business.industrySector.length > 0 ? business.industrySector.join(', ') : 'N/A'}</p>
                <p><strong>About:</strong> {business.aboutCompany || 'N/A'}</p>
                {business.companyWebsite && <p><a href={business.companyWebsite} target="_blank" rel="noopener noreferrer">Website</a></p>}
                <p><strong>Deals Offered:</strong> {business.typesOfDealsOffered && business.typesOfDealsOffered.length > 0 ? business.typesOfDealsOffered.join(', ') : 'N/A'}</p>
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