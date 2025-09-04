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
import LoadingLogo from '../../src/components/LoadingLogo';
import ErrorBoundary from '../../src/components/ErrorBoundary'; // NEW: Import ErrorBoundary

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
      await addDoc(messagesCollectionRef, {
        text: newMessage,
        senderId: currentUser.uid,
        senderEmail: currentUser.email,
        timestamp: serverTimestamp(),
      });

      await updateDoc(chatDocRef, {
        lastMessageText: newMessage,
        lastMessageTimestamp: serverTimestamp(),
      });

      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (loading || !currentUserData || !recipientData) {
    return <LoadingLogo size="80px" />;
  }

  const showProposeDealButton = 
    currentUserData.userType === 'business' &&
    recipientData.userType === 'athlete';

  return (
    <ErrorBoundary>
      <div style={{ 
          fontFamily: 'Inter, sans-serif',
          backgroundColor: '#0a0a0a', 
          color: '#e0e0e0',
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          padding: '20px'
      }}>
        <div style={{ 
            maxWidth: '900px',
            width: '100%',
            backgroundColor: '#1e1e1e', 
            padding: '20px',
            borderRadius: '12px', 
            boxShadow: '0 6px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            maxHeight: 'calc(100vh - 40px)',
            overflow: 'hidden'
        }}>
          <h1 style={{ color: '#007bff', textAlign: 'center', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
            Chat with {recipientName}
          </h1>

          {proposedDeal && proposedDeal.status !== 'paid' && proposedDeal.status !== 'revoked' && (
            <div style={{ 
                backgroundColor: '#2a2a2a',
                border: '1px solid #007bff', 
                padding: '15px', 
                borderRadius: '8px', 
                marginBottom: '15px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
            }}>
              <h2 style={{ color: '#007bff', margin: '0 0 10px 0', fontSize: '1.2em' }}>Proposed Deal</h2>
              <p style={{ margin: '5px 0' }}><strong>Title:</strong> {proposedDeal.dealTitle || 'N/A'}</p>
              <p style={{ margin: '5px 0' }}><strong>Compensation:</strong> {proposedDeal.compensationType || 'N/A'} - {proposedDeal.compensationAmount || 'N/A'}</p>
              <button
                onClick={() => router.push(`/deal-details/${proposedDeal.id}`)}
                style={{ 
                    marginTop: '10px', 
                    padding: '8px 12px', 
                    backgroundColor: '#007bff', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
              >
                View Full Proposal
              </button>
            </div>
          )}

          <div style={{ 
            flexGrow: 1, 
            overflowY: 'auto',
            border: '1px solid #333', 
            padding: '15px', 
            borderRadius: '8px', 
            backgroundColor: '#1a1a1a',
            marginBottom: '15px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {messages.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#888' }}>Send your first message!</p>
            ) : (
              messages.map(msg => (
                <div 
                  key={msg.id} 
                  style={{ 
                    display: 'flex',
                    justifyContent: msg.senderId === currentUser.uid ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{ 
                    maxWidth: '70%',
                    padding: '10px 15px', 
                    borderRadius: '18px',
                    backgroundColor: msg.senderId === currentUser.uid ? '#007bff' : '#333',
                    color: 'white',
                    wordWrap: 'break-word',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }}>
                    <p style={{ margin: 0, fontSize: '0.95em' }}>{msg.text}</p>
                    <div style={{ fontSize: '0.75em', color: '#bbb', marginTop: '5px', textAlign: msg.senderId === currentUser.uid ? 'right' : 'left' }}>
                      {msg.senderId === currentUser.uid ? 'You' : msg.senderEmail || 'Them'} - {msg.timestamp}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                style={{ flexGrow: 1, padding: '12px', border: '1px solid #555', backgroundColor: '#333', borderRadius: '8px', color: '#e0e0e0', fontSize: '1em' }}
              />
              <button 
                type="submit" 
                style={{ 
                    padding: '10px 15px', 
                    backgroundColor: '#007bff', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    fontSize: '1em',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
              >
                Send
              </button>
            </form>
            
            {showProposeDealButton && (
              <button
                onClick={() => router.push(`/propose-deal/${recipientData.uid}`)}
                style={{ 
                  width: '100%', 
                  padding: '12px 15px', 
                  backgroundColor: '#ffaa00', 
                  color: 'black', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontSize: '1em',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e09800'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffaa00'}
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
              borderRadius: '8px', 
              cursor: 'pointer',
              fontSize: '1em',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
          >
            Back
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}