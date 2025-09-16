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
  where,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebaseConfig';
import LoadingLogo from '../../src/components/LoadingLogo';
import ErrorBoundary from '../../src/components/ErrorBoundary';
import Avatar from '../../src/components/Avatar';
import styles from '../../src/components/Chat.module.css';

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatData, setChatData] = useState(null);
  const [participantData, setParticipantData] = useState({});
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
        const chatDocRef = doc(db, 'chats', chatId);
        const chatDocSnap = await getDoc(chatDocRef);
        
        if (chatDocSnap.exists()) {
            const chatDoc = chatDocSnap.data();
            setChatData({ id: chatDocSnap.id, ...chatDoc });
            
            const participantsArray = chatDoc.participants || [chatDoc.participant1Id, chatDoc.participant2Id];
            
            const participantProfiles = {};
            const participantDocs = await Promise.all(
                participantsArray.map(pId => getDoc(doc(db, 'users', pId)))
            );
            
            participantDocs.forEach(pDoc => {
                if (pDoc.exists()) {
                    const data = pDoc.data();
                    let name = 'Unknown User';
                    if (data.userType === 'athlete') {
                        name = `${data.firstName || ''} ${data.lastName || ''}`.trim();
                    } else if (data.userType === 'business') {
                        name = data.companyName || 'Unknown Business';
                    }
                    participantProfiles[pDoc.id] = { ...data, name };
                }
            });
            setParticipantData(participantProfiles);
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
                // NEW: Only set the deal if its status is still "active"
                if (latestDeal.status !== 'paid' && latestDeal.status !== 'rejected' && latestDeal.status !== 'revoked') {
                    setProposedDeal({ id: querySnapshot.docs[0].id, ...latestDeal });
                } else {
                    setProposedDeal(null); // Hide completed deals
                }
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
    const notificationsCollectionRef = collection(db, 'notifications');
    const batch = writeBatch(db);

    try {
      const messageDocRef = doc(messagesCollectionRef);
      batch.set(messageDocRef, {
        text: newMessage,
        senderId: currentUser.uid,
        senderEmail: currentUser.email,
        timestamp: serverTimestamp(),
      });

      batch.update(chatDocRef, {
        lastMessageText: newMessage,
        lastMessageTimestamp: serverTimestamp(),
      });

      const otherParticipants = chatData.participants ? 
        chatData.participants.filter(pId => pId !== currentUser.uid) : 
        [chatData.participant1Id === currentUser.uid ? chatData.participant2Id : chatData.participant1Id];
      
      const senderName = currentUserData.userType === 'athlete' ? `${currentUserData.firstName} ${currentUserData.lastName}` : currentUserData.companyName;
      
      otherParticipants.forEach(pId => {
        const notificationDocRef = doc(notificationsCollectionRef);
        batch.set(notificationDocRef, {
            recipientId: pId,
            message: `New message from ${senderName}: ${newMessage}`,
            link: `/chat/${chatId}`,
            type: 'new_message',
            read: false,
            timestamp: serverTimestamp(),
        });
      });
      
      await batch.commit();
      setNewMessage('');

    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (loading || !currentUserData || !chatData || Object.keys(participantData).length === 0) {
    return <LoadingLogo size="80px" />;
  }

  const isGroupChat = chatData.isGroupChat;

  const chatHeader = isGroupChat
    ? chatData.university ? `Team Chat: ${chatData.university} ${chatData.sportsTeam}` : 'Group Chat'
    : `Chat with ${participantData[chatData.participants ? chatData.participants.find(pId => pId !== currentUser.uid) : chatData.participant1Id === currentUser.uid ? chatData.participant2Id : chatData.participant1Id]?.name || 'Them'}`;

  const showProposeDealButton = !isGroupChat && currentUserData.userType === 'business' && 
    (participantData[chatData.participants ? chatData.participants.find(pId => pId !== currentUser.uid) : chatData.participant1Id === currentUser.uid ? chatData.participant2Id : chatData.participant1Id]?.userType === 'athlete');

  return (
    <ErrorBoundary>
      <div className={styles['chat-page-container']}>
        <div className={styles['chat-content-card']}>
          <h1 className={styles['chat-header']}>
            {chatHeader}
          </h1>

          {isGroupChat && (
              <div className={styles['participants-list']}>
                  <p>Participants: {Object.values(participantData).map(p => p.name).join(', ')}</p>
              </div>
          )}

          {proposedDeal && (
            <div className={styles['deal-card']}>
              <h2 className={styles['deal-title']}>Proposed Deal</h2>
              <p><strong>Title:</strong> {proposedDeal.dealTitle || 'N/A'}</p>
              <p><strong>Compensation:</strong> {proposedDeal.compensationType || 'N/A'} - {proposedDeal.compensationAmount || 'N/A'}</p>
              <button
                onClick={() => router.push(`/deal-details/${proposedDeal.id}`)}
                className={styles['deal-button']}
              >
                View Full Proposal
              </button>
            </div>
          )}

          <div className={styles['message-area']}>
            {messages.length === 0 ? (
              <p className={styles['no-messages']}>Send your first message!</p>
            ) : (
              messages.map(msg => {
                const senderIsCurrentUser = msg.senderId === currentUser.uid;
                const senderName = senderIsCurrentUser ? 'You' : participantData[msg.senderId]?.name || 'Them';
                
                return (
                  <div
                    key={msg.id}
                    className={`${styles['message-bubble-container']} ${senderIsCurrentUser ? styles['message-sent'] : styles['message-received']}`}
                  >
                    <div className={styles['message-bubble']}>
                      <p className={styles['message-text']}>{msg.text}</p>
                      <div className={styles['message-info']}>
                          <span>{senderName} - {msg.timestamp}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles['input-area']}>
            <form onSubmit={handleSendMessage} className={styles['message-form']}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className={styles['message-input']}
              />
              <button type="submit" className={styles['send-button']}>
                Send
              </button>
            </form>
            
            {showProposeDealButton && (
              <button
                onClick={() => router.push(`/propose-deal/${chatData.participant1Id === currentUser.uid ? chatData.participant2Id : chatData.participant1Id}`)}
                className={styles['propose-deal-button']}
              >
                Propose New Deal to {participantData[chatData.participant1Id === currentUser.uid ? chatData.participant2Id : chatData.participant1Id]?.name.split(' ')[0]}
              </button>
            )}
          </div>

          <button onClick={() => router.back()} className={styles['back-button']}>
            Back
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}