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
  doc, getDoc, setDoc, updateDoc,
  where
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
          const data = currentUserDocSnap.data();
          setCurrentUserData(data);
      } else {
          console.log('ChatPage - Current User Data NOT found for UID:', user.uid);
          setCurrentUserData(null);
      }

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
          } else {
            console.log('ChatPage - Recipient Data NOT found for UID:', recipientUid);
            setRecipientName('Unknown User (Profile Missing)');
            setRecipientData(null);
          }
        } else {
            console.log('ChatPage - Recipient UID not found in chatId:', chatId);
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

          if (user && currentUserDocSnap.exists()) {
              const chatReadStatusPath = `chatsLastRead.${chatId}`;
              updateDoc(currentUserDocRef, {
                  [chatReadStatusPath]: serverTimestamp()
              }).catch(err => console.error("Error marking chat as read:", err));
          }
        }, (error) => {
          console.error("Error fetching messages:", error);
        });

        const dealsCollectionRef = collection(db, 'deals');
        const dealsQuery = query(dealsCollectionRef, 
                                 where('chatId', '==', chatId), 
                                 orderBy('timestamp', 'desc'));
        
        const unsubscribeDeal = onSnapshot(dealsQuery, (querySnapshot) => {
            if (!querySnapshot.empty) {
                const latestDeal = querySnapshot.docs[0].data();
                setProposedDeal({ id: querySnapshot.docs[0].id, ...latestDeal });
            } else {
                setProposedDeal(null);
            }
        }, (error) => {
            console.error("Error fetching deal details:", error);
        });

        setLoading(false);
        return () => {
            unsubscribeSnapshot();
            unsubscribeDeal();
        };
      }
      setLoading(false);
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

  if (loading || !currentUserData || !recipientData) {
    return <p>Loading chat...</p>;
  }

  const showProposeDealButton = 
    currentUserData.userType === 'business' &&
    recipientData.userType === 'athlete';

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

      {proposedDeal && proposedDeal.status !== 'paid' && proposedDeal.status !== 'revoked' && (
        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#fff', marginBottom: '15px' }}>
          <h2 style={{ color: '#007bff', margin: '0 0 10px 0' }}>Proposed Deal</h2>
          <p><strong>Title:</strong> {proposedDeal.dealTitle || 'N/A'}</p>
          <p><strong>Deliverables:</strong> {proposedDeal.deliverables || 'N/A'}</p>
          <p><strong>Compensation:</strong> {proposedDeal.compensationType || 'N/A'} - {proposedDeal.compensationAmount || 'N/A'}</p>
          <button
            onClick={() => router.push(`/deal-details/${proposedDeal.id}`)}
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
      <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
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
        
        {showProposeDealButton && (!proposedDeal || proposedDeal.status === 'paid' || proposedDeal.status === 'rejected' || proposedDeal.status === 'revoked') && (
          <button
            onClick={() => router.push(`/propose-deal/${recipientData.uid}`)}
            style={{ 
              width: '100%', 
              padding: '10px 15px', 
              backgroundColor: '#ffaa00', 
              color: 'black', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer' 
            }}
          >
            Propose New Deal to {recipientName.split(' ')[0]}
          </button>
        )}
      </div>

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