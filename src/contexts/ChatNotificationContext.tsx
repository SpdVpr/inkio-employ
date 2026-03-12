'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useChatNotifications, ChatUnreadInfo, IncomingMessage } from '@/hooks/useChatNotifications';

interface ChatNotificationContextType {
  totalUnread: number;
  unreadPerChat: Record<string, ChatUnreadInfo>;
  incomingMessage: IncomingMessage | null;
  dismissToast: () => void;
}

const ChatNotificationContext = createContext<ChatNotificationContextType>({
  totalUnread: 0,
  unreadPerChat: {},
  incomingMessage: null,
  dismissToast: () => {},
});

export function ChatNotificationProvider({ children }: { children: ReactNode }) {
  const notifications = useChatNotifications();

  return (
    <ChatNotificationContext.Provider value={notifications}>
      {children}
    </ChatNotificationContext.Provider>
  );
}

export function useChatNotificationContext() {
  return useContext(ChatNotificationContext);
}
