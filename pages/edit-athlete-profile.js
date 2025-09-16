import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, getDocs, query } from 'firebase/firestore'; 
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import Select from 'react-select'; 
import { auth, db, app } from '../lib/firebaseConfig';
import LoadingLogo from '../src/components/LoadingLogo'; 
import Avatar from '../src/components/Avatar'; 
import ErrorBoundary from '../src/components/ErrorBoundary';

export default function EditAthleteProfile() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [schoolsList, setSchoolsList] = useState([]); 
    const [sportsOptions, setSportsOptions] = useState([]); 
    const [profileData, setProfileData] = useState({
        firstName: '',
        lastName: '',
        universityCollege: '',
        sports: [],
        sportsOther: '',
        bio: '',
        socialMediaLinks: { // NEW: Social media links are now an object
            instagram: '',
            x: '',
            tiktok: '',
            linkedin: '',
        },
        achievementsStats: '',
        nilInterests: [],
        nilInterestsOther: '',
        profileImage: null,
        profileImageUrl: '',
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

                const schoolsCollectionRef = collection(db, 'schools');
                const schoolsSnapshot = await getDocs(query(schoolsCollectionRef));
                const schoolsOptions = schoolsSnapshot.docs.map(doc => ({
                    value: doc.id,
                    label: doc.id,
                    sportsTeams: doc.data().sportsTeams
                }));
                setSchoolsList(schoolsOptions);

                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const data = userDocSnap.data();
                    setProfileData({
                        firstName: data.firstName || '',
                        lastName: data.lastName || '',
                        universityCollege: data.universityCollege || '',
                        sports: data.sports || [],
                        sportsOther: data.sportsOther || '',
                        bio: data.bio || '',
                        socialMediaLinks: { // NEW: Check if object exists, otherwise initialize
                            instagram: data.socialMediaLinks?.instagram || '',
                            x: data.socialMediaLinks?.x || '',
                            tiktok: data.socialMediaLinks?.tiktok || '',
                            linkedin: data.socialMediaLinks?.linkedin || '',
                        },
                        achievementsStats: data.achievementsStats || '',
                        nilInterests: data.nilInterests || [],
                        nilInterestsOther: data.nilInterestsOther || '',
                        profileImage: null,
                        profileImageUrl: data.profileImageUrl || '',
                    });
                     // NEW: Set sports options based on existing university
                    const existingSchoolData = schoolsOptions.find(school => school.value === data.universityCollege);
                    if (existingSchoolData) {
                        const teams = existingSchoolData.sportsTeams.map(team => ({ value: team, label: team }));
                        setSportsOptions(teams);
                    }
                } else {
                    setProfileData(prev => ({
                        ...prev,
                        firstName: currentUser.email.split('@')[0],
                        profileImageUrl: currentUser.photoURL || ''
                    }));
                }
            } else {
                router.push('/login');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    // UPDATED: Handle change for nested social media links
    const handleChange = (e) => {
        const { name, value, type } = e.target;
        if (type === 'file') {
            setProfileData(prevData => ({ ...prevData, [name]: e.target.files && e.target.files.length > 0 ? e.target.files[0] : null }));
        } else if (name.includes('.')) { // Check for nested fields
            const [parent, child] = name.split('.');
            setProfileData(prevData => ({
                ...prevData,
                [parent]: {
                    ...prevData[parent],
                    [child]: value,
                },
            }));
        } else {
            setProfileData(prevData => ({ ...prevData, [name]: value }));
        }
    };
    
    const handleUniversityChange = (selectedOption) => {
        const selectedUniversityName = selectedOption ? selectedOption.value : '';
        const selectedSchoolData = schoolsList.find(school => school.value === selectedUniversityName);
        const teams = selectedSchoolData ? selectedSchoolData.sportsTeams.map(team => ({ value: team, label: team })) : [];
        setSportsOptions(teams);
        
        setProfileData(prevData => ({
            ...prevData,
            universityCollege: selectedUniversityName,
            sports: selectedUniversityName === '' ? [] : prevData.sports
        }));
    };

    const handleSportsChange = (selectedOptions) => {
        setProfileData(prevData => ({
            ...prevData,
            sports: selectedOptions ? selectedOptions.map(option => option.value) : []
        }));
    };
    
    const uploadImageToFirebase = async (imageFile) => {
        setUploadError(null);
        if (!imageFile) return null;

        const storage = getStorage(app);
        const storageRef = ref(storage, `athletes/${user.uid}/profileImage/${imageFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, imageFile);

        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                },
                (error) => {
                    console.error('Upload error:', error);
                    setUploadError('Error uploading image.');
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

        const { profileImage, ...restOfData } = profileData;
        let finalImageUrl = profileData.profileImageUrl;

        try {
            if (profileImage) {
                finalImageUrl = await uploadImageToFirebase(profileImage);
                if (!finalImageUrl) {
                    throw new Error('Image upload failed to return URL.');
                }
            }

            const userDocRef = doc(db, 'users', user.uid);
            const dataToSave = { ...restOfData, profileImageUrl: finalImageUrl };

            if (dataToSave.sports && dataToSave.sports.includes('Other') && dataToSave.sportsOther) {
                dataToSave.sports = dataToSave.sports.filter(s => s !== 'Other').concat([dataToSave.sportsOther]);
            }
            if (dataToSave.nilInterests && dataToSave.nilInterests.includes('Other') && dataToSave.nilInterestsOther) {
                dataToSave.nilInterests = dataToSave.nilInterests.filter(n => n !== 'Other').concat([dataToSave.nilInterestsOther]);
            }
            delete dataToSave.sportsOther;
            delete dataToSave.nilInterestsOther;

            await updateDoc(userDocRef, dataToSave);
            await updateProfile(auth.currentUser, {
                displayName: `${profileData.firstName} ${profileData.lastName}`,
                photoURL: finalImageUrl,
            });
            setSuccessMessage('Profile updated successfully!');
            router.push('/athlete-profile');
        } catch (error) {
            console.error('Error updating profile:', error);
            setUploadError('Failed to update profile: ' + error.message);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const NIL_INTERESTS_OPTIONS = [
        'Apparel & Footwear', 'Food & Beverage', 'Technology & Apps', 'Fitness & Wellness',
        'Automotive', 'Gaming', 'Financial Services', 'Retail', 'Hospitality & Travel',
        'Media & Entertainment', 'Other'
    ];

    if (loading) {
        return <LoadingLogo size="100px" />;
    }

    if (!user) {
        return null;
    }

    const isProfileComplete = profileData.universityCollege && 
                              profileData.sports && profileData.sports.length > 0 &&
                              profileData.bio;

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
                    <h1 style={{ textAlign: 'center', color: '#007bff', marginBottom: '20px' }}>Edit Your Athlete Profile</h1>

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
                                Filling out your details helps businesses find you for NIL deals.
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
                        <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                            <h2 style={{ color: '#007bff', fontSize: '1.5em', marginBottom: '15px' }}>Profile Picture</h2>
                            <label htmlFor="profileImage" style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                                Upload New Picture:
                            </label>
                            <input type="file" id="profileImage" name="profileImage" accept="image/*" onChange={handleChange} style={{ backgroundColor: '#333', border: '1px solid #555', borderRadius: '4px', padding: '8px', color: '#e0e0e0', width: '100%' }} />

                            {(profileData.profileImage || profileData.profileImageUrl) && (
                              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                <h4 style={{ margin: '0 0 10px 0' }}>{profileData.profileImage ? 'Image Preview' : 'Current Profile Picture'}:</h4>
                                <Avatar
                                  url={profileData.profileImage ? URL.createObjectURL(profileData.profileImage) : profileData.profileImageUrl}
                                  name={`${profileData.firstName} ${profileData.lastName}`}
                                  size="large"
                                />
                                {uploading && <p style={{ color: '#007bff', marginTop: '10px' }}>Uploading: {Math.round(uploadProgress)}%</p>}
                              </div>
                            )}
                            {uploadError && <p style={{ color: 'red', marginTop: '10px' }}>{uploadError}</p>}
                        </div>

                        <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                            <h2 style={{ color: '#007bff', fontSize: '1.5em', marginBottom: '15px' }}>Personal Details</h2>
                            <label htmlFor="firstName" style={{ display: 'block', marginBottom: '5px' }}>First Name:</label>
                            <input type="text" id="firstName" name="firstName" value={profileData.firstName} onChange={handleChange} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#e0e0e0', width: '100%', marginBottom: '10px' }} />

                            <label htmlFor="lastName" style={{ display: 'block', marginBottom: '5px' }}>Last Name:</label>
                            <input type="text" id="lastName" name="lastName" value={profileData.lastName} onChange={handleChange} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#e0e0e0', width: '100%', marginBottom: '10px' }} />

                            <label htmlFor="universityCollege" style={{ display: 'block', marginBottom: '5px' }}>University/College:</label>
                            <Select
                                id="universityCollege"
                                name="universityCollege"
                                options={schoolsList}
                                onChange={handleUniversityChange}
                                value={profileData.universityCollege ? { value: profileData.universityCollege, label: profileData.universityCollege } : null}
                                isClearable={true}
                                isSearchable={true}
                                placeholder="Select or type your university..."
                            />

                            {profileData.universityCollege && (
                              <>
                                <label htmlFor="sports" style={{ display: 'block', marginTop: '15px', marginBottom: '5px' }}>Sport(s):</label>
                                <Select
                                    isMulti
                                    id="sports"
                                    name="sports"
                                    options={sportsOptions}
                                    onChange={handleSportsChange}
                                    value={profileData.sports ? profileData.sports.map(sport => ({ value: sport, label: sport })) : []}
                                    isClearable={true}
                                    isSearchable={true}
                                    placeholder="Select your sport(s)..."
                                />
                              </>
                            )}

                        </div>

                        <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                            <h2 style={{ color: '#007bff', fontSize: '1.5em', marginBottom: '15px' }}>About Me (Interests)</h2>
                            <label htmlFor="bio" style={{ display: 'block', marginBottom: '5px' }}>Bio:</label>
                            <textarea id="bio" name="bio" value={profileData.bio} onChange={handleChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#e0e0e0', minHeight: '100px', width: '100%' }} />
                        </div>

                        <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                            <h2 style={{ color: '#007bff', fontSize: '1.5em', marginBottom: '15px' }}>Achievements & Socials</h2>
                            <label htmlFor="achievementsStats" style={{ display: 'block', marginBottom: '5px' }}>Achievements/Stats:</label>
                            <textarea id="achievementsStats" name="achievementsStats" value={profileData.achievementsStats} onChange={handleChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#e0e0e0', minHeight: '100px', width: '100%', marginBottom: '10px' }} />
                            
                            <label htmlFor="socialMediaLinks" style={{ display: 'block', marginBottom: '5px' }}>Social Media Links:</label>
                            <div style={{ display: 'grid', gap: '10px' }}>
                                <input type="text" name="socialMediaLinks.instagram" value={profileData.socialMediaLinks.instagram} onChange={handleChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#e0e0e0', width: '100%' }} placeholder="Instagram" />
                                <input type="text" name="socialMediaLinks.x" value={profileData.socialMediaLinks.x} onChange={handleChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#e0e0e0', width: '100%' }} placeholder="X (Twitter)" />
                                <input type="text" name="socialMediaLinks.tiktok" value={profileData.socialMediaLinks.tiktok} onChange={handleChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#e0e0e0', width: '100%' }} placeholder="TikTok" />
                                <input type="text" name="socialMediaLinks.linkedin" value={profileData.socialMediaLinks.linkedin} onChange={handleChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#e0e0e0', width: '100%' }} placeholder="LinkedIn" />
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                            <h2 style={{ color: '#007bff', fontSize: '1.5em', marginBottom: '15px' }}>NIL Interests</h2>
                            <label htmlFor="nilInterests" style={{ display: 'block', marginBottom: '5px' }}>NIL Interests:</label>
                            <select multiple id="nilInterests" name="nilInterests" value={profileData.nilInterests} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #555', backgroundColor: '#333', borderRadius: '4px', color: '#e0e0e0', minHeight: '100px', marginBottom: '10px' }}>
                                {NIL_INTERESTS_OPTIONS.map(option => (<option key={option} value={option}>{option}</option>))}
                            </select>
                            <small style={{ color: '#aaa', display: 'block', marginBottom: '10px' }}>Hold Ctrl (or Cmd on Mac) to select multiple interests.</small>
                            {profileData.nilInterests && profileData.nilInterests.includes('Other') && (
                                <div style={{ marginBottom: '10px' }}>
                                    <label htmlFor="nilInterestsOther" style={{ display: 'block', marginBottom: '5px' }}>Specify Other NIL Interest:</label>
                                    <input type="text" id="nilInterestsOther" name="nilInterestsOther" value={profileData.nilInterestsOther} onChange={handleChange} required style={{ width: '100%', padding: '8px', border: '1px solid #555', backgroundColor: '#333', borderRadius: '4px', color: '#e0e0e0' }} />
                                </div>
                            )}
                        </div>

                        <button type="submit" disabled={uploading} style={{ backgroundColor: '#007bff', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', opacity: uploading ? 0.7 : 1, fontSize: '1em' }}>
                            {uploading ? `Updating... (${Math.round(uploadProgress)}%)` : 'Update Profile'}
                        </button>
                        {uploadError && <p style={{ color: 'red', marginTop: '10px' }}>{uploadError}</p>}
                        {successMessage && <p style={{ color: 'green', marginTop: '10px' }}>{successMessage}</p>}
                    </form>
                    <button onClick={() => router.push('/athlete-profile')} style={{ marginTop: '20px', padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '1em' }}>
                        Back to Profile
                    </button>
                </div>
            </div>
        </ErrorBoundary>
    );
}

const NIL_INTERESTS_OPTIONS = [
    'Apparel & Footwear', 'Food & Beverage', 'Technology & Apps', 'Fitness & Wellness',
    'Automotive', 'Gaming',
    'Financial Services', 'Retail',
    'Hospitality & Travel', 'Media & Entertainment', 'Other'
];