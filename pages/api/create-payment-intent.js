// pages/api/create-payment-intent.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { amount, dealId, athleteId, businessId, athleteStripeAccountId } = req.body; // NEW: athleteStripeAccountId

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('API Error: STRIPE_SECRET_KEY is not defined. Cannot proceed with payment intent creation.');
      return res.status(500).json({ statusCode: 500, message: 'Server configuration error: Stripe secret key missing.' });
    }

    if (!athleteStripeAccountId) {
      return res.status(400).json({ statusCode: 400, message: 'Athlete Stripe Account ID is required for payment transfer.' });
    }

    // Calculate your platform's application fee (e.g., 10% of the deal amount)
    // IMPORTANT: This is where you define your commission.
    const applicationFeeAmount = Math.round(amount * 0.10); // 10% of the amount in cents

    try {
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount, // Total amount to charge the business (in cents)
        currency: 'usd',
        payment_method_types: ['card'], // Specify card payment
        
        // Use transfer_data to specify the connected account and application fee
        transfer_data: {
          destination: athleteStripeAccountId, // The athlete's connected account ID
        },
        application_fee_amount: applicationFeeAmount, // Your platform's fee (in cents)
        
        metadata: {
          deal_id: dealId,
          athlete_id: athleteId,
          business_id: businessId,
          platform_fee: applicationFeeAmount,
          transfer_amount: amount - applicationFeeAmount,
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