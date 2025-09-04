import { useState } from 'react';
import { useRouter } from 'next/router';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebaseConfig';
import LoadingLogo from '../src/components/LoadingLogo'; // NEW: Import LoadingLogo

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // NEW: State for loading
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); // Set loading to true
    setError(null);
    setMessage(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('Logged in successfully!');
      router.push('/dashboard');
    } catch (err) {
      console.error('Login error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false); // Set loading to false
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setMessage(null);
    if (!email) {
      setError('Please enter your email address to reset your password.');
      return;
    }
    setLoading(true); // Set loading for password reset
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (err) {
      console.error('Password reset error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false); // Set loading to false
    }
  };

  if (loading) {
    return <LoadingLogo size="100px" />;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#1e1e1e', color: '#e0e0e0', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ color: '#007bff', textAlign: 'center', marginBottom: '20px' }}>Log In to AthLinq</h1>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: '#333', border: '1px solid #555', borderRadius: '4px', color: '#e0e0e0' }}
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
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: '#333', border: '1px solid #555', borderRadius: '4px', color: '#e0e0e0' }}
          />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', opacity: loading ? 0.7 : 1, marginBottom: '10px' }}>
          Log In
        </button>
        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
        {message && <p style={{ color: 'green', marginTop: '10px' }}>{message}</p>}
      </form>
      <p style={{ textAlign: 'center', marginTop: '20px' }}>
        Don't have an account? <a href="/signup" style={{ color: '#0070f3', textDecoration: 'none' }}>Sign Up</a>
      </p>
      <p style={{ textAlign: 'center', marginTop: '10px' }}>
        <a href="#" onClick={handleForgotPassword} style={{ color: '#ffc107', textDecoration: 'none' }}>Forgot password?</a>
      </p>
    </div>
  );
}