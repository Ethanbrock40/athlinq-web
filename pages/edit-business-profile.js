// pages/edit-business-profile.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseConfig';

// --- Dropdown Options ---
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

export default function EditBusinessProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    companyName: '',
    companyWebsite: '',
    aboutCompany: '',
    industrySector: [],
    industrySectorOther: '',
    contactPerson: '',
    typesOfDealsOffered: [],
    typesOfDealsOfferedOther: '',
    businessLogoUrl: '' // Placeholder for now
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // --- NEW LOGS START HERE ---
      console.log('EditBusinessProfile - onAuthStateChanged fired. currentUser:', currentUser);
      // --- NEW LOGS END HERE ---

      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        // --- NEW LOGS START HERE ---
        console.log('EditBusinessProfile - Firestore: userDocSnap.exists()', userDocSnap.exists());
        // --- NEW LOGS END HERE ---

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          // --- NEW LOGS START HERE ---
          console.log('EditBusinessProfile - Firestore: User document data:', data);
          console.log('EditBusinessProfile - Firestore: User type from document:', data.userType);
          // --- NEW LOGS END HERE ---

          // Redirect if not a business trying to edit business profile
          if (data.userType !== 'business') {
            router.push('/dashboard');
            return;
          }
          // Populate form with existing data
          setFormData({
            companyName: data.companyName || '',
            companyWebsite: data.companyWebsite || '',
            aboutCompany: data.aboutCompany || '',
            industrySector: data.industrySector || [],
            industrySectorOther: data.industrySectorOther || '',
            contactPerson: data.contactPerson || '',
            typesOfDealsOffered: data.typesOfDealsOffered || [],
            typesOfDealsOfferedOther: data.typesOfDealsOfferedOther || '',
            businessLogoUrl: data.businessLogoUrl || '',
            userType: data.userType // Ensure userType from Firestore is captured here
          });
        } else {
          console.log('EditBusinessProfile - No user profile document found for UID:', currentUser.uid);
          // If no profile data, initialize with email and company name from signup
          setFormData(prev => ({
            ...prev,
            email: currentUser.email,
            companyName: prev.companyName || currentUser.email.split('@')[0],
            userType: 'business' // Assume business if navigating to edit-business-profile and no document
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
    const { name, value, type, options } = e.target; // Removed 'checked' as it's not used in this specific form

    if (type === 'select-multiple') {
      const selectedOptions = Array.from(options)
        .filter(option => option.selected)
        .map(option => option.value);
      setFormData(prev => ({
        ...prev,
        [name]: selectedOptions
      }));
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

    const dataToSave = { ...formData };
    delete dataToSave.email;

    if (dataToSave.industrySector.includes('Other') && dataToSave.industrySectorOther) {
      dataToSave.industrySector = dataToSave.industrySector.filter(s => s !== 'Other').concat([dataToSave.industrySectorOther]);
    }
    if (dataToSave.typesOfDealsOffered.includes('Other') && dataToSave.typesOfDealsOfferedOther) {
      dataToSave.typesOfDealsOffered = dataToSave.typesOfDealsOffered.filter(d => d !== 'Other').concat([dataToSave.typesOfDealsOfferedOther]);
    }
    
    delete dataToSave.industrySectorOther;
    delete dataToSave.typesOfDealsOfferedOther;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, dataToSave);
      setSuccess('Profile updated successfully!');
      router.push('/business-profile'); 
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile: ' + err.message);
    }
  };

  // --- ADD THESE CONSOLE LOGS ---
  console.log('EditBusinessProfile - Render Check:');
  console.log('  - Loading:', loading);
  console.log('  - User:', user);
  console.log('  - User Data (formData.userType):', formData.userType);
  // --- END ADD THESE CONSOLE LOGS ---

  if (loading) {
    return <p>Loading profile editor...</p>;
  }

  if (!user || formData.userType !== 'business') {
    // This condition is likely causing the blank screen
    console.log('EditBusinessProfile - Component is returning null. Reasons:');
    console.log('  - !user (is null):', !user);
    console.log('  - formData.userType:', formData.userType);
    console.log('  - userType !== business:', formData.userType !== 'business');
    return null;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9', color: '#333' }}>
      <h1 style={{ color: '#007bff' }}>Edit Your Business Profile</h1>
      <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
        {/* Company Name and Email (read-only for now, updated via Auth/Signup) */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Company Name:</label>
          <input type="text" value={formData.companyName} readOnly style={{ width: '100%', padding: '8px', border: '1px solid #ddd', backgroundColor: '#eee' }} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
          <input type="text" value={user.email} readOnly style={{ width: '100%', padding: '8px', border: '1px solid #ddd', backgroundColor: '#eee' }} />
        </div>

        {/* Company Website */}
        <div>
          <label htmlFor="companyWebsite" style={{ display: 'block', marginBottom: '5px' }}>Company Website Link:</label>
          <input
            type="url"
            id="companyWebsite"
            name="companyWebsite"
            value={formData.companyWebsite}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }}
            placeholder="e.g., https://www.yourcompany.com"
          />
        </div>

        {/* About Company Section */}
        <div>
          <label htmlFor="aboutCompany" style={{ display: 'block', marginBottom: '5px' }}>About Your Company:</label>
          <textarea
            id="aboutCompany"
            name="aboutCompany"
            value={formData.aboutCompany}
            onChange={handleChange}
            rows="5"
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', resize: 'vertical' }}
          ></textarea>
        </div>

        {/* Industry Sector Dropdown */}
        <div>
          <label htmlFor="industrySector" style={{ display: 'block', marginBottom: '5px' }}>Industry Sector:</label>
          <select
            id="industrySector"
            name="industrySector"
            multiple
            value={formData.industrySector}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', minHeight: '100px' }}
          >
            {INDUSTRY_SECTOR_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <small style={{ color: '#666' }}>Hold Ctrl (or Cmd on Mac) to select multiple sectors.</small>
        </div>
        {/* Conditional "Other Industry Sector" input */}
        {formData.industrySector.includes('Other') && (
          <div>
            <label htmlFor="industrySectorOther" style={{ display: 'block', marginBottom: '5px' }}>Specify Other Industry Sector:</label>
            <input
              type="text"
              id="industrySectorOther"
              name="industrySectorOther"
              value={formData.industrySectorOther}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }}
            />
          </div>
        )}

        {/* Contact Person */}
        <div>
          <label htmlFor="contactPerson" style={{ display: 'block', marginBottom: '5px' }}>Contact Person Name:</label>
          <input
            type="text"
            id="contactPerson"
            name="contactPerson"
            value={formData.contactPerson}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }}
          />
        </div>

        {/* Types of Deals Offered Dropdown */}
        <div>
          <label htmlFor="typesOfDealsOffered" style={{ display: 'block', marginBottom: '5px' }}>Types of Deals Offered:</label>
          <select
            id="typesOfDealsOffered"
            name="typesOfDealsOffered"
            multiple
            value={formData.typesOfDealsOffered}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', minHeight: '100px' }}
          >
            {DEAL_TYPES_OFFERED_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <small style={{ color: '#666' }}>Hold Ctrl (or Cmd on Mac) to select multiple deal types.</small>
        </div>
        {/* Conditional "Other Deal Type" input */}
        {formData.typesOfDealsOffered.includes('Other') && (
          <div>
            <label htmlFor="typesOfDealsOfferedOther" style={{ display: 'block', marginBottom: '5px' }}>Specify Other Deal Type:</label>
            <input
              type="text"
              id="typesOfDealsOfferedOther"
              name="typesOfDealsOfferedOther"
              value={formData.typesOfDealsOfferedOther}
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
            onClick={() => router.push('/business-profile')} 
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