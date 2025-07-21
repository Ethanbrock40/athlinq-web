// pages/inbox.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseConfig';

export default function InboxPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null); // New: to store current user's full data
  const [activeChats, setActiveChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login'); // Redirect to login if not authenticated
        return;
      }
      setCurrentUser(user);

      // Fetch current user's profile data to get chatsLastRead
      const currentUserDocRef = doc(db, 'users', user.uid);
      const currentUserDocSnap = await getDoc(currentUserDocRef);
      if (!currentUserDocSnap.exists()) {
        console.error("Current user's data not found in Firestore for inbox!");
        setLoading(false);
        return;
      }
      const userData = currentUserDocSnap.data();
      setCurrentUserData(userData); // Store current user's full data

      // Fetch active chats for the current user
      const chatsCollectionRef = collection(db, 'chats');
      const q1 = query(chatsCollectionRef, where('participant1Id', '==', user.uid));
      const q2 = query(chatsCollectionRef, where('participant2Id', '==', user.uid));

      const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      let chats = {};
      snapshot1.docs.forEach(doc => {
        chats[doc.id] = { id: doc.id, ...doc.data() };
      });
      snapshot2.docs.forEach(doc => {
        chats[doc.id] = { id: doc.id, ...doc.data() };
      });

      const activeChatsList = Object.values(chats);

      const chatsWithDetails = await Promise.all(activeChatsList.map(async (chat) => {
        const otherParticipantId = chat.participant1Id === user.uid ? chat.participant2Id : chat.participant1Id;
        const otherParticipantDocRef = doc(db, 'users', otherParticipantId);
        const otherParticipantDocSnap = await getDoc(otherParticipantDocRef);
        
        let recipientName = 'Unknown User';
        if (otherParticipantDocSnap.exists()) {
          const otherUserData = otherParticipantDocSnap.data();
          if (otherUserData.userType === 'athlete') {
            recipientName = `${otherUserData.firstName} ${otherUserData.lastName}`;
          } else if (otherUserData.userType === 'business') {
            recipientName = otherUserData.companyName;
          }
        }

        // Determine if chat is unread
        const lastMessageTimestamp = chat.lastMessageTimestamp ? chat.lastMessageTimestamp.toDate() : new Date(0);
        const lastReadTimestamp = userData.chatsLastRead && userData.chatsLastRead[chat.id] 
                                  ? userData.chatsLastRead[chat.id].toDate() 
                                  : new Date(0); // If never read, assume very old timestamp

        const isUnread = lastMessageTimestamp > lastReadTimestamp;

        return { ...chat, recipientName, isUnread };
      }));

      // Sort chats by most recent message first
      chatsWithDetails.sort((a, b) => {
        const timeA = a.lastMessageTimestamp ? a.lastMessageTimestamp.toDate().getTime() : 0;
        const timeB = b.lastMessageTimestamp ? b.lastMessageTimestamp.toDate().getTime() : 0;
        return timeB - timeA;
      });

      setActiveChats(chatsWithDetails);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return <p>Loading messages...</p>;
  }

  if (!currentUser) {
    return null;
  }
  
  if (!currentUserData) {
    return <p>Error: Could not load current user's data for inbox.</p>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9', color: '#333' }}>
      <h1 style={{ color: '#007bff', marginBottom: '20px' }}>Your Inbox</h1>

      {activeChats.length === 0 ? (
        <p>You have no active conversations. Find an athlete or business to start a chat!</p>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {activeChats.map(chat => (
            <div 
              key={chat.id} 
              onClick={() => router.push(`/chat/${chat.id}`)}
              style={{ 
                border: '1px solid #ddd', 
                padding: '15px', 
                borderRadius: '8px', 
                backgroundColor: chat.isUnread ? '#e6f7ff' : '#fff', // Light blue background if unread
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                transition: 'transform 0.1s ease-in-out',
                position: 'relative', // For dot positioning
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <h3 style={{ margin: '0 0 5px 0', color: '#333', fontWeight: chat.isUnread ? 'bold' : 'normal' }}>
                Chat with: {chat.recipientName}
                {chat.isUnread && (
                  <span style={{ 
                    display: 'inline-block', 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    backgroundColor: 'red', 
                    marginLeft: '8px', 
                    verticalAlign: 'middle' 
                  }} title="New messages"></span>
                )}
              </h3>
              {/* Future: Add the last message snippet here */}
              <p style={{ fontSize: '0.9em', color: '#666', margin: 0 }}>
                {chat.lastMessageTimestamp ? `Last message: ${chat.lastMessageTimestamp.toDate().toLocaleString()}` : 'No messages yet'}
              </p>
            </div>
          ))}
        </div>
      )}

      <button 
        onClick={() => router.push('/dashboard')} 
        style={{ 
          marginTop: '30px', 
          padding: '10px 15px', 
          backgroundColor: '#6c757d', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px', 
          cursor: 'pointer' 
        }}
      >
        Back to Dashboard
      </button>
    </div>
  );
}