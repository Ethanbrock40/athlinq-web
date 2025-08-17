// pages/api/create-connect-account.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebaseConfig';

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
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.data();
      let stripeAccountId = userData?.stripeAccountId;

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
          });
          stripeAccountId = account.id;

          await updateDoc(userDocRef, {
              stripeAccountId: stripeAccountId,
          });
      }

      if (!stripeAccountId) {
          return res.status(500).json({ message: 'Stripe account ID is not available.' });
      }

      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
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