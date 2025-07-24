// pages/api/create-connect-account.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
import { doc, getDoc, updateDoc } from 'firebase/firestore'; // Import Firestore
import { db } from '../../lib/firebaseConfig'; // Import db

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { userId, userEmail } = req.body;
    const returnUrl = `${req.headers.origin}/dashboard?stripe_onboarding_complete=true`;
    const refreshUrl = `${req.headers.origin}/dashboard`;

    if (!userId || !userEmail) {
      return res.status(400).json({ message: 'User ID and Email are required.' });
    }
    if (!process.env.STRIPE_SECRET_KEY) {
        console.error('API Error: STRIPE_SECRET_KEY is not defined.');
        return res.status(500).json({ statusCode: 500, message: 'Server configuration error: Stripe key missing.' });
    }

    try {
      // Check if user already has a Stripe account ID in Firestore
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.data();
      let stripeAccountId = userData?.stripeAccountId;

      // If no existing Stripe account ID, create a new one
      if (!stripeAccountId) {
          const account = await stripe.accounts.create({
            type: 'express',
            country: 'US',
            email: userEmail,
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
            business_type: 'individual',
            // You can prefill more info here if you collect it during signup
          });
          stripeAccountId = account.id;

          // Store the new Stripe account ID in Firestore
          await updateDoc(userDocRef, {
              stripeAccountId: stripeAccountId,
          });
      }

      // Create an account link for the athlete to onboard/resume onboarding
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId, // Use the existing or newly created account ID
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding', // For full onboarding flow
      });

      res.status(200).json({ url: accountLink.url, stripeAccountId: stripeAccountId });
    } catch (error) {
      console.error('Stripe Connect Account Creation/Link Error:', error);
      res.status(500).json({ statusCode: 500, message: error.message });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}