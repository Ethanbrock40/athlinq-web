// pages/chat/[chatId].js
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc, getDoc, setDoc, updateDoc
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebaseConfig';

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [recipientName, setRecipientName] = useState('Recipient');
  const [recipientData, setRecipientData] = useState(null);
  const [proposedDeal, setProposedDeal] = useState(null);
  const router = useRouter();
  const { chatId } = router.query;

  const messagesEndRef = useRef(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);
      
      const currentUserDocRef = doc(db, 'users', user.uid);
      const currentUserDocSnap = await getDoc(currentUserDocRef);
      if (currentUserDocSnap.exists()) {
          setCurrentUserData(currentUserDocSnap.data());
      }

      setLoading(false);

      if (chatId) {
        const participants = chatId.split('_');
        const recipientUid = participants.find(uid => uid !== user.uid);

        if (recipientUid) {
          const recipientDocRef = doc(db, 'users', recipientUid);
          const recipientDocSnap = await getDoc(recipientDocRef);
          if (recipientDocSnap.exists()) {
            const data = recipientDocSnap.data();
            setRecipientData(data);
            if (data.userType === 'athlete') {
              setRecipientName(`${data.firstName} ${data.lastName}`);
            } else if (data.userType === 'business') {
              setRecipientName(data.companyName);
            }
          }
        }

        const messagesCollectionRef = collection(db, `chats/${chatId}/messages`);
        const q = query(messagesCollectionRef, orderBy('timestamp'));
        
        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const fetchedMessages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate().toLocaleString()
          }));
          setMessages(fetchedMessages);

          // Mark chat as read for the current user when messages are fetched
          if (user && currentUserDocSnap.exists()) {
              const chatReadStatusPath = `chatsLastRead.${chatId}`; // Use dot notation for nested field
              updateDoc(currentUserDocRef, {
                  [chatReadStatusPath]: serverTimestamp()
              }).catch(err => console.error("Error marking chat as read:", err));
          }

        }, (error) => {
          console.error("Error fetching messages:", error);
        });

        // Fetch proposed deal (if any)
        const dealDocRef = doc(db, 'deals', chatId);
        const unsubscribeDeal = onSnapshot(dealDocRef, (docSnap) => { // Use onSnapshot for real-time deal updates
            if (docSnap.exists()) {
                setProposedDeal(docSnap.data());
            } else {
                setProposedDeal(null);
            }
        }, (error) => {
            console.error("Error fetching deal details:", error);
        });

        return () => {
            unsubscribeSnapshot(); // Clean up messages listener
            unsubscribeDeal(); // Clean up deal listener
        };
      }
    });

    return () => unsubscribeAuth();
  }, [router, chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !currentUser || !chatId) return;

    const messagesCollectionRef = collection(db, `chats/${chatId}/messages`);
    const chatDocRef = doc(db, 'chats', chatId);

    try {
      const participantIds = chatId.split('_').sort();
      const participant1Id = participantIds[0];
      const participant2Id = participantIds[1];

      await setDoc(chatDocRef, {
        participant1Id: participant1Id,
        participant2Id: participant2Id,
        lastMessageTimestamp: serverTimestamp(),
      }, { merge: true });

      await addDoc(messagesCollectionRef, {
        text: newMessage,
        senderId: currentUser.uid,
        senderEmail: currentUser.email,
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (loading) {
    return <p>Loading chat...</p>;
  }

  if (!currentUser) {
    return null;
  }

  if (!currentUserData) {
      return <p>Error: Could not retrieve current user's profile data.</p>;
  }

  const showProposeDealButton = 
    currentUserData && currentUserData.userType === 'business' &&
    recipientData && recipientData.userType === 'athlete';

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '20px auto', 
      border: '1px solid #ccc', 
      borderRadius: '8px', 
      backgroundColor: '#f9f9f9', 
      color: '#333',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 'calc(100vh - 40px)',
      maxHeight: 'calc(100vh - 40px)',
      overflow: 'hidden'
    }}>
      <h1 style={{ color: '#007bff', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
        Chat with {recipientName}
      </h1>

      {/* NEW: Proposed Deal Display - Only if exists AND status is NOT 'paid' */}
      {proposedDeal && proposedDeal.status !== 'paid' && (
        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#fff', marginBottom: '15px' }}>
          <h2 style={{ color: '#007bff', margin: '0 0 10px 0' }}>Proposed Deal</h2>
          <p><strong>Title:</strong> {proposedDeal.dealTitle || 'N/A'}</p>
          <p><strong>Deliverables:</strong> {proposedDeal.deliverables || 'N/A'}</p>
          <p><strong>Compensation:</strong> {proposedDeal.compensationType || 'N/A'} - {proposedDeal.compensationAmount || 'N/A'}</p>
          <button
            onClick={() => router.push(`/deal-details/${chatId}`)}
            style={{ marginTop: '10px', padding: '8px 12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            View Full Proposal
          </button>
        </div>
      )}

      {/* Message Display Area */}
      <div style={{ 
        flexGrow: 1, 
        overflowY: 'auto',
        border: '1px solid #ddd', 
        padding: '15px', 
        borderRadius: '8px', 
        backgroundColor: '#fff', 
        marginBottom: '15px' 
      }}>
        {messages.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>Send your first message!</p>
        ) : (
          messages.map(msg => (
            <div 
              key={msg.id} 
              style={{ 
                marginBottom: '10px', 
                textAlign: msg.senderId === currentUser.uid ? 'right' : 'left',
              }}
            >
              <span style={{ 
                display: 'inline-block', 
                padding: '8px 12px', 
                borderRadius: '15px', 
                backgroundColor: msg.senderId === currentUser.uid ? '#dcf8c6' : '#e0e0e0',
                color: '#333',
                maxWidth: '70%',
                wordWrap: 'break-word'
              }}>
                {msg.text}
              </span>
              <div style={{ fontSize: '0.75em', color: '#888', marginTop: '4px' }}>
                {msg.senderId === currentUser.uid ? 'You' : msg.senderEmail || 'Them'} - {msg.timestamp}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          style={{ flexGrow: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}
        />
        <button 
          type="submit" 
          style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          Send
        </button>
      </form>
      
      {/* Conditional Propose Deal Button (only if business chatting with athlete and deal is not paid) */}
      {showProposeDealButton && proposedDeal?.status !== 'paid' && ( // Added proposedDeal?.status !== 'paid'
        <button
          onClick={() => router.push(`/propose-deal/${recipientData.uid}`)}
          style={{ 
            marginTop: '15px', 
            width: '100%', 
            padding: '10px 15px', 
            backgroundColor: '#ffaa00', 
            color: 'black', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer' 
          }}
        >
          Propose Deal to {recipientName.split(' ')[0]}
        </button>
      )}

      <button 
        onClick={() => router.back()}
        style={{ 
          marginTop: '15px',
          padding: '10px 15px', 
          backgroundColor: '#6c757d', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px', 
          cursor: 'pointer' 
        }}
      >
        Back
      </button>
    </div>
  );
}