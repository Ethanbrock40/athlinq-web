// pages/api/create-payment-intent.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { amount, applicationFeeAmount, athletePayoutAmount, dealId, athleteId, businessId, athleteStripeAccountId } = req.body; // NEW: applicationFeeAmount, athletePayoutAmount

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('API Error: STRIPE_SECRET_KEY is not defined. Cannot proceed with payment intent creation.');
      return res.status(500).json({ statusCode: 500, message: 'Server configuration error: Stripe secret key missing.' });
    }

    if (!athleteStripeAccountId) {
      return res.status(400).json({ statusCode: 400, message: 'Athlete Stripe Account ID is required for payment transfer.' });
    }
    
    // Ensure amounts are valid numbers
    if (typeof amount !== 'number' || amount <= 0 ||
        typeof applicationFeeAmount !== 'number' || applicationFeeAmount < 0 ||
        typeof athletePayoutAmount !== 'number' || athletePayoutAmount <= 0) {
        return res.status(400).json({ statusCode: 400, message: 'Invalid amount or fee provided.' });
    }


    try {
      // Create a PaymentIntent with the total amount to charge the business
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount, // Total amount to charge the business (in cents)
        currency: 'usd',
        payment_method_types: ['card'],
        
        // Use transfer_data to specify the connected account and application fee
        transfer_data: {
          destination: athleteStripeAccountId, // The athlete's connected account ID
          // Stripe automatically calculates transfer amount as (charge.amount - application_fee_amount)
          // So, no need for transfer_amount here if platform covers fees from application_fee_amount
        },
        application_fee_amount: applicationFeeAmount, // Your platform's fee (in cents)
        
        metadata: {
          deal_id: dealId,
          athlete_id: athleteId,
          business_id: businessId,
          platform_fee_cents: applicationFeeAmount,
          athlete_payout_cents: athletePayoutAmount, // Store athlete's payout amount in metadata
        },
      });

      res.status(200).json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error('Stripe API Error (createPaymentIntent - Connect):', error.message);
      res.status(500).json({ statusCode: 500, message: error.message });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}