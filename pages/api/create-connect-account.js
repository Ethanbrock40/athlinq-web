// pages/api/create-connect-account.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { userId, userEmail } = req.body; // NEW: Receive userEmail
    const returnUrl = `${req.headers.origin}/dashboard?stripe_onboarding_complete=true`;

    if (!userId || !userEmail) { // NEW: Validate userEmail
      return res.status(400).json({ message: 'User ID and Email are required.' });
    }
    if (!process.env.STRIPE_SECRET_KEY) {
        console.error('API Error: STRIPE_SECRET_KEY is not defined.');
        return res.status(500).json({ statusCode: 500, message: 'Server configuration error: Stripe key missing.' });
    }

    try {
      // 1. Create a Stripe Express account for the athlete
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: userEmail, // FIX: Use the actual userEmail here
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
      });

      // 2. Create an account link for the athlete to onboard
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${req.headers.origin}/dashboard`,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      res.status(200).json({ url: accountLink.url, stripeAccountId: account.id });
    } catch (error) {
      console.error('Stripe Connect Account Creation Error:', error);
      res.status(500).json({ statusCode: 500, message: error.message });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}