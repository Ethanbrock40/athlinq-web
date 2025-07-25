// pages/deal-details/[chatId].js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebaseConfig';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Load Stripe.js outside of a component’s render to avoid recreating the Stripe object on every render.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function DealDetailsPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const router = useRouter();
  const { chatId } = router.query;

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);

      if (chatId) {
        const dealDocRef = doc(db, 'deals', chatId);
        const dealDocSnap = await getDoc(dealDocRef);

        if (dealDocSnap.exists()) {
          const dealData = dealDocSnap.data();
          
          if (dealData.athleteId !== user.uid && dealData.proposingBusinessId !== user.uid) {
            router.push('/dashboard');
            return;
          }
          setDeal({ id: dealDocSnap.id, ...dealData }); // Ensure ID is part of deal object

          // If deal is accepted and current user is the business, create a payment intent
          if (dealData.status === 'accepted' && dealData.proposingBusinessId === user.uid) {
            setPaymentProcessing(true);
            try {
              let rawAmount = dealData.compensationAmount;
              
              if (typeof rawAmount === 'string') {
                  rawAmount = rawAmount.replace(/[^0-9.]/g, '');
              }

              let amountValue = parseFloat(rawAmount);

              if (isNaN(amountValue) || amountValue <= 0) {
                  console.error("Invalid compensation amount for payment intent:", rawAmount);
                  setError("Invalid deal amount for payment. Please edit the deal or propose a new one.");
                  setPaymentProcessing(false);
                  return;
              }
              
              const amountInCents = Math.round(amountValue * 100);

              const response = await fetch('/api/create-payment-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  amount: amountInCents,
                  dealId: dealData.id,
                  athleteId: dealData.athleteId,
                  businessId: dealData.proposingBusinessId
                }),
              });
              const data = await response.json();

              if (response.ok) {
                setClientSecret(data.clientSecret);
              } else {
                setError(data.message || 'Failed to create payment intent');
              }
            } catch (fetchError) {
              console.error('Client-side error calling payment intent API:', fetchError);
              setError('Error calling payment intent API.');
            } finally {
              setPaymentProcessing(false);
            }
          }

        } else {
          console.log('No deal found for chatId:', chatId);
          setDeal(null);
          setError('Deal details not found.');
        }
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, [router, chatId]);

  const handleAccept = async () => {
    setError(null);
    try {
      const dealDocRef = doc(db, 'deals', chatId);
      await updateDoc(dealDocRef, { status: 'accepted' });
      setDeal({ ...deal, status: 'accepted' });
      alert('Deal accepted!');
      router.push('/my-deals'); 
    } catch (err) {
      console.error('Error accepting deal:', err);
      setError('Failed to accept deal. Please try again.');
    }
  };

  const handleReject = async () => {
    setError(null);
    try {
      const dealDocRef = doc(db, 'deals', chatId);
      await updateDoc(dealDocRef, { status: 'rejected' });
      setDeal({ ...deal, status: 'rejected' });
      alert('Deal rejected.');
      router.push('/my-deals'); 
    } catch (err) {
      console.error('Error rejecting deal:', err);
      setError('Failed to reject deal. Please try again.');
    }
  };

  const handleRevoke = async () => {
    setError(null);
    if (!confirm('Are you sure you want to revoke this deal proposal? This cannot be undone.')) {
      return;
    }
    try {
      const dealDocRef = doc(db, 'deals', chatId);
      await updateDoc(dealDocRef, { status: 'revoked' }); // Set status to 'revoked'
      setDeal({ ...deal, status: 'revoked' }); // Update local state
      alert('Deal proposal has been revoked.');
      router.push('/my-deals'); // Redirect back to My Deals
    } catch (err) {
      console.error('Error revoking deal:', err);
      setError('Failed to revoke deal. Please try again.');
    }
  };


  if (loading) {
    return <p>Loading deal details...</p>;
  }

  if (!deal) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9', color: '#333' }}>
        <p>Deal details not found or you do not have permission to view this page.</p>
        <button onClick={() => router.push('/dashboard')} style={{ marginTop: '20px', padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Back to Dashboard</button>
      </div>
    );
  }

  const isCurrentUserAthlete = currentUser && deal.athleteId === currentUser.uid;
  const isCurrentUserBusiness = currentUser && deal.proposingBusinessId === currentUser.uid;


  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9', color: '#333' }}>
      <h1 style={{ color: '#007bff', marginBottom: '20px' }}>Deal Proposal</h1>
      <p>Proposed to: <strong>{deal.athleteName}</strong></p>
      <p>Proposed by: <strong>{deal.proposingBusinessName}</strong></p>
      <p><strong>Status:</strong> <span style={getStatusStyle(deal.status)}>{deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}</span></p>


      <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
        <h2 style={{ color: '#007bff' }}>Deal Terms</h2>
        <p><strong>Deal Title:</strong> {deal.dealTitle}</p>
        <p><strong>Deliverables:</strong> {deal.deliverables}</p>
        <p><strong>Compensation:</strong> {deal.compensationType} - {deal.compensationAmount}</p>
        <p><strong>Payment Terms:</strong> {deal.paymentTerms}</p>
        <p><strong>Duration:</strong> {deal.duration}</p>
        <p><strong>Usage Rights:</strong> {deal.usageRights || 'N/A'}</p>
        <p><strong>Requirements:</strong> {deal.requirements || 'N/A'}</p>

        {deal.proposalFileUrl && (
          <div style={{ marginTop: '15px' }}>
            <p><strong>Attached Proposal File:</strong></p>
            <a 
              href={deal.proposalFileUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ 
                display: 'inline-block', 
                padding: '8px 12px', 
                backgroundColor: '#007bff', 
                color: 'white', 
                borderRadius: '5px', 
                textDecoration: 'none' 
              }}
            >
              View Uploaded Proposal
            </a>
          </div>
        )}
      </div>

      {/* Accept/Reject Buttons - only visible to the ATHLETE and if status is 'proposed' */}
      {isCurrentUserAthlete && deal.status === 'proposed' && (
        <div style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={handleAccept}
            style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Accept Deal
          </button>
          <button
            onClick={handleReject}
            style={{ padding: '10px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Reject Deal
          </button>
        </div>
      )}
      
      {/* NEW: Revoke Deal Button - visible to Business if status is 'proposed' OR 'accepted' but NOT 'paid' */}
      {isCurrentUserBusiness && (deal.status === 'proposed' || deal.status === 'accepted') && ( // MODIFIED CONDITION
        <div style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={handleRevoke}
            style={{ padding: '10px 15px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Revoke Deal
          </button>
        </div>
      )}

      {/* Payment Section for Business (if deal accepted) */}
      {isCurrentUserBusiness && deal.status === 'accepted' && (
        <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
          <h2 style={{ color: '#007bff' }}>Deal Payment</h2>
          {paymentProcessing ? (
            <p>Preparing payment...</p>
          ) : paymentSuccess ? (
            <p style={{ color: 'green', fontWeight: 'bold' }}>Payment successful!</p>
          ) : error ? (
            <p style={{ color: 'red' }}>Payment Error: {error}</p>
          ) : (
            clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm deal={deal} clientSecret={clientSecret} setParentPaymentSuccess={setPaymentSuccess} setParentPaymentError={setError} />
              </Elements>
            ) : (
              <p>Error: Could not prepare payment. Try refreshing.</p>
            )
          )}
        </div>
      )}

      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}

      <button onClick={() => router.back()} style={{ marginTop: '20px', padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
        Back to My Deals
      </button>
    </div>
  );
}

// Helper to format deal status
const getStatusStyle = (status) => {
  switch (status) {
    case 'proposed': return { color: '#007bff', fontWeight: 'bold' };
    case 'accepted': return { color: '#28a745', fontWeight: 'bold' };
    case 'rejected': return { color: '#dc3545', color: 'white', fontWeight: 'bold' };
    case 'paid': return { color: '#888', fontWeight: 'bold' };
    case 'revoked': return { color: '#ffc107', fontWeight: 'bold' };
    default: return { color: '#6c757d' };
  }
};

// --- Basic CheckoutForm Component (to be placed in the same file for now) ---
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';

// Receive clientSecret, setParentPaymentSuccess, setParentPaymentError as props
function CheckoutForm({ deal, clientSecret, setParentPaymentSuccess, setParentPaymentError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setProcessing(true);
    setPaymentError(null);
    setParentPaymentError(null);

    // Check if deal object is not null/undefined here
    if (!deal || !deal.id) {
        const msg = "Deal information missing for payment submission (CheckoutForm).";
        setPaymentError(msg);
        setParentPaymentError(msg);
        setProcessing(false);
        console.error("CheckoutForm - handleSubmit:", msg, deal);
        return;
    }

    if (!stripe || !elements) {
      const msg = "Stripe.js has not yet loaded.";
      setPaymentError(msg);
      setParentPaymentError(msg);
      setProcessing(false);
      return;
    }

    const cardElement = elements.getElement(CardElement);

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      },
    });

    if (error) {
      setPaymentError(error.message);
      setParentPaymentError(error.message);
      setProcessing(false);
    } else {
      setPaymentError(null);
      setParentPaymentError(null);
      setPaymentSuccess(true);
      setParentPaymentSuccess(true);
      
      // Update deal status to 'paid' in Firestore
      const dealDocRef = doc(db, 'deals', deal.id);
      try {
        await updateDoc(dealDocRef, { status: 'paid' });
        console.log('Deal status updated to PAID in Firestore!');
      } catch (firestoreError) {
        console.error('Error updating deal status to paid:', firestoreError);
        setParentPaymentError('Payment successful, but failed to update deal status.');
      }

      console.log('Payment successful! PaymentIntent:', paymentIntent);
      alert('Payment successful!');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '15px' }}>
      <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
        <CardElement />
      </div>
      <button 
        type="submit" 
        disabled={!stripe || processing} 
        style={{ 
          padding: '10px 15px', 
          backgroundColor: '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px', 
          cursor: 'pointer',
          opacity: (!stripe || processing) ? 0.7 : 1
        }}
      >
        {processing ? 'Processing...' : `Pay $${deal.compensationAmount}`}
      </button>
      {/* Display local paymentError */}
      {paymentError && <p style={{ color: 'red', marginTop: '10px' }}>{paymentError}</p>} 
      {/* Display local paymentSuccess */}
      {paymentSuccess && <p style={{ color: 'green', marginTop: '10px' }}>Payment confirmed!</p>}
    </form>
  );
}