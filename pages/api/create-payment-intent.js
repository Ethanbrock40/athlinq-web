// pages/api/create-payment-intent.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('API Error: Stripe secret key is not defined. Cannot proceed with payment intent creation.');
      return res.status(500).json({ statusCode: 500, message: 'Server configuration error: Stripe secret key missing.' });
    }

    const { amount, dealId, athleteId, businessId } = req.body;

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        // Add metadata to link the payment to your deal/users
        metadata: {
          deal_id: dealId,
          athlete_id: athleteId,
          business_id: businessId,
        },
      });

      res.status(200).json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error('Stripe API Error (createPaymentIntent):', error.message);
      res.status(500).json({ statusCode: 500, message: error.message });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}