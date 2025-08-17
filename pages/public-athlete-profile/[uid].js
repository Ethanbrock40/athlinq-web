// pages/propose-deal/[athleteUid].js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'; // Changed setDoc to addDoc
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, db, app } from '../../lib/firebaseConfig';

export default function ProposeDealPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [athleteData, setAthleteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dealDetails, setDealDetails] = useState({
    dealTitle: '',
    deliverables: '',
    compensationType: '',
    compensationAmount: '',
    paymentTerms: '',
    duration: '',
    usageRights: '',
    requirements: '',
    proposalFile: null,
    proposalFileUrl: '',
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const router = useRouter();
  const { athleteUid } = router.query;

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);

      const currentUserDocRef = doc(db, 'users', user.uid);
      const currentUserDocSnap = await getDoc(currentUserDocRef);
      if (!currentUserDocSnap.exists() || currentUserDocSnap.data().userType !== 'business') {
        router.push('/dashboard');
        return;
      }

      if (athleteUid) {
        const athleteDocRef = doc(db, 'users', athleteUid);
        const athleteDocSnap = await getDoc(athleteDocRef);

        if (athleteDocSnap.exists() && athleteDocSnap.data().userType === 'athlete') {
          setAthleteData(athleteDocSnap.data());
        } else {
          console.log('Athlete not found or is not an athlete:', athleteUid);
          setAthleteData(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, [router, athleteUid]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'file') {
      setDealDetails(prevDetails => ({ ...prevDetails, [name]: e.target.files && e.target.files.length > 0 ? e.target.files[0] : null }));
    } else {
      setDealDetails(prevDetails => ({ ...prevDetails, [name]: value }));
    }
  };

  const uploadProposalToFirebase = async (proposalFile) => {
    setUploadError(null);
    if (!proposalFile) return null;

    const storage = getStorage(app);
    // Path includes auto-generated deal ID to ensure uniqueness for multiple files
    const storageRef = ref(storage, `proposals/${currentUser.uid}/${athleteUid}/${Date.now()}_${proposalFile.name}`); 
    const uploadTask = uploadBytesResumable(storageRef, proposalFile);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
          console.log('Proposal Upload is ' + progress + '% done');
        },
        (error) => {
          console.error('Upload error:', error);
          setUploadError('Error uploading proposal.');
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

    let proposalUrl = '';
    if (dealDetails.proposalFile) {
      try {
        proposalUrl = await uploadProposalToFirebase(dealDetails.proposalFile);
        if (!proposalUrl) {
          throw new Error('Proposal upload failed.');
        }
      } catch (uploadError) {
        setUploading(false);
        return;
      }
    } else if (dealDetails.dealTitle.trim() === '') {
      setUploadError('Deal Title is required if no proposal file is uploaded.');
      setUploading(false);
      return;
    }

    try {
      const dealsCollectionRef = collection(db, 'deals');
      // NEW: Generate a unique ID for the deal, not based on chat ID
      const newDealDocRef = await addDoc(dealsCollectionRef, { // Changed setDoc to addDoc
        ...dealDetails,
        proposalFileUrl: proposalUrl,
        proposingBusinessId: currentUser.uid,
        proposingBusinessName: currentUser.email, // This needs to be the actual business name from its profile
        athleteId: athleteUid,
        athleteName: athleteData.firstName + ' ' + athleteData.lastName,
        timestamp: serverTimestamp(),
        status: 'proposed',
        
        // NEW: Store the chatId to link back to the conversation
        chatId: [currentUser.uid, athleteUid].sort().join('_'), 
      });

      alert('Deal proposal submitted!');
      // Redirect to the new deal's detail page, using its auto-generated ID
      router.push(`/deal-details/${newDealDocRef.id}`); // Redirect to new deal's specific page
    } catch (error) {
      console.error('Error proposing deal:', error);
      alert('There was an error submitting the proposal. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Determine if a proposal file has been selected
  const isProposalFileSelected = dealDetails.proposalFile !== null;

  if (loading) {
    return <p>Loading deal proposal page...</p>;
  }

  if (!currentUser || !athleteData) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9', color: '#333' }}>
        <p>Athlete not found or you do not have permission to propose a deal.</p>
        <button onClick={() => router.push('/find-athletes')} style={{ marginTop: '20px', padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Back to Find Athletes</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9', color: '#333' }}>
      <h1 style={{ color: '#007bff', marginBottom: '20px' }}>Propose a Deal to {athleteData.firstName} {athleteData.lastName}</h1>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
        <label>
          Deal Title/Name:
          <input 
            type="text" 
            name="dealTitle" 
            value={dealDetails.dealTitle} 
            onChange={handleChange} 
            required={!isProposalFileSelected}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} 
          />
        </label>
        <label>
          Description of Deliverables:
          <textarea 
            name="deliverables" 
            value={dealDetails.deliverables} 
            onChange={handleChange} 
            required={!isProposalFileSelected}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', height: '80px' }} 
          />
        </label>
        <label>
          Compensation Type:
          <select 
            name="compensationType" 
            value={dealDetails.compensationType} 
            onChange={handleChange} 
            required={!isProposalFileSelected}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">Select Compensation Type</option>
            <option value="Flat Fee">Flat Fee</option>
            <option value="Per Post">Per Post</option>
            <option value="Revenue Share">Revenue Share</option>
            <option value="Product Gifting">Product Gifting</option>
          </select>
        </label>
        <label>
          Compensation Amount:
          <input 
            type="text" 
            name="compensationAmount" 
            value={dealDetails.compensationAmount} 
            onChange={handleChange} 
            required={!isProposalFileSelected}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} 
          />
        </label>
        <label>
          Payment Schedule/Terms:
          <textarea 
            name="paymentTerms" 
            value={dealDetails.paymentTerms} 
            onChange={handleChange} 
            required={!isProposalFileSelected}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', height: '80px' }} 
          />
        </label>
        <label>
          Duration of Deal:
          <input 
            type="text" 
            name="duration" 
            value={dealDetails.duration} 
            onChange={handleChange} 
            required={!isProposalFileSelected}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} 
          />
        </label>
        <label>
          Usage Rights:
          <textarea name="usageRights" value={dealDetails.usageRights} onChange={handleChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', height: '80px' }} />
        </label>
        <label>
          Any Specific Requirements or Clauses:
          <textarea name="requirements" value={dealDetails.requirements} onChange={handleChange} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', height: '80px' }} />
        </label>

        {/* File Upload Field for Proposal */}
        <label htmlFor="proposalFile" style={{ fontWeight: 'bold' }}>
          Upload Proposal (PDF, Word Doc, etc.):
        </label>
        <input type="file" id="proposalFile" name="proposalFile" accept=".pdf,.doc,.docx" onChange={handleChange} />
        {uploadError && <p style={{ color: 'red' }}>{uploadError}</p>}
        {uploading && <p>Uploading Proposal... ({Math.round(uploadProgress)}%)</p>}

        <button type="submit" disabled={uploading} style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', opacity: uploading ? 0.7 : 1 }}>
          {uploading ? 'Proposing Deal...' : 'Propose Deal'}
        </button>
      </form>

      <button onClick={() => router.back()} style={{ marginTop: '20px', padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
        Back to Chat
      </button>
    </div>
  );
}