// populateSchools.js
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-admin-sdk.json');
const schoolsData = require('./schoolsData.js'); // Import the data

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function populateSchools() {
  console.log('Starting to populate schools collection...');
  for (const school of schoolsData) {
    try {
      const docRef = db.collection('schools').doc(school.universityName);
      await docRef.set(school);
      console.log(`Successfully added: ${school.universityName}`);
    } catch (error) {
      console.error(`Failed to add ${school.universityName}:`, error);
    }
  }
  console.log('Finished populating schools collection.');
}

populateSchools().then(() => process.exit(0)).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});