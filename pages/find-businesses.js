import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseConfig';
import LoadingLogo from '../src/components/LoadingLogo';
import Avatar from '../src/components/Avatar';
import ErrorBoundary from '../src/components/ErrorBoundary';

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

export default function FindBusinesses() {
  const [user, setUser] = useState(null);
  const [allBusinesses, setAllBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
        setAllBusinesses(businessesList);
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const hasActiveSearchOrFilter = searchTerm.trim() !== '' ||
                                   selectedIndustry !== '' ||
                                   selectedDealType !== '';

  const filteredBusinesses = useMemo(() => {
    if (!hasActiveSearchOrFilter) {
      return allBusinesses;
    }

    return allBusinesses.filter(business => {
      const matchesSearch = business.companyName
        ? business.companyName.toLowerCase().includes(searchTerm.toLowerCase())
        : false;

      const matchesIndustry = selectedIndustry
        ? (Array.isArray(business.industrySector) && business.industrySector.includes(selectedIndustry))
        : true;

      const matchesDealType = selectedDealType
        ? (Array.isArray(business.typesOfDealsOffered) && business.typesOfDealsOffered.includes(selectedDealType))
        : true;

      return matchesSearch && matchesIndustry && matchesDealType;
    });
  }, [allBusinesses, searchTerm, selectedIndustry, selectedDealType, hasActiveSearchOrFilter]);


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
          <h1 style={{ color: '#007bff', textAlign: 'center', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Find Businesses</h1>
          <p style={{ color: '#aaa', textAlign: 'center' }}>Browse companies looking for NIL partnerships.</p>

          <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #333' }}>
            <input
              type="text"
              placeholder="Search by Company Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #555', backgroundColor: '#333', borderRadius: '4px', color: '#e0e0e0', marginBottom: '10px' }}
            />
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                style={{ flex: '1', minWidth: '150px', padding: '10px', border: '1px solid #555', backgroundColor: '#333', borderRadius: '4px', color: '#e0e0e0' }}
              >
                <option value="">All Industries</option>
                {INDUSTRY_SECTOR_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <select
                value={selectedDealType}
                onChange={(e) => setSelectedDealType(e.target.value)}
                style={{ flex: '1', minWidth: '150px', padding: '10px', border: '1px solid #555', backgroundColor: '#333', borderRadius: '4px', color: '#e0e0e0' }}
              >
                <option value="">All Deal Types</option>
                {DEAL_TYPES_OFFERED_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredBusinesses.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#aaa' }}>No businesses found matching your criteria.</p>
          ) : (
            <div style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
              {filteredBusinesses.map(business => (
                <Link key={business.id} href={`/public-business-profile/${business.id}`} passHref>
                  <div
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
                      url={business.businessLogoUrl}
                      name={business.companyName}
                      size="medium"
                    />
                    <div>
                      <h2 style={{ margin: '0 0 5px 0', color: '#e0e0e0', fontSize: '1.1em' }}>{business.companyName || 'Unnamed Business'}</h2>
                      <p style={{ margin: '0', fontSize: '0.9em', color: '#aaa' }}><strong>Industry:</strong> {Array.isArray(business.industrySector) && business.industrySector.length > 0 ? business.industrySector.join(', ') : 'N/A'}</p>
                      <p style={{ margin: '0', fontSize: '0.9em', color: '#aaa' }}><strong>Deals Offered:</strong> {Array.isArray(business.typesOfDealsOffered) && business.typesOfDealsOffered.length > 0 ? business.typesOfDealsOffered.join(', ') : 'N/A'}</p>
                    </div>
                  </div>
                </Link>
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