// pages/business-profile.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged, updateProfile } from 'firebase/auth'; // updateProfile might not be strictly needed for business but good to have
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, db, app } from '../lib/firebaseConfig'; // Ensure 'app' is imported

export default function BusinessProfile() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileData, setProfileData] = useState({
        companyName: '',
        companyWebsite: '',
        aboutCompany: '',
        industrySector: [],
        industrySectorOther: '',
        contactPerson: '',
        typesOfDealsOffered: [],
        typesOfDealsOfferedOther: '',
        businessLogo: null, // State for selected logo file
        businessLogoUrl: '', // State to hold the URL after upload (or existing)
    });
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const data = userDocSnap.data();
                    setProfileData({
                        companyName: data.companyName || '',
                        companyWebsite: data.companyWebsite || '',
                        aboutCompany: data.aboutCompany || '',
                        industrySector: data.industrySector || [],
                        industrySectorOther: data.industrySectorOther || '',
                        contactPerson: data.contactPerson || '',
                        typesOfDealsOffered: data.typesOfDealsOffered || [],
                        typesOfDealsOfferedOther: data.typesOfDealsOfferedOther || '',
                        businessLogo: null, // Reset file input
                        businessLogoUrl: data.businessLogoUrl || '', // Load existing URL
                    });
                }
            } else {
                router.push('/login');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        if (type === 'file') {
            setProfileData(prevData => ({ ...prevData, [name]: e.target.files && e.target.files.length > 0 ? e.target.files[0] : null }));
        } else if (name === 'industrySector' || name === 'typesOfDealsOffered') {
            const selectedOptions = Array.from(e.target.options)
                                     .filter(option => option.selected)
                                     .map(option => option.value);
            setProfileData(prevData => ({ ...prevData, [name]: selectedOptions }));
        } else {
            setProfileData(prevData => ({ ...prevData, [name]: value }));
        }
    };

    const uploadLogoToFirebase = async (logoFile) => {
        setUploadError(null);
        if (!logoFile) return null;

        const storage = getStorage(app);
        const storageRef = ref(storage, `businesses/${user.uid}/businessLogo/${logoFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, logoFile);

        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                },
                (error) => {
                    console.error('Upload error:', error);
                    setUploadError('Error uploading logo.');
                    reject(error);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                }
            );
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);
        setUploadError(null);
        setSuccessMessage(null);

        const { businessLogo, ...restOfData } = profileData;
        let finalLogoUrl = profileData.businessLogoUrl;

        try {
            if (businessLogo) {
                finalLogoUrl = await uploadLogoToFirebase(businessLogo);
                if (!finalLogoUrl) {
                    throw new Error('Logo upload failed to return URL.');
                }
            }

            const userDocRef = doc(db, 'users', user.uid);
            const dataToSave = { ...restOfData, businessLogoUrl: finalLogoUrl };

            if (dataToSave.industrySector.includes('Other') && dataToSave.industrySectorOther) {
                dataToSave.industrySector = dataToSave.industrySector.filter(s => s !== 'Other').concat([dataToSave.industrySectorOther]);
            }
            delete dataToSave.industrySectorOther;

            if (dataToSave.typesOfDealsOffered.includes('Other') && dataToSave.typesOfDealsOfferedOther) {
                dataToSave.typesOfDealsOffered = dataToSave.typesOfDealsOffered.filter(d => d !== 'Other').concat([dataToSave.typesOfDealsOfferedOther]);
            }
            delete dataToSave.typesOfDealsOfferedOther;

            await updateDoc(userDocRef, dataToSave);
            setSuccessMessage('Profile updated successfully!');
            router.push('/dashboard');
        } catch (error) {
            console.error('Error updating profile:', error);
            setUploadError('Failed to update profile: ' + error.message);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

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

    if (loading) {
        return <p>Loading profile...</p>;
    }

    if (!user) {
        return null;
    }

    return (
        <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
            <h1 style={{ textAlign: 'center', color: '#007bff', marginBottom: '20px' }}>Edit Your Business Profile</h1>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
                {/* File Upload Field for Logo */}
                <label htmlFor="businessLogo" style={{ fontWeight: 'bold' }}>
                    Business Logo:
                </label>
                <input type="file" id="businessLogo" name="businessLogo" accept="image/*" onChange={handleChange} />

                {/* Logo Preview and Upload Progress */}
                {profileData.businessLogo && (
                    <div>
                        <h4 style={{ marginTop: '10px' }}>Logo Preview:</h4>
                        <img src={URL.createObjectURL(profileData.businessLogo)} alt="Logo Preview" style={{ maxWidth: '150px', height: 'auto', border: '1px solid #ddd' }} />
                        {uploading && <p>Uploading: {Math.round(uploadProgress)}%</p>}
                    </div>
                )}
                {profileData.businessLogoUrl && !profileData.businessLogo && (
                    <div>
                        <h4 style={{ marginTop: '10px' }}>Current Business Logo:</h4>
                        <img src={profileData.businessLogoUrl} alt="Current Logo" style={{ maxWidth: '150px', height: 'auto', border: '1px solid #ddd' }} />
                    </div>
                )}

                <label htmlFor="companyName">Company Name:</label>
                <input type="text" id="companyName" name="companyName" value={profileData.companyName} onChange={handleChange} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />

                <label htmlFor="companyWebsite">Company Website Link:</label>
                <input type="url" id="companyWebsite" name="companyWebsite" value={profileData.companyWebsite} onChange={handleChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} placeholder="e.g., https://www.yourcompany.com" />

                <label htmlFor="aboutCompany">About Your Company:</label>
                <textarea id="aboutCompany" name="aboutCompany" value={profileData.aboutCompany} onChange={handleChange} rows="5" style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minHeight: '100px' }} />

                {/* Industry Sector Dropdown */}
                <div>
                    <label htmlFor="industrySector" style={{ display: 'block', marginBottom: '5px' }}>Industry Sector:</label>
                    <select
                        id="industrySector"
                        name="industrySector"
                        multiple
                        value={profileData.industrySector}
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
                {profileData.industrySector.includes('Other') && (
                    <div>
                        <label htmlFor="industrySectorOther" style={{ display: 'block', marginBottom: '5px' }}>Specify Other Industry Sector:</label>
                        <input
                        type="text"
                        id="industrySectorOther"
                        name="industrySectorOther"
                        value={profileData.industrySectorOther}
                        onChange={handleChange}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }}
                        />
                    </div>
                )}

                <label htmlFor="contactPerson">Contact Person Name:</label>
                <input type="text" id="contactPerson" name="contactPerson" value={profileData.contactPerson} onChange={handleChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />

                {/* Types of Deals Offered Dropdown */}
                <div>
                    <label htmlFor="typesOfDealsOffered" style={{ display: 'block', marginBottom: '5px' }}>Types of Deals Offered:</label>
                    <select
                        id="typesOfDealsOffered"
                        name="typesOfDealsOffered"
                        multiple
                        value={profileData.typesOfDealsOffered}
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
                {profileData.typesOfDealsOffered.includes('Other') && (
                    <div>
                        <label htmlFor="typesOfDealsOfferedOther" style={{ display: 'block', marginBottom: '5px' }}>Specify Other Deal Type:</label>
                        <input
                        type="text"
                        id="typesOfDealsOfferedOther"
                        name="typesOfDealsOfferedOther"
                        value={profileData.typesOfDealsOfferedOther}
                        onChange={handleChange}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }}
                        />
                    </div>
                )}

                <button type="submit" disabled={uploading} style={{ backgroundColor: '#007bff', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', opacity: uploading ? 0.7 : 1 }}>
                    {uploading ? `Updating... (${Math.round(uploadProgress)}%)` : 'Update Profile'}
                </button>
                {uploadError && <p style={{ color: 'red' }}>{uploadError}</p>}
                {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
            </form>
            <button onClick={() => router.back()} style={{ marginTop: '20px', padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                Back to Dashboard
            </button>
        </div>
    );
}

// Dropdown options (moved inside component for easier access, but can be global)
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