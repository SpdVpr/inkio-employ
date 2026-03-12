'use client';

import { IncomingMessage } from '@/hooks/useChatNotifications';
import { MessageSquare, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ChatNotificationToastProps {
  message: IncomingMessage | null;
  onDismiss: () => void;
}

export default function ChatNotificationToast({ message, onDismiss }: ChatNotificationToastProps) {
  const router = useRouter();

  if (!message) return null;

  const handleClick = () => {
    onDismiss();
    router.push('/chat');
  };

  return (
    <div className="chat-toast" onClick={handleClick}>
      <div className="chat-toast-icon">
        <MessageSquare size={18} />
      </div>
      <div className="chat-toast-content">
        <div className="chat-toast-sender">{message.senderName}</div>
        <div className="chat-toast-text">{message.content.substring(0, 80)}{message.content.length > 80 ? '…' : ''}</div>
      </div>
      <button
        className="chat-toast-close"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
