import { useState } from 'react';
import { useRouter } from 'next/router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import LoadingLogo from '../src/components/LoadingLogo'; // NEW: Import LoadingLogo

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [userType, setUserType] = useState('athlete');
  const [loading, setLoading] = useState(false); // NEW: State for loading
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true); // NEW: Set loading to true

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('Signed up user:', user.email);

      let userDataToStore = {
        uid: user.uid,
        email: user.email,
        userType: userType,
        createdAt: new Date(),
      };

      if (userType === 'athlete') {
        userDataToStore.firstName = firstName;
        userDataToStore.lastName = lastName;
      } else if (userType === 'business') {
        userDataToStore.companyName = companyName;
      }

      await setDoc(doc(db, "users", user.uid), userDataToStore);
      console.log('User data saved to Firestore:', user.uid);

      if (userType === 'athlete') {
        router.push('/athlete-profile');
      } else if (userType === 'business') {
        router.push('/business-profile');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Signup error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false); // NEW: Set loading to false
    }
  };

  if (loading) {
    return <LoadingLogo size="100px" />;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h1>Sign Up for AthLinq</h1>
      <form onSubmit={handleSignup}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        {userType === 'athlete' && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="firstName" style={{ display: 'block', marginBottom: '5px' }}>First Name:</label>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="lastName" style={{ display: 'block', marginBottom: '5px' }}>Last Name:</label>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
            </div>
          </>
        )}
        {userType === 'business' && (
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="companyName" style={{ display: 'block', marginBottom: '5px' }}>Company Name:</label>
            <input
              type="text"
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            />
          </div>
        )}
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="userType" style={{ display: 'block', marginBottom: '5px' }}>I am a:</label>
          <select
            id="userType"
            value={userType}
            onChange={(e) => {
              setUserType(e.target.value);
              setFirstName('');
              setLastName('');
              setCompanyName('');
            }}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          >
            <option value="athlete">Athlete</option>
            <option value="business">Business</option>
          </select>
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          Sign Up
        </button>
        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      </form>
      <p style={{ textAlign: 'center', marginTop: '20px' }}>
        Already have an account? <a href="/login" style={{ color: '#0070f3', textDecoration: 'none' }}>Log In</a>
      </p>
    </div>
  );
}