import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import Select from 'react-select';
import { auth, db } from '../lib/firebaseConfig';
import LoadingLogo from '../src/components/LoadingLogo';
import Avatar from '../src/components/Avatar';
import ErrorBoundary from '../src/components/ErrorBoundary';
import styles from '../src/components/FindAthletes.module.css';

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
  const [selectedUniversity, setSelectedUniversity] = useState(null);
  const [selectedSport, setSelectedSport] = useState(null);
  const [selectedNILInterest, setSelectedNILInterest] = useState('');
  const [schoolsList, setSchoolsList] = useState([]);
  const [sportsOptions, setSportsOptions] = useState([]);

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

        const schoolsCollectionRef = collection(db, 'schools');
        const schoolsSnapshot = await getDocs(query(schoolsCollectionRef));
        const schoolsOptions = schoolsSnapshot.docs.map(doc => ({
            value: doc.id,
            label: doc.id,
            sportsTeams: doc.data().sportsTeams
        }));
        setSchoolsList(schoolsOptions);

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

  const handleUniversityChange = (selectedOption) => {
    setSelectedUniversity(selectedOption);
    const teams = selectedOption ? selectedOption.sportsTeams.map(team => ({ value: team, label: team })) : [];
    setSportsOptions(teams);
    setSelectedSport(null);
  };

  const handleSportChange = (selectedOption) => {
    setSelectedSport(selectedOption);
  };

  // NEW: handleProposeTeamDeal function
  const handleProposeTeamDeal = () => {
    if (selectedUniversity && selectedSport) {
        console.log(`Proposing a deal to the ${selectedSport.label} team at ${selectedUniversity.label}`);
        // TODO: In the next step, we will add the logic to create the group chat
        alert(`Initiating a team deal for the ${selectedSport.label} team at ${selectedUniversity.label}`);
    } else {
        alert("Please select both a university and a sports team.");
    }
  };
  
  const displayedAthletes = useMemo(() => {
    return allAthletes.filter(athlete => {
      const matchesSearch = (athlete.firstName && athlete.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            (athlete.lastName && athlete.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            (athlete.universityCollege && athlete.universityCollege.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesSport = selectedSport
        ? (athlete.sports && athlete.sports.includes(selectedSport.value))
        : true;
      
      const matchesUniversity = selectedUniversity
        ? (athlete.universityCollege && athlete.universityCollege === selectedUniversity.value)
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
      <div className={styles['page-container']}>
        <div className={styles['content-card']}>
          <h1 className={styles['heading']}>Find Athletes</h1>
          <p className={styles['subheading']}>Browse athletes looking for NIL partnerships.</p>

          <div className={styles['filter-controls']}>
            <input
              type="text"
              placeholder="Search by Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles['text-input']}
            />
            <div className={styles['dropdown-group']}>
                <Select
                  options={schoolsList}
                  onChange={handleUniversityChange}
                  value={selectedUniversity}
                  isClearable={true}
                  isSearchable={true}
                  placeholder="Select University..."
                  className={styles['select-input']}
                />
                {selectedUniversity && (
                  <Select
                    options={sportsOptions}
                    onChange={handleSportChange}
                    value={selectedSport}
                    isClearable={true}
                    isSearchable={true}
                    placeholder="Select Team..."
                    className={styles['select-input']}
                  />
                )}
                <select
                  value={selectedNILInterest}
                  onChange={(e) => setSelectedNILInterest(e.target.value)}
                  className={styles['select-input']}
                >
                  <option value="">All NIL Interests</option>
                  {NIL_INTERESTS_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
            </div>
            {/* NEW: Propose Team Deal Button */}
            {selectedUniversity && selectedSport && (
              <button 
                onClick={handleProposeTeamDeal}
                className={styles['propose-team-button']}
              >
                Propose Team Deal
              </button>
            )}
          </div>

          {displayedAthletes.length === 0 ? (
            <p className={styles['no-results']}>No athletes found matching your criteria.</p>
          ) : (
            <div className={styles['athlete-grid']}>
              {displayedAthletes.map(athlete => (
                <div
                  key={athlete.id}
                  onClick={() => router.push(`/public-athlete-profile/${athlete.id}`)}
                  className={styles['athlete-card']}
                >
                  <Avatar
                    url={athlete.profileImageUrl}
                    name={`${athlete.firstName} ${athlete.lastName}`}
                    size="medium"
                  />
                  <div>
                    <h2 className={styles['athlete-name']}>{athlete.firstName} {athlete.lastName}</h2>
                    <p className={styles['athlete-detail']}><strong>Sport(s):</strong> {athlete.sports && athlete.sports.length > 0 ? athlete.sports.join(', ') : 'N/A'}</p>
                    <p className={styles['athlete-detail']}><strong>University:</strong> {athlete.universityCollege || 'N/A'}</p>
                    <p className={styles['athlete-detail']}><strong>NIL Interests:</strong> {athlete.nilInterests && athlete.nilInterests.length > 0 ? athlete.nilInterests.join(', ') : 'N/A'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => router.push('/dashboard')}
            className={styles['back-button']}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}