// pages/api/ai-match.js
import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore'; // FIX: Added query, where, orderBy
import { db } from '../../lib/firebaseConfig';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { userId, userType } = req.body;

        if (!userId || !userType) {
            return res.status(400).json({ message: 'User ID and type are required.' });
        }

        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            console.error('Gemini API Key is not defined in environment variables.');
            return res.status(500).json({ message: 'Server configuration error: Gemini API key missing.' });
        }

        try {
            // 1. Fetch current user's profile
            const currentUserDocRef = doc(db, 'users', userId);
            const currentUserDocSnap = await getDoc(currentUserDocRef);
            if (!currentUserDocSnap.exists()) {
                return res.status(404).json({ message: 'Current user profile not found.' });
            }
            const currentUserProfile = currentUserDocSnap.data();

            // 2. Determine target user type and fetch all relevant profiles
            let targetUserType;
            let targetCollectionName;
            if (userType === 'athlete') {
                targetUserType = 'business';
                targetCollectionName = 'businesses';
            } else if (userType === 'business') {
                targetUserType = 'athlete';
                targetCollectionName = 'athletes';
            } else {
                return res.status(400).json({ message: 'Invalid user type for matching.' });
            }

            const targetUsersCollectionRef = collection(db, 'users');
            // FIX: Added orderBy to the query, which requires an index
            const q = query(targetUsersCollectionRef, where('userType', '==', targetUserType)); // The query itself is fine, but it needs the 'query' function imported.
            const querySnapshot = await getDocs(q);
            const targetProfiles = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 3. Construct the prompt for the Gemini API
            let prompt = `You are an AI matching assistant for AthLinq, a platform connecting college athletes with businesses for NIL deals.
            Your goal is to find the best potential matches based on their profiles.

            Here is the profile of the current ${userType}:
            ${JSON.stringify(currentUserProfile, null, 2)}

            Here are profiles of available ${targetCollectionName} to match with:
            ${JSON.stringify(targetProfiles, null, 2)}

            Analyze the profiles and provide a list of top 3-5 recommended matches from the available ${targetCollectionName}. For each recommendation, explain *why* they are a good match, highlighting key compatibilities (e.g., sports, NIL interests, company offerings, bio keywords).
            Present the results as a JSON array of objects, where each object has 'id', 'name', and 'reason' fields.
            Example for an athlete matching with businesses:
            [
              { "id": "business_uid_1", "name": "Nike Inc.", "reason": "Nike's apparel focus aligns with the athlete's interest in clothing endorsements and their sport." },
              { "id": "business_uid_2", "name": "Local Coffee Shop", "reason": "The athlete's bio mentions community involvement, and the coffee shop is a local business looking for community engagement." }
            ]
            Example for a business matching with athletes:
            [
              { "id": "athlete_uid_1", "name": "John Doe", "reason": "John's basketball background and interest in fitness align with our brand's fitness product line." },
              { "id": "athlete_uid_2", "name": "Jane Smith", "reason": "Jane's strong social media presence and interest in tech endorsements make her a good fit for our new app promotion." }
            ]
            `;

            // 4. Make the call to the Gemini API
            const payload = {
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                "id": { "type": "STRING" },
                                "name": { "type": "STRING" },
                                "reason": { "type": "STRING" }
                            },
                            "propertyOrdering": ["id", "name", "reason"]
                        }
                    }
                }
            };

            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${geminiApiKey}`;
            
            let response;
            let retries = 0;
            const maxRetries = 5;
            const baseDelay = 1000;

            while (retries < maxRetries) {
                try {
                    response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (response.status === 429) {
                        const delay = Math.pow(2, retries) * baseDelay;
                        console.warn(`Gemini API rate limit hit. Retrying in ${delay / 1000}s...`);
                        await new Promise(res => setTimeout(res, delay));
                        retries++;
                    } else if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(`Gemini API responded with status ${response.status}: ${errorData.error.message}`);
                    } else {
                        break;
                    }
                } catch (fetchError) {
                    console.error('Error calling Gemini API:', fetchError.message);
                    throw fetchError;
                }
            }

            if (!response || !response.ok) {
                throw new Error('Failed to get a successful response from Gemini API after retries.');
            }

            const result = await response.json();
            const matches = result.candidates[0].content.parts[0].text;
            
            res.status(200).json({ matches: JSON.parse(matches) });

        } catch (error) {
            console.error('AI Matching Error:', error);
            res.status(500).json({ statusCode: 500, message: error.message });
        }
    } else {
        res.setHeader('Allow', 'POST');
        res.status(405).end('Method Not Allowed');
    }
}