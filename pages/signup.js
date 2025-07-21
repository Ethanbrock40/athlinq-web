// pages/signup.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebaseConfig'; // Import 'db' from firebaseConfig
import { doc, setDoc } from 'firebase/firestore'; // Import Firestore functions

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState(''); // State for athlete's first name
  const [lastName, setLastName] = useState(''); // State for athlete's last name
  const [companyName, setCompanyName] = useState(''); // New state for business's company name
  const [userType, setUserType] = useState('athlete'); // Default to athlete
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous errors

    try {
      // 1. Create user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('Signed up user:', user.email);

      // 2. Prepare user data to store in Firestore based on userType
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

      // 3. Store additional user data in Firestore
      // We create a document in the 'users' collection with the user's UID as the ID
      await setDoc(doc(db, "users", user.uid), userDataToStore);
      console.log('User data saved to Firestore:', user.uid);

      // Redirect to a protected page or dashboard after successful signup
      router.push('/dashboard');
    } catch (err) {
      console.error('Signup error:', err.message);
      setError(err.message);
    }
  };

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

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="userType" style={{ display: 'block', marginBottom: '5px' }}>I am a:</label>
          <select
            id="userType"
            value={userType}
            onChange={(e) => {
              setUserType(e.target.value);
              // Clear name/company fields when user type changes
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

        {/* Conditional Rendering based on userType */}
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

        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
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