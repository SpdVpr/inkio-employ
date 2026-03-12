'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/lib/auth';
import {
  subscribeToChats, subscribeToMessages, sendMessage,
  createDirectChat, markMessagesAsRead,
  getUnreadCount, Chat, ChatMessage,
  toggleReaction, CHAT_EMOJIS
} from '@/lib/chat';
import { collection, onSnapshot, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  MessageSquare, Send, ArrowLeft, X, Plus,
  Search, Circle, Hash, Minus, SmilePlus, ThumbsUp
} from 'lucide-react';
import { useChatNotificationContext } from '@/contexts/ChatNotificationContext';

export default function ChatWidget() {
  const { user, userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { totalUnread, unreadPerChat } = useChatNotificationContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null);

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user || !activeChat) return;
    setEmojiPickerMsgId(null);
    await toggleReaction(activeChat, messageId, emoji, user.uid);
  };

  // Subscribe to chats
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToChats(user.uid, setChats);
    return () => unsubscribe();
  }, [user]);

  // Subscribe to all users
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'users')), (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach((doc) => users.push(doc.data() as UserProfile));
      setAllUsers(users);
    });
    return () => unsub();
  }, []);

  // Subscribe to messages
  useEffect(() => {
    if (!activeChat) { setMessages([]); return; }
    const unsubscribe = subscribeToMessages(activeChat, (msgs) => {
      setMessages(msgs);
      if (user) {
        const unread = msgs.filter(m => m.senderId !== user.uid && !m.readBy?.includes(user.uid));
        if (unread.length > 0) {
          markMessagesAsRead(activeChat, unread.map(m => m.id), user.uid);
        }
      }
    });
    return () => unsubscribe();
  }, [activeChat, user]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input
  useEffect(() => {
    if (activeChat && isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeChat, isOpen]);

  const activeChatData = useMemo(() => chats.find(c => c.id === activeChat), [chats, activeChat]);

  const getChatName = (chat: Chat) => {
    if (chat.type === 'group') return chat.name;
    if (!user) return '';
    const otherUid = chat.members.find(m => m !== user.uid) || '';
    return chat.memberNames?.[otherUid] || 'Unknown';
  };

  const formatTime = (ts: Timestamp | null) => {
    if (!ts) return '';
    const d = ts.toDate();
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !activeChat || !user || !userProfile) return;
    const content = inputValue.trim();
    setInputValue('');
    setSending(true);
    try {
      await sendMessage(activeChat, user.uid, userProfile.displayName, content);
    } catch (err) {
      console.error('Send error:', err);
      setInputValue(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startDirectChat = async (targetUser: UserProfile) => {
    if (!user || !userProfile) return;
    setShowNewChat(false);
    try {
      const chatId = await createDirectChat(
        user.uid, userProfile.displayName,
        targetUser.uid, targetUser.displayName
      );
      setActiveChat(chatId);
    } catch (err) {
      console.error('Error creating chat:', err);
    }
  };

  const filteredUsers = allUsers.filter(u =>
    u.uid !== user?.uid &&
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="chat-widget-bubble"
        title="Chat"
      >
        {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
        {!isOpen && totalUnread > 0 && (
          <span className="chat-widget-badge">{totalUnread > 9 ? '9+' : totalUnread}</span>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="chat-widget-panel">
          {/* Header */}
          <div className="chat-widget-header">
            {activeChat ? (
              <>
                <button onClick={() => setActiveChat(null)} className="chat-widget-header-btn">
                  <ArrowLeft size={16} />
                </button>
                <span className="chat-widget-header-title">
                  {activeChatData ? getChatName(activeChatData) : 'Chat'}
                </span>
              </>
            ) : (
              <>
                <span className="chat-widget-header-title">Zprávy</span>
                <button onClick={() => setShowNewChat(!showNewChat)} className="chat-widget-header-btn">
                  <Plus size={16} />
                </button>
              </>
            )}
            <button onClick={() => setIsOpen(false)} className="chat-widget-header-btn" style={{ marginLeft: 'auto' }}>
              <Minus size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="chat-widget-body">
            {showNewChat && !activeChat ? (
              /* New chat — user picker */
              <div className="chat-widget-new-chat">
                <div className="chat-widget-search">
                  <Search size={14} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Hledat..."
                    autoFocus
                  />
                </div>
                <div className="chat-widget-user-list">
                  {filteredUsers.map((u) => (
                    <button key={u.uid} onClick={() => startDirectChat(u)} className="chat-widget-user-item">
                      <div className="chat-widget-avatar-sm">
                        {u.displayName.charAt(0)}
                      </div>
                      <span>{u.displayName}</span>
                      {u.isOnline && <Circle size={6} className="text-emerald-500 fill-emerald-500 ml-auto" />}
                    </button>
                  ))}
                  {filteredUsers.length === 0 && (
                    <p className="chat-widget-empty-text">Žádní uživatelé</p>
                  )}
                </div>
              </div>
            ) : activeChat ? (
              /* Messages */
              <>
                <div className="chat-widget-messages">
                  {messages.length === 0 ? (
                    <div className="chat-widget-messages-empty">
                      <p>Začněte konverzaci 👋</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.senderId === user?.uid;
                      const reactions = msg.reactions || {};
                      const hasReactions = Object.keys(reactions).length > 0;
                      return (
                        <div key={msg.id} className={`chat-widget-msg ${isOwn ? 'own' : 'other'}`}>
                          <div className="chat-bubble-wrapper">
                            <div className={`chat-widget-msg-bubble ${isOwn ? 'own' : 'other'}`}>
                              {!isOwn && activeChatData?.type === 'group' && (
                                <span className="chat-widget-msg-sender">{msg.senderName}</span>
                              )}
                              <p>{msg.content}</p>
                              <span className="chat-widget-msg-time">{msg.createdAt ? formatTime(msg.createdAt) : '...'}</span>
                            </div>
                            {/* Quick reaction triggers */}
                            <div className={`chat-reaction-trigger widget ${isOwn ? 'own' : 'other'}`}>
                              <button
                                className="chat-reaction-btn-quick"
                                onClick={() => handleReaction(msg.id, '\u{1F44D}')}
                                title="L\u00edb\u00ed se mi"
                              >
                                <ThumbsUp size={10} />
                              </button>
                              <button
                                className="chat-reaction-btn-quick"
                                onClick={() => setEmojiPickerMsgId(emojiPickerMsgId === msg.id ? null : msg.id)}
                                title="Reakce"
                              >
                                <SmilePlus size={10} />
                              </button>
                            </div>
                            {emojiPickerMsgId === msg.id && (
                              <div className={`chat-emoji-picker widget ${isOwn ? 'own' : 'other'}`}>
                                {CHAT_EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    className="chat-emoji-btn"
                                    onClick={() => handleReaction(msg.id, emoji)}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {hasReactions && (
                            <div className={`chat-reactions-row ${isOwn ? 'own' : 'other'}`}>
                              {Object.entries(reactions).map(([emoji, uids]) => (
                                <button
                                  key={emoji}
                                  className={`chat-reaction-badge ${uids.includes(user?.uid || '') ? 'active' : ''}`}
                                  onClick={() => handleReaction(msg.id, emoji)}
                                >
                                  {emoji} {uids.length > 1 && <span>{uids.length}</span>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="chat-widget-input-area">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Napište zprávu..."
                    className="chat-widget-input"
                  />
                  <button onClick={handleSend} disabled={!inputValue.trim() || sending} className="chat-widget-send">
                    <Send size={14} />
                  </button>
                </div>
              </>
            ) : (
              /* Chat list */
              <div className="chat-widget-chat-list">
                {chats.length === 0 ? (
                  <div className="chat-widget-empty">
                    <MessageSquare size={28} />
                    <p>Zatím žádné konverzace</p>
                    <button onClick={() => setShowNewChat(true)} className="chat-widget-start-btn">
                      Začít konverzaci
                    </button>
                  </div>
                ) : (
                  chats.map((chat) => {
                    const chatUnread = unreadPerChat[chat.id]?.unreadCount || 0;
                    return (
                    <button key={chat.id} onClick={() => setActiveChat(chat.id)} className="chat-widget-chat-item">
                      <div className={`chat-widget-avatar-sm ${chat.type === 'group' ? 'group' : ''}`}>
                        {chat.type === 'group' ? <Hash size={12} /> : getChatName(chat).charAt(0)}
                      </div>
                      <div className="chat-widget-chat-item-content">
                        <span className={`chat-widget-chat-item-name ${chatUnread > 0 ? 'font-extrabold' : ''}`}>{getChatName(chat)}</span>
                        <span className={`chat-widget-chat-item-preview ${chatUnread > 0 ? 'font-semibold' : ''}`}>
                          {chat.lastMessage || 'Nová konverzace'}
                        </span>
                      </div>
                      {chatUnread > 0 ? (
                        <span className="nav-badge" style={{ marginLeft: 0, fontSize: 9 }}>{chatUnread}</span>
                      ) : (
                        <span className="chat-widget-chat-item-time">{formatTime(chat.lastMessageAt)}</span>
                      )}
                    </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
