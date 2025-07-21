// pages/api/test-env.js
export default function handler(req, res) { // <--- ENSURE THIS LINE IS EXACTLY AS IS
  const testVar = process.env.TEST_ENV_VAR;
  const stripePublic = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  console.log('Test API Route: TEST_ENV_VAR:', testVar);
  console.log('Test API Route: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:', stripePublic);
  console.log('Test API Route: STRIPE_SECRET_KEY:', stripeSecret ? '******' : 'UNDEFINED');

  res.status(200).json({
    testEnvVar: testVar,
    stripePublishableKey: stripePublic,
    stripeSecretKey: stripeSecret ? 'KeyLoaded' : 'KeyUndefined',
    message: 'Check your VS Code terminal for logs.'
  });
}