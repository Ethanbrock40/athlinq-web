import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc, deleteField } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseConfig';
import Avatar from '../src/components/Avatar';
import LoadingLogo from '../src/components/LoadingLogo';
import ErrorBoundary from '../src/components/ErrorBoundary';

const truncateMessage = (text, maxLength) => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

export default function InboxPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [activeChats, setActiveChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);

      const currentUserDocRef = doc(db, 'users', user.uid);
      const currentUserDocSnap = await getDoc(currentUserDocRef);
      if (!currentUserDocSnap.exists()) {
        console.error("Current user's data not found in Firestore for inbox!");
        setLoading(false);
        return;
      }
      const userData = currentUserDocSnap.data();
      setCurrentUserData(userData);

      const chatsCollectionRef = collection(db, 'chats');
      
      const qNew = query(chatsCollectionRef, where('participants', 'array-contains', user.uid));
      const qOld1 = query(chatsCollectionRef, where('participant1Id', '==', user.uid));
      const qOld2 = query(chatsCollectionRef, where('participant2Id', '==', user.uid));

      const [snapshotNew, snapshotOld1, snapshotOld2] = await Promise.all([
        getDocs(qNew),
        getDocs(qOld1),
        getDocs(qOld2)
      ]);

      let chats = {};
      snapshotNew.docs.forEach(doc => {
          chats[doc.id] = { id: doc.id, ...doc.data() };
      });
      snapshotOld1.docs.forEach(doc => {
          chats[doc.id] = { id: doc.id, ...doc.data() };
      });
      snapshotOld2.docs.forEach(doc => {
          chats[doc.id] = { id: doc.id, ...doc.data() };
      });

      const activeChatsList = Object.values(chats);

      const chatsWithDetails = await Promise.all(activeChatsList.map(async (chat) => {
        let recipientName = '';
        let recipientProfileImageUrl = '';

        if (chat.isGroupChat) {
          recipientName = chat.university ? `${chat.university} ${chat.sportsTeam}` : 'Team Chat';
          recipientProfileImageUrl = '';
        } else {
          const otherParticipantId = chat.participant1Id === user.uid ? chat.participant2Id : chat.participant1Id;
          const otherParticipantDocRef = doc(db, 'users', otherParticipantId);
          const otherParticipantDocSnap = await getDoc(otherParticipantDocRef);
          
          if (otherParticipantDocSnap.exists()) {
            const otherUserData = otherParticipantDocSnap.data();
            if (otherUserData.userType === 'athlete') {
              recipientName = `${otherUserData.firstName} ${otherUserData.lastName}`;
              recipientProfileImageUrl = otherUserData.profileImageUrl;
            } else if (otherUserData.userType === 'business') {
              recipientName = otherUserData.companyName;
              recipientProfileImageUrl = otherUserData.businessLogoUrl;
            }
          } else {
            recipientName = 'Unknown User';
          }
        }

        const lastMessageTimestamp = chat.lastMessageTimestamp ? chat.lastMessageTimestamp.toDate() : new Date(0);
        const lastReadTimestamp = userData.chatsLastRead && userData.chatsLastRead[chat.id] 
                                ? userData.chatsLastRead[chat.id].toDate() 
                                : new Date(0);

        const isUnread = lastMessageTimestamp > lastReadTimestamp;

        return { ...chat, recipientName, recipientProfileImageUrl, isUnread };
      }));

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

  const handleDeleteChat = async (chatIdToDelete, event) => {
    event.stopPropagation();
    if (!currentUser || !currentUser.uid) {
      alert('You must be logged in to delete chats.');
      return;
    }

    if (!confirm('Are you sure you want to delete this chat? This will delete all messages and cannot be undone.')) {
      return;
    }

    try {
      const messagesRef = collection(db, `chats/${chatIdToDelete}/messages`);
      const messagesSnapshot = await getDocs(messagesRef);
      const deleteMessagePromises = messagesSnapshot.docs.map(msgDoc => deleteDoc(doc(db, `chats/${chatIdToDelete}/messages`, msgDoc.id)));
      await Promise.all(deleteMessagePromises);

      const chatDocRef = doc(db, 'chats', chatIdToDelete);
      await deleteDoc(chatDocRef);

      const currentUserDocRef = doc(db, 'users', currentUser.uid);
      const chatReadStatusPath = `chatsLastRead.${chatIdToDelete}`;
      await updateDoc(currentUserDocRef, {
        [chatReadStatusPath]: deleteField()
      });

      setActiveChats(prevChats => prevChats.filter(chat => chat.id !== chatIdToDelete));
      alert('Chat deleted successfully!');

    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Failed to delete chat. Please try again.');
    }
  };


  if (loading) {
    return <LoadingLogo size="100px" />;
  }

  if (!currentUser || !currentUserData) {
    return null;
  }

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
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 6px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '25px'
        }}>
          <h1 style={{ color: '#007bff', textAlign: 'center', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Your Inbox</h1>

          {activeChats.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#aaa' }}>You have no active conversations. Find an athlete or business to start a chat!</p>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {activeChats.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => router.push(`/chat/${chat.id}`)}
                  style={{
                    border: chat.isUnread ? '1px solid #007bff' : '1px solid #333',
                    padding: '15px',
                    borderRadius: '12px',
                    backgroundColor: chat.isUnread ? '#1a1a1a' : '#2a2a2a',
                    cursor: 'pointer',
                    boxShadow: chat.isUnread ? '0 2px 8px rgba(0,123,255,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
                    transition: 'all 0.2s ease-in-out',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    position: 'relative'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{
                    width: '50px',
                    height: '50px',
                  }}>
                    <Avatar url={chat.recipientProfileImageUrl} name={chat.recipientName} />
                  </div>

                  <div style={{ flexGrow: 1 }}>
                    <h3 style={{ margin: '0 0 5px 0', color: chat.isUnread ? '#007bff' : '#e0e0e0', fontWeight: chat.isUnread ? 'bold' : 'normal', fontSize: '1.1em' }}>
                      {chat.recipientName}
                      {chat.isUnread && (
                        <span style={{
                            display: 'inline-block',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: 'red',
                            marginLeft: '8px',
                            verticalAlign: 'middle'
                        }} title="New messages"></span>
                      )}
                    </h3>
                    <p style={{ fontSize: '0.9em', color: '#aaa', margin: 0 }}>
                      {chat.lastMessageText ? truncateMessage(chat.lastMessageText, 45) : 'No messages yet.'}
                    </p>
                  </div>

                  <button
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    style={{
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '30px',
                        height: '30px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: '1.2em',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        transition: 'background-color 0.2s',
                        flexShrink: 0,
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
                    title="Delete Chat"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => router.push('/dashboard')}
            style={{
              marginTop: '30px',
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1em',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              transition: 'background-color 0.2s',
              alignSelf: 'center',
              width: 'fit-content'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
}