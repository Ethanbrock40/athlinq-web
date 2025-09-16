import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebaseConfig';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { businessId, universityName, sportsTeam } = req.body;

  if (!businessId || !universityName || !sportsTeam) {
    return res.status(400).json({ message: 'Missing required parameters.' });
  }

  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('userType', '==', 'athlete'),
      where('universityCollege', '==', universityName),
      where('sports', 'array-contains', sportsTeam)
    );
    const querySnapshot = await getDocs(q);

    const athleteIds = querySnapshot.docs.map(doc => doc.id);

    if (athleteIds.length === 0) {
      return res.status(404).json({ message: 'No athletes found for this team.' });
    }

    const participants = [businessId, ...athleteIds];
    const chatId = [...participants].sort().join('_');

    const chatDocRef = doc(db, 'chats', chatId);
    const initialMessage = `Team deal proposal for the ${sportsTeam} team at ${universityName}.`;
    const notificationsCollectionRef = collection(db, 'notifications');
    const batch = writeBatch(db);

    batch.set(chatDocRef, {
      participants,
      isGroupChat: true,
      lastMessageText: initialMessage,
      lastMessageTimestamp: serverTimestamp(),
      university: universityName,
      sportsTeam: sportsTeam,
    });

    const messagesCollectionRef = collection(db, `chats/${chatId}/messages`);
    batch.set(doc(messagesCollectionRef), {
      text: initialMessage,
      senderId: businessId,
      timestamp: serverTimestamp(),
    });

    const businessDocRef = doc(db, 'users', businessId);
    batch.update(businessDocRef, { [`chatsLastRead.${chatId}`]: serverTimestamp() });

    // FIX: Changed batch.update to batch.set with merge: true for robustness
    athleteIds.forEach(athleteId => {
      const athleteDocRef = doc(db, 'users', athleteId);
      batch.set(athleteDocRef, { chatsLastRead: { [chatId]: new Date(0) } }, { merge: true });
    });

    const notificationMessage = `You've been invited to a new team deal with the ${universityName} ${sportsTeam} team.`;
    
    batch.set(doc(notificationsCollectionRef), {
      recipientId: businessId,
      message: `You created a team deal for the ${universityName} ${sportsTeam} team.`,
      link: `/chat/${chatId}`,
      type: 'deal_update',
      read: false,
      timestamp: serverTimestamp(),
    });

    athleteIds.forEach(athleteId => {
      batch.set(doc(notificationsCollectionRef), {
        recipientId: athleteId,
        message: notificationMessage,
        link: `/chat/${chatId}`,
        type: 'new_message',
        read: false,
        timestamp: serverTimestamp(),
      });
    });

    await batch.commit();

    return res.status(200).json({ 
      message: 'Team chat created successfully.',
      chatId
    });

  } catch (error) {
    console.error('Error in propose-team-deal API:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}