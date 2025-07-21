// test-env-standalone.js
console.log('Attempting to load .env.local with dotenv...');

// Manually require and configure dotenv
const dotenv = require('dotenv');
const path = require('path');

// Specify the exact path to your .env.local file
const envPath = path.resolve(__dirname, '.env.local');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env.local:', result.error);
} else {
  console.log('.env.local loaded successfully! Parsed variables:');
  console.log(result.parsed); // This will show what dotenv parsed from your file
}

console.log('\nValues from process.env:');
console.log('TEST_ENV_VAR:', process.env.TEST_ENV_VAR); // Assuming you added this dummy var before
console.log('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '******' : 'UNDEFINED');
console.log('\n--- End of test-env-standalone.js ---');