'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/lib/auth';
import {
  subscribeToChats, subscribeToMessages, sendMessage,
  createDirectChat, createGroupChat, markMessagesAsRead,
  getUnreadCount, Chat, ChatMessage
} from '@/lib/chat';
import { collection, onSnapshot, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  MessageSquare, Send, Plus, Users, User, Search,
  Hash, Circle, ArrowLeft, X, Check
} from 'lucide-react';
import { useChatNotificationContext } from '@/contexts/ChatNotificationContext';

export default function ChatPage() {
  const { user, userProfile } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { unreadPerChat } = useChatNotificationContext();

  // Subscribe to chats
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToChats(user.uid, setChats);
    return () => unsubscribe();
  }, [user]);

  // Subscribe to all users (for new chat)
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'users')), (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach((doc) => users.push(doc.data() as UserProfile));
      setAllUsers(users);
    });
    return () => unsub();
  }, []);

  // Subscribe to messages when active chat changes
  useEffect(() => {
    if (!activeChat) return;
    const unsubscribe = subscribeToMessages(activeChat, (msgs) => {
      setMessages(msgs);
      // Mark unread messages as read
      if (user) {
        const unread = msgs.filter(m => m.senderId !== user.uid && !m.readBy?.includes(user.uid));
        if (unread.length > 0) {
          markMessagesAsRead(activeChat, unread.map(m => m.id), user.uid);
        }
      }
    });
    return () => unsubscribe();
  }, [activeChat, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (activeChat) inputRef.current?.focus();
  }, [activeChat]);

  const activeChatData = useMemo(() =>
    chats.find(c => c.id === activeChat), [chats, activeChat]
  );

  const getChatDisplayName = (chat: Chat) => {
    if (chat.type === 'group') return chat.name;
    if (!user) return '';
    const otherUid = chat.members.find(m => m !== user.uid) || '';
    return chat.memberNames?.[otherUid] || 'Unknown';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.type === 'group') return <Hash size={16} />;
    const name = getChatDisplayName(chat);
    return <span className="text-xs font-bold">{name.charAt(0)}</span>;
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !activeChat || !user || !userProfile) return;
    const content = inputValue.trim();
    setInputValue('');
    setSending(true);
    try {
      await sendMessage(activeChat, user.uid, userProfile.displayName, content);
    } catch (error) {
      console.error('Error sending message:', error);
      setInputValue(content); // Restore on error
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

  // Start direct chat with user
  const startDirectChat = async (targetUser: UserProfile) => {
    if (!user || !userProfile) return;
    setShowNewChat(false);
    try {
      const chatId = await createDirectChat(
        user.uid, userProfile.displayName,
        targetUser.uid, targetUser.displayName
      );
      setActiveChat(chatId);
    } catch (error) {
      console.error('Error creating direct chat:', error);
    }
  };

  // Create group chat
  const handleCreateGroup = async () => {
    if (!user || !userProfile || !groupName.trim() || selectedMembers.length === 0) return;
    setShowGroupForm(false);
    try {
      const members = selectedMembers.map(uid => {
        const u = allUsers.find(u => u.uid === uid);
        return { uid, displayName: u?.displayName || 'Unknown' };
      });
      members.push({ uid: user.uid, displayName: userProfile.displayName });
      const chatId = await createGroupChat(groupName.trim(), user.uid, members);
      setActiveChat(chatId);
      setGroupName('');
      setSelectedMembers([]);
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const filteredUsers = allUsers.filter(u =>
    u.uid !== user?.uid &&
    u.displayName.toLowerCase().includes(newChatSearch.toLowerCase())
  );

  const formatTime = (timestamp: Timestamp | null) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
  };

  return (
    <div className="chat-container">
      {/* Chat list sidebar */}
      <div className={`chat-sidebar ${activeChat ? 'chat-sidebar-hidden' : ''}`}>
        <div className="chat-sidebar-header">
          <h2>Zprávy</h2>
          <button onClick={() => setShowNewChat(true)} className="action-btn primary" title="Nový chat">
            <Plus size={16} />
          </button>
        </div>

        {/* Chat list */}
        <div className="chat-list">
          {chats.length === 0 ? (
            <div className="chat-empty">
              <MessageSquare size={32} />
              <p>Zatím žádné konverzace</p>
              <button onClick={() => setShowNewChat(true)} className="primary-btn" style={{ fontSize: 12, padding: '8px 16px' }}>
                <Plus size={14} /> Začít konverzaci
              </button>
            </div>
          ) : (
            chats.map((chat) => {
              const chatUnread = unreadPerChat[chat.id]?.unreadCount || 0;
              const isActive = chat.id === activeChat;
              return (
                <button
                  key={chat.id}
                  onClick={() => setActiveChat(chat.id)}
                  className={`chat-list-item ${isActive ? 'active' : ''}`}
                >
                  <div className={`chat-avatar ${chat.type === 'group' ? 'group' : ''}`}>
                    {getChatAvatar(chat)}
                  </div>
                  <div className="chat-list-item-content">
                    <div className="chat-list-item-top">
                      <span className={`chat-list-item-name ${chatUnread > 0 ? 'unread' : ''}`}>{getChatDisplayName(chat)}</span>
                      <span className="chat-list-item-time">{formatTime(chat.lastMessageAt)}</span>
                    </div>
                    <p className={`chat-list-item-preview ${chatUnread > 0 ? 'unread' : ''}`}>
                      {chat.lastMessage || 'Nová konverzace'}
                    </p>
                  </div>
                  {chatUnread > 0 && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="nav-badge" style={{ marginLeft: 0 }}>{chatUnread}</span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat messages area */}
      <div className={`chat-main ${!activeChat ? 'chat-main-hidden' : ''}`}>
        {activeChat && activeChatData ? (
          <>
            {/* Chat header */}
            <div className="chat-header">
              <button onClick={() => setActiveChat(null)} className="chat-back-btn">
                <ArrowLeft size={18} />
              </button>
              <div className={`chat-avatar small ${activeChatData.type === 'group' ? 'group' : ''}`}>
                {getChatAvatar(activeChatData)}
              </div>
              <div>
                <h3 className="chat-header-name">{getChatDisplayName(activeChatData)}</h3>
                <p className="chat-header-info">
                  {activeChatData.type === 'group'
                    ? `${activeChatData.members.length} členů`
                    : (() => {
                        const otherUid = activeChatData.members.find(m => m !== user?.uid);
                        const otherUser = allUsers.find(u => u.uid === otherUid);
                        return otherUser?.isOnline ? '🟢 Online' : 'Offline';
                      })()
                  }
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="chat-messages-empty">
                  <p>Začněte konverzaci 👋</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isOwn = msg.senderId === user?.uid;
                  const showName = !isOwn && activeChatData.type === 'group' &&
                    (i === 0 || messages[i - 1].senderId !== msg.senderId);
                  return (
                    <div key={msg.id} className={`chat-message ${isOwn ? 'own' : 'other'}`}>
                      {showName && (
                        <span className="chat-message-sender">{msg.senderName}</span>
                      )}
                      <div className={`chat-bubble ${isOwn ? 'own' : 'other'}`}>
                        <p>{msg.content}</p>
                        <span className="chat-bubble-time">
                          {msg.createdAt ? formatTime(msg.createdAt) : '...'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-area">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Napište zprávu..."
                className="chat-input"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || sending}
                className="chat-send-btn"
              >
                <Send size={18} />
              </button>
            </div>
          </>
        ) : (
          <div className="chat-no-selection">
            <MessageSquare size={40} />
            <h3>Vyberte konverzaci</h3>
            <p>Nebo začněte novou</p>
          </div>
        )}
      </div>

      {/* New chat modal */}
      {showNewChat && (
        <div className="chat-modal-overlay" onClick={() => { setShowNewChat(false); setShowGroupForm(false); }}>
          <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="chat-modal-header">
              <h3>{showGroupForm ? 'Nová skupina' : 'Nový chat'}</h3>
              <button onClick={() => { setShowNewChat(false); setShowGroupForm(false); }} className="action-btn">
                <X size={16} />
              </button>
            </div>

            {!showGroupForm ? (
              <>
                {/* Search */}
                <div className="chat-modal-search">
                  <Search size={16} />
                  <input
                    type="text"
                    value={newChatSearch}
                    onChange={(e) => setNewChatSearch(e.target.value)}
                    placeholder="Hledat uživatele..."
                    autoFocus
                  />
                </div>

                {/* Group chat button */}
                <button onClick={() => setShowGroupForm(true)} className="chat-modal-group-btn">
                  <Users size={16} /> Vytvořit skupinu
                </button>

                {/* User list */}
                <div className="chat-modal-list">
                  {filteredUsers.map((u) => (
                    <button key={u.uid} onClick={() => startDirectChat(u)} className="chat-modal-user">
                      <div className="chat-avatar small">
                        <span className="text-xs font-bold">{u.displayName.charAt(0)}</span>
                      </div>
                      <div className="flex-1">
                        <span className="font-medium text-sm">{u.displayName}</span>
                        <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>{u.email}</span>
                      </div>
                      {u.isOnline && <Circle size={8} className="text-emerald-500 fill-emerald-500" />}
                    </button>
                  ))}
                  {filteredUsers.length === 0 && (
                    <p className="text-center text-sm py-6" style={{ color: 'var(--text-muted)' }}>
                      Žádní uživatelé nenalezeni
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Group name */}
                <div style={{ padding: '0 16px' }}>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Název skupiny"
                    className="form-input"
                    autoFocus
                    style={{ marginBottom: 12 }}
                  />
                </div>

                {/* Member selection */}
                <div className="chat-modal-list">
                  {allUsers.filter(u => u.uid !== user?.uid).map((u) => {
                    const isSelected = selectedMembers.includes(u.uid);
                    return (
                      <button
                        key={u.uid}
                        onClick={() => setSelectedMembers(prev =>
                          isSelected ? prev.filter(id => id !== u.uid) : [...prev, u.uid]
                        )}
                        className={`chat-modal-user ${isSelected ? 'selected' : ''}`}
                      >
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
                          isSelected ? 'bg-blue-500 text-white' : ''
                        }`} style={isSelected ? {} : { border: '2px solid var(--border)' }}>
                          {isSelected && <Check size={12} />}
                        </div>
                        <span className="font-medium text-sm">{u.displayName}</span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ padding: 16 }}>
                  <button
                    onClick={handleCreateGroup}
                    disabled={!groupName.trim() || selectedMembers.length === 0}
                    className="primary-btn w-full"
                  >
                    Vytvořit skupinu ({selectedMembers.length} členů)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
