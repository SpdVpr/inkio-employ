'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatUnreadInfo {
  chatId: string;
  chatName: string;
  unreadCount: number;
}

export interface IncomingMessage {
  id: string;
  chatId: string;
  chatName: string;
  senderName: string;
  content: string;
  timestamp: Date;
}

/**
 * Hook that tracks unread messages across all chats and sends
 * browser + in-app notifications for new messages.
 */
export function useChatNotifications() {
  const { user, userProfile } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);
  const [unreadPerChat, setUnreadPerChat] = useState<Record<string, ChatUnreadInfo>>({});
  const [incomingMessage, setIncomingMessage] = useState<IncomingMessage | null>(null);
  const notificationPermission = useRef<NotificationPermission>('default');
  const initialLoadDone = useRef(false);
  const knownMessageIds = useRef<Set<string>>(new Set());

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        notificationPermission.current = 'granted';
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((perm) => {
          notificationPermission.current = perm;
        });
      }
    }
  }, []);

  // Subscribe to chats and their latest messages to compute unread counts
  useEffect(() => {
    if (!user) return;

    // Listen for all chats the user is part of
    const chatsQuery = query(
      collection(db, 'chats'),
      where('members', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const perChat: Record<string, ChatUnreadInfo> = {};
      const unsubMessages: (() => void)[] = [];

      snapshot.forEach((chatDoc) => {
        const chatData = chatDoc.data();
        const chatId = chatDoc.id;
        const chatName = chatData.type === 'group'
          ? chatData.name
          : (() => {
              const otherUid = (chatData.members as string[]).find(m => m !== user.uid) || '';
              return chatData.memberNames?.[otherUid] || 'Chat';
            })();

        // Subscribe to recent messages in this chat
        const msgQuery = query(
          collection(db, 'chats', chatId, 'messages'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );

        const unsub = onSnapshot(msgQuery, (msgSnap) => {
          let unreadCount = 0;
          msgSnap.forEach((msgDoc) => {
            const msg = msgDoc.data();
            if (msg.senderId !== user.uid && !(msg.readBy || []).includes(user.uid)) {
              unreadCount++;
            }

            // Detect new incoming messages for notifications
            if (
              initialLoadDone.current &&
              msg.senderId !== user.uid &&
              !knownMessageIds.current.has(msgDoc.id)
            ) {
              knownMessageIds.current.add(msgDoc.id);

              const msgTimestamp = msg.createdAt?.toDate?.() || new Date();
              const age = Date.now() - msgTimestamp.getTime();

              // Only notify for messages < 10 seconds old
              if (age < 10000) {
                const incoming: IncomingMessage = {
                  id: msgDoc.id,
                  chatId,
                  chatName,
                  senderName: msg.senderName || 'Někdo',
                  content: msg.content || '',
                  timestamp: msgTimestamp,
                };

                // In-app toast
                setIncomingMessage(incoming);

                // Browser notification (when tab is not focused)
                if (
                  typeof document !== 'undefined' &&
                  document.hidden &&
                  notificationPermission.current === 'granted'
                ) {
                  try {
                    const notif = new Notification(`${incoming.senderName}`, {
                      body: incoming.content.substring(0, 100),
                      icon: '/logo.png',
                      tag: `chat-${chatId}-${msgDoc.id}`,
                      silent: false,
                    });
                    notif.onclick = () => {
                      window.focus();
                      notif.close();
                    };
                  } catch (e) {
                    console.warn('Browser notification failed:', e);
                  }
                }

                // Play sound
                try {
                  const audio = new Audio('/notification.mp3');
                  audio.volume = 0.3;
                  audio.play().catch(() => {});
                } catch {}
              }
            }

            knownMessageIds.current.add(msgDoc.id);
          });

          perChat[chatId] = { chatId, chatName, unreadCount };
          setUnreadPerChat({ ...perChat });

          // Calculate total unread
          let total = 0;
          Object.values(perChat).forEach(c => total += c.unreadCount);
          setTotalUnread(total);
        });

        unsubMessages.push(unsub);
      });

      // Mark initial load done after a small delay
      if (!initialLoadDone.current) {
        setTimeout(() => {
          initialLoadDone.current = true;
        }, 2000);
      }

      return () => {
        unsubMessages.forEach(u => u());
      };
    });

    return () => unsubscribe();
  }, [user]);

  // Auto-clear incoming message toast after 5 seconds
  useEffect(() => {
    if (!incomingMessage) return;
    const timer = setTimeout(() => setIncomingMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [incomingMessage]);

  const dismissToast = useCallback(() => setIncomingMessage(null), []);

  return {
    totalUnread,
    unreadPerChat,
    incomingMessage,
    dismissToast,
  };
}
