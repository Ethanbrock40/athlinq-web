// pages/edit-athlete-profile.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router'; // <--- THIS IS THE CRUCIAL LINE
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseConfig';

// --- Dropdown Options (These will be used in the form) ---
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

export default function EditAthleteProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    universityCollege: '',
    sports: [],
    sportsOther: '',
    bio: '',
    socialMediaLinks: '',
    achievementsStats: '',
    nilInterests: [],
    nilInterestsOther: '',
    profilePictureUrl: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // --- NEW LOGS START HERE ---
      console.log('onAuthStateChanged fired. currentUser:', currentUser);
      // --- NEW LOGS END HERE ---

      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        // --- NEW LOGS START HERE ---
        console.log('Firestore: userDocSnap.exists()', userDocSnap.exists());
        // --- NEW LOGS END HERE ---

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          // --- NEW LOGS START HERE ---
          console.log('Firestore: User document data:', data);
          console.log('Firestore: User type from document:', data.userType);
          // --- NEW LOGS END HERE ---

          // Redirect if not an athlete trying to edit athlete profile
          if (data.userType !== 'athlete') {
            router.push('/dashboard');
            return;
          }
          // Populate form with existing data
          setFormData(prev => ({
              ...prev, // Keep existing state if any
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              universityCollege: data.universityCollege || '',
              sports: data.sports || [],
              sportsOther: data.sportsOther || '',
              bio: data.bio || '',
              socialMediaLinks: data.socialMediaLinks || '',
              achievementsStats: data.achievementsStats || '',
              nilInterests: data.nilInterests || [],
              nilInterestsOther: data.nilInterestsOther || '',
              profilePictureUrl: data.profilePictureUrl || '',
              userType: data.userType // Ensure userType from Firestore is captured here
          }));
        } else {
          console.log('No user profile document found for UID:', currentUser.uid);
          // If no profile data, initialize with email and placeholder names
          setFormData(prev => ({
            ...prev,
            email: currentUser.email,
            firstName: currentUser.email.split('@')[0],
            // IMPORTANT: If no Firestore document, ensure userType defaults correctly or is pulled from Auth context if possible
            // For now, it will use initial state of 'athlete' if no document exists
            userType: 'athlete' // Assume athlete if navigating to edit-athlete-profile and no document
          }));
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleChange = (e) => {
    const { name, value, type, checked, options } = e.target;

    if (type === 'select-multiple') {
      const selectedOptions = Array.from(options)
        .filter(option => option.selected)
        .map(option => option.value);
      setFormData(prev => ({
        ...prev,
        [name]: selectedOptions
      }));
    } else if (type === 'checkbox') {
        setFormData(prev => {
            const currentItems = new Set(prev[name]);
            if (checked) {
                currentItems.add(value);
            } else {
                currentItems.delete(value);
            }
            return { ...prev, [name]: Array.from(currentItems) };
        });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user) {
      setError('You must be logged in to save your profile.');
      return;
    }

    // Prepare data to send to Firestore
    const dataToSave = { ...formData };
    delete dataToSave.email; // Email is not editable here

    // Ensure sports and NIL interests include 'Other' input if selected
    if (dataToSave.sports.includes('Other') && dataToSave.sportsOther) {
      dataToSave.sports = dataToSave.sports.filter(s => s !== 'Other').concat([dataToSave.sportsOther]);
    }
    if (dataToSave.nilInterests.includes('Other') && dataToSave.nilInterestsOther) {
      dataToSave.nilInterests = dataToSave.nilInterests.filter(n => n !== 'Other').concat([dataToSave.nilInterestsOther]);
    }
    
    // Remove the 'Other' specific fields before saving to avoid duplicate storage
    delete dataToSave.sportsOther;
    delete dataToSave.nilInterestsOther;


    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, dataToSave);
      setSuccess('Profile updated successfully!');
      // Optionally redirect back to profile display page
      router.push('/athlete-profile'); 
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile: ' + err.message);
    }
  };

  // --- ADD THESE CONSOLE LOGS ---
  console.log('EditAthleteProfile - Loading:', loading);
  console.log('EditAthleteProfile - User:', user);
  console.log('EditAthleteProfile - User Data (formData.userType):', formData.userType);
  // --- END ADD THESE CONSOLE LOGS ---


  if (loading) {
    return <p>Loading profile editor...</p>;
  }

  if (!user || formData.userType !== 'athlete') {
    // These conditions make the component return null, resulting in a blank screen if met
    console.log('EditAthleteProfile - Component is returning null. Reasons:');
    console.log('  - !user (is null):', !user);
    console.log('  - formData.userType:', formData.userType);
    console.log('  - userType !== athlete:', formData.userType !== 'athlete');
    return null;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9', color: '#333' }}>
      <h1 style={{ color: '#007bff' }}>Edit Your Athlete Profile</h1>
      <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
        {/* Name and Email (read-only for now, updated via Auth/Signup) */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
          <input type="text" value={user.email} readOnly style={{ width: '100%', padding: '8px', border: '1px solid #ddd', backgroundColor: '#eee' }} />
        </div>
        
        {/* First Name & Last Name */}
        <div>
          <label htmlFor="firstName" style={{ display: 'block', marginBottom: '5px' }}>First Name:</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }}
          />
        </div>
        <div>
          <label htmlFor="lastName" style={{ display: 'block', marginBottom: '5px' }}>Last Name:</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }}
          />
        </div>

        {/* University/College */}
        <div>
          <label htmlFor="universityCollege" style={{ display: 'block', marginBottom: '5px' }}>University/College:</label>
          <input
            type="text"
            id="universityCollege"
            name="universityCollege"
            value={formData.universityCollege}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }}
          />
        </div>

        {/* Sport(s) Dropdown */}
        <div>
          <label htmlFor="sports" style={{ display: 'block', marginBottom: '5px' }}>Sport(s):</label>
          <select
            id="sports"
            name="sports"
            multiple // Allows multiple selections
            value={formData.sports}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', minHeight: '100px' }}
          >
            {SPORTS_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <small style={{ color: '#666' }}>Hold Ctrl (or Cmd on Mac) to select multiple sports.</small>
        </div>
        {/* Conditional "Other Sport" input */}
        {formData.sports.includes('Other') && (
          <div>
            <label htmlFor="sportsOther" style={{ display: 'block', marginBottom: '5px' }}>Specify Other Sport:</label>
            <input
              type="text"
              id="sportsOther"
              name="sportsOther"
              value={formData.sportsOther}
              onChange={handleChange}
              required // Make required if "Other" is selected
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }}
            />
          </div>
        )}

        {/* Bio Section */}
        <div>
          <label htmlFor="bio" style={{ display: 'block', marginBottom: '5px' }}>Bio (About Your Interests):</label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows="5"
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', resize: 'vertical' }}
          ></textarea>
        </div>

        {/* Social Media Links */}
        <div>
          <label htmlFor="socialMediaLinks" style={{ display: 'block', marginBottom: '5px' }}>Social Media Links (e.g., Instagram, Twitter, TikTok - comma-separated):</label>
          <input
            type="text"
            id="socialMediaLinks"
            name="socialMediaLinks"
            value={formData.socialMediaLinks}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }}
            placeholder="e.g., instagram.com/myprofile, twitter.com/myhandle"
          />
        </div>

        {/* Achievements/Stats */}
        <div>
          <label htmlFor="achievementsStats" style={{ display: 'block', marginBottom: '5px' }}>Achievements/Stats:</label>
          <textarea
            id="achievementsStats"
            name="achievementsStats"
            value={formData.achievementsStats}
            onChange={handleChange}
            rows="5"
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', resize: 'vertical' }}
          ></textarea>
        </div>

        {/* NIL Interests Dropdown */}
        <div>
          <label htmlFor="nilInterests" style={{ display: 'block', marginBottom: '5px' }}>NIL Interests:</label>
          <select
            id="nilInterests"
            name="nilInterests"
            multiple // Allows multiple selections
            value={formData.nilInterests}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', minHeight: '100px' }}
          >
            {NIL_INTERESTS_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <small style={{ color: '#666' }}>Hold Ctrl (or Cmd on Mac) to select multiple interests.</small>
        </div>
        {/* Conditional "Other NIL Interest" input */}
        {formData.nilInterests.includes('Other') && (
          <div>
            <label htmlFor="nilInterestsOther" style={{ display: 'block', marginBottom: '5px' }}>Specify Other NIL Interest:</label>
            <input
              type="text"
              id="nilInterestsOther"
              name="nilInterestsOther"
              value={formData.nilInterestsOther}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }}
            />
          </div>
        )}

        {/* Submit and Navigation Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button type="submit" style={{ flex: 1, padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Save Profile
          </button>
          <button
            type="button"
            onClick={() => router.push('/athlete-profile')}
            style={{ flex: 1, padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>

        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
        {success && <p style={{ color: 'green', marginTop: '10px' }}>{success}</p>}
      </form>
    </div>
  );
}