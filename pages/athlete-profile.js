// pages/athlete-profile.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, db, app } from '../lib/firebaseConfig';

export default function AthleteProfile() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileData, setProfileData] = useState({
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
                        socialMediaLinks: data.socialMediaLinks || '',
                        achievementsStats: data.achievementsStats || '',
                        nilInterests: data.nilInterests || [],
                        nilInterestsOther: data.nilInterestsOther || '',
                        profileImage: null,
                        profileImageUrl: data.profileImageUrl || '',
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
        } else if (name === 'sports' || name === 'nilInterests') {
            const selectedOptions = Array.from(e.target.options)
                                     .filter(option => option.selected)
                                     .map(option => option.value);
            setProfileData(prevData => ({ ...prevData, [name]: selectedOptions }));
        } else {
            setProfileData(prevData => ({ ...prevData, [name]: value }));
        }
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

            if (dataToSave.sports.includes('Other') && dataToSave.sportsOther) {
              dataToSave.sports = dataToSave.sports.filter(s => s !== 'Other').concat([dataToSave.sportsOther]);
            }
            if (dataToSave.nilInterests.includes('Other') && dataToSave.nilInterestsOther) {
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
            router.push('/dashboard');
        } catch (error) {
            console.error('Error updating profile:', error);
            setUploadError('Failed to update profile: ' + error.message);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const SPORTS_OPTIONS = [
        'Football', 'Basketball', 'Baseball', 'Soccer', 'Track & Field / Cross Country',
        'Volleyball', 'Softball', 'Swimming & Diving', 'Tennis', 'Golf', 'Other'
    ];
    const NIL_INTERESTS_OPTIONS = [
        'Apparel & Footwear', 'Food & Beverage', 'Technology & Apps', 'Fitness & Wellness',
        'Automotive', 'Gaming', 'Financial Services', 'Retail', 'Hospitality & Travel',
        'Media & Entertainment', 'Other'
    ];


    if (loading) {
        return <p>Loading profile...</p>;
    }

    if (!user) {
        return null;
    }

    return (
        <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
            <h1 style={{ textAlign: 'center', color: '#007bff', marginBottom: '20px' }}>Edit Your Athlete Profile</h1>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
                {/* File Upload Field */}
                <label htmlFor="profileImage" style={{ fontWeight: 'bold' }}>
                    Profile Picture:
                </label>
                <input type="file" id="profileImage" name="profileImage" accept="image/*" onChange={handleChange} />

                {/* Image Preview and Upload Progress */}
                {profileData.profileImage && (
                    <div>
                        <h4 style={{ marginTop: '10px' }}>Image Preview:</h4>
                        <img src={URL.createObjectURL(profileData.profileImage)} alt="Profile Preview" style={{ maxWidth: '150px', height: 'auto', borderRadius: '50%', border: '1px solid #ddd' }} />
                        {uploading && <p>Uploading: {Math.round(uploadProgress)}%</p>}
                    </div>
                )}
                {profileData.profileImageUrl && !profileData.profileImage && (
                    <div>
                        <h4 style={{ marginTop: '10px' }}>Current Profile Picture:</h4>
                        <img src={profileData.profileImageUrl} alt="Current Profile" style={{ maxWidth: '150px', height: 'auto', borderRadius: '50%', border: '1px solid #ddd' }} />
                    </div>
                )}

                <label htmlFor="firstName">First Name:</label>
                <input type="text" id="firstName" name="firstName" value={profileData.firstName} onChange={handleChange} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />

                <label htmlFor="lastName">Last Name:</label>
                <input type="text" id="lastName" name="lastName" value={profileData.lastName} onChange={handleChange} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />

                {/* University/College */}
                <div>
                    <label htmlFor="universityCollege" style={{ display: 'block', marginBottom: '5px' }}>University/College:</label>
                    <input
                        type="text"
                        id="universityCollege"
                        name="universityCollege"
                        value={profileData.universityCollege}
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
                        multiple
                        value={profileData.sports}
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
                {profileData.sports && profileData.sports.includes('Other') && (
                    <div>
                        <label htmlFor="sportsOther" style={{ display: 'block', marginBottom: '5px' }}>Specify Other Sport:</label>
                        <input
                        type="text"
                        id="sportsOther"
                        name="sportsOther"
                        value={profileData.sportsOther}
                        onChange={handleChange}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }}
                        />
                    </div>
                )}

                <label htmlFor="bio">Bio:</label>
                <textarea id="bio" name="bio" value={profileData.bio} onChange={handleChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minHeight: '100px' }} />

                <h3 style={{ marginTop: '20px', color: '#555' }}>Social Media Links (comma-separated if multiple)</h3>
                <label htmlFor="socialMediaLinks">Links:</label>
                <input type="text" id="socialMediaLinks" name="socialMediaLinks" value={profileData.socialMediaLinks} onChange={handleChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} placeholder="e.g., instagram.com/..., twitter.com/..." />

                <label htmlFor="achievementsStats">Achievements/Stats:</label>
                <textarea id="achievementsStats" name="achievementsStats" value={profileData.achievementsStats} onChange={handleChange} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minHeight: '100px' }} />

                {/* NIL Interests Dropdown */}
                <div>
                    <label htmlFor="nilInterests" style={{ display: 'block', marginBottom: '5px' }}>NIL Interests:</label>
                    <select
                        id="nilInterests"
                        name="nilInterests"
                        multiple
                        value={profileData.nilInterests}
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
                {profileData.nilInterests && profileData.nilInterests.includes('Other') && (
                    <div>
                        <label htmlFor="nilInterestsOther" style={{ display: 'block', marginBottom: '5px' }}>Specify Other NIL Interest:</label>
                        <input
                        type="text"
                        id="nilInterestsOther"
                        name="nilInterestsOther"
                        value={profileData.nilInterestsOther}
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

const SPORTS_OPTIONS = [
    'Football', 'Basketball', 'Baseball', 'Soccer', 'Track & Field / Cross Country',
    'Volleyball', 'Softball', 'Swimming & Diving', 'Tennis', 'Golf', 'Other'
];

const NIL_INTERESTS_OPTIONS = [
    'Apparel & Footwear', 'Food & Beverage', 'Technology & Apps', 'Fitness & Wellness',
    'Automotive', 'Gaming', 'Financial Services', 'Retail', 'Hospitality & Travel',
    'Media & Entertainment', 'Other'
];