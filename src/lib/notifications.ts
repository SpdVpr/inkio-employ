import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { getCollectionName } from './environment';

export type NotificationType =
  | 'new_task'        // Nový úkol přiřazen
  | 'task_completed'  // Úkol dokončen
  | 'time_reminder'   // Úkol bez času
  | 'new_user'        // Nový uživatel se registroval
  | 'task_updated'    // Úkol byl upraven
  | 'mention';        // Zmínka v chatu

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  recipientUid: string;  // 'all' pro všechny, nebo konkrétní UID
  senderName?: string;
  read: boolean;
  createdAt: Timestamp;
  link?: string;         // Kam vede kliknutí
  metadata?: Record<string, string>;
}

const COLLECTION = () => getCollectionName('notifications');

// Create a notification
export const createNotification = async (data: {
  type: NotificationType;
  title: string;
  message: string;
  recipientUid: string;
  senderName?: string;
  link?: string;
  metadata?: Record<string, string>;
}) => {
  try {
    await addDoc(collection(db, COLLECTION()), {
      ...data,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Create notification for all users (broadcast)
export const createBroadcastNotification = async (data: {
  type: NotificationType;
  title: string;
  message: string;
  senderName?: string;
  link?: string;
  metadata?: Record<string, string>;
}) => {
  return createNotification({ ...data, recipientUid: 'all' });
};

// Subscribe to notifications for a specific user
export const subscribeToNotifications = (
  uid: string,
  callback: (notifications: AppNotification[]) => void,
  maxCount: number = 30
) => {
  // We query for both user-specific and broadcast notifications
  // Firestore doesn't support OR queries easily, so we use two listeners

  let userNotifs: AppNotification[] = [];
  let broadcastNotifs: AppNotification[] = [];

  const mergeAndCallback = () => {
    const merged = [...userNotifs, ...broadcastNotifs]
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      .slice(0, maxCount);
    callback(merged);
  };

  // User-specific notifications
  const userQuery = query(
    collection(db, COLLECTION()),
    where('recipientUid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(maxCount)
  );

  const unsub1 = onSnapshot(userQuery, (snapshot) => {
    userNotifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
    mergeAndCallback();
  }, (error) => {
    console.error('Error subscribing to user notifications:', error);
  });

  // Broadcast notifications
  const broadcastQuery = query(
    collection(db, COLLECTION()),
    where('recipientUid', '==', 'all'),
    orderBy('createdAt', 'desc'),
    limit(maxCount)
  );

  const unsub2 = onSnapshot(broadcastQuery, (snapshot) => {
    broadcastNotifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
    mergeAndCallback();
  }, (error) => {
    console.error('Error subscribing to broadcast notifications:', error);
  });

  return () => {
    unsub1();
    unsub2();
  };
};

// Mark a single notification as read
export const markAsRead = async (notificationId: string) => {
  try {
    const ref = doc(db, COLLECTION(), notificationId);
    await updateDoc(ref, { read: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

// Mark all notifications as read for a user
export const markAllAsRead = async (uid: string, notifications: AppNotification[]) => {
  try {
    const batch = writeBatch(db);
    const unread = notifications.filter(n => !n.read);

    for (const n of unread) {
      const ref = doc(db, COLLECTION(), n.id);
      batch.update(ref, { read: true });
    }

    if (unread.length > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.error('Error marking all as read:', error);
  }
};

// Helper: Get icon and color for notification type
export const getNotificationMeta = (type: NotificationType) => {
  switch (type) {
    case 'new_task':
      return { icon: '📋', color: 'blue', label: 'Nový úkol' };
    case 'task_completed':
      return { icon: '✅', color: 'emerald', label: 'Úkol splněn' };
    case 'time_reminder':
      return { icon: '⏰', color: 'amber', label: 'Doplň čas' };
    case 'new_user':
      return { icon: '👤', color: 'purple', label: 'Nový uživatel' };
    case 'task_updated':
      return { icon: '✏️', color: 'slate', label: 'Úkol upraven' };
    case 'mention':
      return { icon: '💬', color: 'indigo', label: 'Zmínka' };
    default:
      return { icon: '🔔', color: 'slate', label: 'Notifikace' };
  }
};
