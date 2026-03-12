import {
  collection, doc, addDoc, updateDoc, onSnapshot,
  query, where, orderBy, serverTimestamp, Timestamp,
  getDocs, setDoc, arrayUnion, limit
} from 'firebase/firestore';
import { db } from './firebase';

// Chat room/conversation
export interface Chat {
  id: string;
  type: 'direct' | 'group';
  name: string; // group name or empty for direct
  members: string[]; // user UIDs
  memberNames: Record<string, string>; // uid -> displayName
  lastMessage: string;
  lastMessageAt: Timestamp | null;
  lastMessageBy: string;
  createdAt: Timestamp;
  createdBy: string;
}

// Individual message
export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: Timestamp;
  readBy: string[]; // UIDs who have read this message
}

// Subscribe to all chats for a user
export const subscribeToChats = (
  userId: string,
  callback: (chats: Chat[]) => void
) => {
  const q = query(
    collection(db, 'chats'),
    where('members', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const chats: Chat[] = [];
    snapshot.forEach((doc) => {
      chats.push({ id: doc.id, ...doc.data() } as Chat);
    });
    callback(chats);
  }, (error) => {
    console.error('Error subscribing to chats:', error);
    callback([]);
  });
};

// Subscribe to messages in a chat
export const subscribeToMessages = (
  chatId: string,
  callback: (messages: ChatMessage[]) => void,
  messageLimit: number = 100
) => {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(messageLimit)
  );

  return onSnapshot(q, (snapshot) => {
    const messages: ChatMessage[] = [];
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() } as ChatMessage);
    });
    callback(messages);
  }, (error) => {
    console.error('Error subscribing to messages:', error);
    callback([]);
  });
};

// Send a message
export const sendMessage = async (
  chatId: string,
  senderId: string,
  senderName: string,
  content: string
) => {
  // Add message
  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    chatId,
    senderId,
    senderName,
    content: content.trim(),
    createdAt: serverTimestamp(),
    readBy: [senderId]
  });

  // Update chat's last message
  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: content.trim().substring(0, 100),
    lastMessageAt: serverTimestamp(),
    lastMessageBy: senderId
  });
};

// Create a direct chat between two users
export const createDirectChat = async (
  user1Id: string, user1Name: string,
  user2Id: string, user2Name: string
): Promise<string> => {
  // Check if direct chat already exists
  const q = query(
    collection(db, 'chats'),
    where('type', '==', 'direct'),
    where('members', 'array-contains', user1Id)
  );
  const snapshot = await getDocs(q);

  for (const chatDoc of snapshot.docs) {
    const data = chatDoc.data();
    if (data.members.includes(user2Id)) {
      return chatDoc.id; // Return existing chat
    }
  }

  // Create new direct chat
  const chatRef = await addDoc(collection(db, 'chats'), {
    type: 'direct',
    name: '',
    members: [user1Id, user2Id],
    memberNames: { [user1Id]: user1Name, [user2Id]: user2Name },
    lastMessage: '',
    lastMessageAt: serverTimestamp(),
    lastMessageBy: '',
    createdAt: serverTimestamp(),
    createdBy: user1Id
  });

  return chatRef.id;
};

// Create a group chat
export const createGroupChat = async (
  name: string,
  creatorId: string,
  members: { uid: string; displayName: string }[]
): Promise<string> => {
  const memberIds = members.map(m => m.uid);
  const memberNames: Record<string, string> = {};
  members.forEach(m => { memberNames[m.uid] = m.displayName; });

  if (!memberIds.includes(creatorId)) {
    memberIds.push(creatorId);
  }

  const chatRef = await addDoc(collection(db, 'chats'), {
    type: 'group',
    name,
    members: memberIds,
    memberNames,
    lastMessage: '',
    lastMessageAt: serverTimestamp(),
    lastMessageBy: '',
    createdAt: serverTimestamp(),
    createdBy: creatorId
  });

  return chatRef.id;
};

// Mark messages as read
export const markMessagesAsRead = async (
  chatId: string,
  messageIds: string[],
  userId: string
) => {
  const promises = messageIds.map(msgId =>
    updateDoc(doc(db, 'chats', chatId, 'messages', msgId), {
      readBy: arrayUnion(userId)
    })
  );
  await Promise.all(promises);
};

// Get unread count for a chat
export const getUnreadCount = (messages: ChatMessage[], userId: string): number => {
  return messages.filter(m => 
    m.senderId !== userId && !m.readBy?.includes(userId)
  ).length;
};
