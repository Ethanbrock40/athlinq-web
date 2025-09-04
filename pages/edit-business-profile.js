import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, db, app } from '../lib/firebaseConfig';
import LoadingLogo from '../src/components/LoadingLogo'; // NEW: Import LoadingLogo
import Avatar from '../src/components/Avatar'; // NEW: Import the Avatar component

export default function EditBusinessProfile() {
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
        businessLogo: null,
        businessLogoUrl: '',
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
                        businessLogo: null,
                        businessLogoUrl: data.businessLogoUrl || '',
                    });
                } else {
                    setProfileData(prev => ({
                        ...prev,
                        companyName: currentUser.email.split('@')[0],
                        businessLogoUrl: ''
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

            if (dataToSave.industrySector && dataToSave.industrySector.includes('Other') && dataToSave.industrySectorOther) {
                dataToSave.industrySector = dataToSave.industrySector.filter(s => s !== 'Other').concat([dataToSave.industrySectorOther]);
            }
            delete dataToSave.industrySectorOther;

            if (dataToSave.typesOfDealsOffered && dataToSave.typesOfDealsOffered.includes('Other') && dataToSave.typesOfDealsOfferedOther) {
                dataToSave.typesOfDealsOffered = dataToSave.typesOfDealsOffered.filter(d => d !== 'Other').concat([dataToSave.typesOfDealsOfferedOther]);
            }
            delete dataToSave.typesOfDealsOfferedOther;

            await updateDoc(userDocRef, dataToSave);
            setSuccessMessage('Profile updated successfully!');
            router.push('/business-profile');
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
        return <LoadingLogo size="100px" />;
    }

    if (!user) {
        return null;
    }

    const isProfileComplete = profileData.companyName && 
                              profileData.companyWebsite && 
                              profileData.aboutCompany &&
                              profileData.industrySector && profileData.industrySector.length > 0;

    return (
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
                <h1 style={{ textAlign: 'center', color: '#007bff', marginBottom: '20px' }}>Edit Your Business Profile</h1>

                {!isProfileComplete && (
                    <div style={{
                        backgroundColor: '#ffc10720',
                        border: '1px solid #ffc107',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        color: '#ffc107'
                    }}>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>👋 Welcome! Please complete your profile!</p>
                        <p style={{ margin: '5px 0 0 0', fontSize: '0.9em' }}>
                            Filling out your details helps athletes find you for NIL deals.
                        </p>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
                    <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                        <h2 style={{ color: '#007bff', fontSize: '1.5em', marginBottom: '15px' }}>Business Logo</h2>
                        <label htmlFor="businessLogo" style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                            Upload New Logo:
                        </label>
                        <input type="file" id="businessLogo" name="businessLogo" accept="image/*" onChange={handleChange} style={{ backgroundColor: '#333', border: '1px solid #555', borderRadius: '4px', padding: '8px', color: '#e0e0e0', width: '100%' }} />

                        {(profileData.businessLogo || profileData.businessLogoUrl) && (
                          <div style={{ marginTop: '20px', textAlign: 'center' }}>
                            <h4 style={{ margin: '0 0 10px 0' }}>{profileData.businessLogo ? 'Logo Preview' : 'Current Business Logo'}:</h4>
                            <Avatar
                              url={profileData.businessLogo ? URL.createObjectURL(profileData.businessLogo) : profileData.businessLogoUrl}
                              name={profileData.companyName}
                              size="large"
                            />
                            {uploading && <p style={{ color: '#007bff', marginTop: '10px' }}>Uploading: {Math.round(uploadProgress)}%</p>}
                          </div>
                        )}
                        {uploadError && <p style={{ color: 'red', marginTop: '10px' }}>{uploadError}</p>}
                    </div>

                    <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                        <h2 style={{ color: '#007bff', fontSize: '1.5em', marginBottom: '15px' }}>Company Details</h2>
                        <label htmlFor="companyName" style={{ display: 'block', marginBottom: '5px' }}>Company Name:</label>
                        <input type="text" id="companyName" name="companyName" value={profileData.companyName} onChange={handleChange} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#e0e0e0', width: '100%', marginBottom: '10px' }} />

                        <label htmlFor="companyWebsite" style={{ display: 'block', marginBottom: '5px' }}>Company Website Link:</label>
                        <input type="url" id="companyWebsite" name="companyWebsite" value={profileData.companyWebsite} onChange={handleChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#e0e0e0', width: '100%', marginBottom: '10px' }} placeholder="e.g., https://www.yourcompany.com" />

                        <label htmlFor="industrySector" style={{ display: 'block', marginBottom: '5px' }}>Industry Sector:</label>
                        <select multiple id="industrySector" name="industrySector" value={profileData.industrySector} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #555', backgroundColor: '#333', borderRadius: '4px', color: '#e0e0e0', minHeight: '100px', marginBottom: '10px' }}>
                            {INDUSTRY_SECTOR_OPTIONS.map(option => (<option key={option} value={option}>{option}</option>))}
                        </select>
                        <small style={{ color: '#aaa', display: 'block', marginBottom: '10px' }}>Hold Ctrl (or Cmd on Mac) to select multiple sectors.</small>
                        {profileData.industrySector && profileData.industrySector.includes('Other') && (
                            <div style={{ marginBottom: '10px' }}>
                                <label htmlFor="industrySectorOther" style={{ display: 'block', marginBottom: '5px' }}>Specify Other Industry Sector:</label>
                                <input type="text" id="industrySectorOther" name="industrySectorOther" value={profileData.industrySectorOther} onChange={handleChange} required style={{ width: '100%', padding: '8px', border: '1px solid #555', backgroundColor: '#333', borderRadius: '4px', color: '#e0e0e0' }} />
                            </div>
                        )}
                    </div>

                    <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                        <h2 style={{ color: '#007bff', fontSize: '1.5em', marginBottom: '15px' }}>About Us</h2>
                        <label htmlFor="aboutCompany" style={{ display: 'block', marginBottom: '5px' }}>About Your Company:</label>
                        <textarea id="aboutCompany" name="aboutCompany" value={profileData.aboutCompany} onChange={handleChange} rows="5" style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#e0e0e0', minHeight: '100px', width: '100%' }} />
                    </div>

                    <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                        <h2 style={{ color: '#007bff', fontSize: '1.5em', marginBottom: '15px' }}>Contact & Deal Interests</h2>
                        <label htmlFor="contactPerson" style={{ display: 'block', marginBottom: '5px' }}>Contact Person Name:</label>
                        <input type="text" id="contactPerson" name="contactPerson" value={profileData.contactPerson} onChange={handleChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#e0e0e0', width: '100%', marginBottom: '10px' }} />

                        <label htmlFor="typesOfDealsOffered" style={{ display: 'block', marginBottom: '5px' }}>Types of Deals Offered:</label>
                        <select multiple id="typesOfDealsOffered" name="typesOfDealsOffered" value={profileData.typesOfDealsOffered} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #555', backgroundColor: '#333', borderRadius: '4px', color: '#e0e0e0', minHeight: '100px', marginBottom: '10px' }}>
                            {DEAL_TYPES_OFFERED_OPTIONS.map(option => (<option key={option} value={option}>{option}</option>))}
                        </select>
                        <small style={{ color: '#aaa', display: 'block', marginBottom: '10px' }}>Hold Ctrl (or Cmd on Mac) to select multiple deal types.</small>
                        {profileData.typesOfDealsOffered.includes('Other') && (
                            <div style={{ marginBottom: '10px' }}>
                                <label htmlFor="typesOfDealsOfferedOther" style={{ display: 'block', marginBottom: '5px' }}>Specify Other Deal Type:</label>
                                <input type="text" id="typesOfDealsOfferedOther" name="typesOfDealsOfferedOther" value={profileData.typesOfDealsOfferedOther} onChange={handleChange} required style={{ width: '100%', padding: '8px', border: '1px solid #555', backgroundColor: '#333', borderRadius: '4px', color: '#e0e0e0' }} />
                            </div>
                        )}
                    </div>

                    <button type="submit" disabled={uploading} style={{ backgroundColor: '#007bff', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', opacity: uploading ? 0.7 : 1, fontSize: '1em' }}>
                        {uploading ? `Updating... (${Math.round(uploadProgress)}%)` : 'Update Profile'}
                    </button>
                    {uploadError && <p style={{ color: 'red', marginTop: '10px' }}>{uploadError}</p>}
                    {successMessage && <p style={{ color: 'green', marginTop: '10px' }}>{successMessage}</p>}
                </form>
                <button onClick={() => router.push('/business-profile')} style={{ marginTop: '20px', padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '1em' }}>
                    Back to Profile
                </button>
            </div>
        </div>
    );
}

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