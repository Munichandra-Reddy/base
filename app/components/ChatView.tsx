'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChatMessage } from '@/lib/types';

interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (content: string, channel: string) => void;
  currentUser?: { email: string; fullName: string; companyName: string } | null;
}

export const ChatView: React.FC<ChatViewProps> = ({ messages, onSendMessage, currentUser }) => {
  const [input, setInput] = useState('');
  const [activeChannel, setActiveChannel] = useState('general');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to extract timestamp in ms for strict chronological sorting (oldest at top, latest below)
  const getMessageTime = (msg: ChatMessage): number => {
    if (typeof msg.createdAt === 'number' && msg.createdAt > 0) {
      return msg.createdAt;
    }
    if (msg.id && msg.id.startsWith('c-')) {
      const idNum = parseInt(msg.id.replace('c-', ''), 10);
      if (!isNaN(idNum) && idNum > 1000000000) {
        return idNum;
      }
    }
    const dateStr = msg.date || '2026-11-04';
    if (msg.timestamp) {
      const parsed = Date.parse(`${dateStr} ${msg.timestamp}`);
      if (!isNaN(parsed)) return parsed;
    }
    if (msg.id === 'c-1') return 1600000000001;
    if (msg.id === 'c-2') return 1600000000002;
    if (msg.id === 'c-3') return 1600000000003;
    return 0;
  };

  const getMessageDateKey = (msg: ChatMessage): string => {
    if (msg.date) return msg.date;
    const time = getMessageTime(msg);
    if (time > 1000000000) {
      const d = new Date(time);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return '2026-11-04';
  };

  const formatDateDivider = (dateKey: string): string => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    if (dateKey === todayStr) return 'Today';
    if (dateKey === yesterdayStr) return 'Yesterday';

    try {
      const [year, month, day] = dateKey.split('-').map(Number);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const dateObj = new Date(year, month - 1, day);
        return dateObj.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    } catch (e) {}

    return dateKey;
  };

  const filteredMessages = useMemo(() => {
    return messages.filter((m) => m.channel === activeChannel);
  }, [messages, activeChannel]);

  // Strict chronological sorting: oldest at top, latest at bottom like WhatsApp
  const sortedMessages = useMemo(() => {
    return [...filteredMessages].sort((a, b) => getMessageTime(a) - getMessageTime(b));
  }, [filteredMessages]);

  // Group messages date-wise
  const groupedMessages = useMemo(() => {
    const groups: { dateKey: string; label: string; messages: ChatMessage[] }[] = [];
    const map = new Map<string, ChatMessage[]>();

    sortedMessages.forEach((msg) => {
      const key = getMessageDateKey(msg);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(msg);
    });

    map.forEach((msgs, key) => {
      groups.push({
        dateKey: key,
        label: formatDateDivider(key),
        messages: msgs,
      });
    });

    return groups;
  }, [sortedMessages]);

  // Auto-scroll to bottom so latest messages are visible below
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sortedMessages.length, activeChannel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input.trim(), activeChannel);
    setInput('');
  };

  const isMyMessage = (msg: ChatMessage) => {
    if (!currentUser) return false;
    const myName = (currentUser.fullName || '').toLowerCase().trim();
    const myEmail = (currentUser.email || '').toLowerCase().trim();
    const sender = (msg.sender || '').toLowerCase().trim();
    return (
      (myName && sender === myName) ||
      (myEmail && sender === myEmail) ||
      sender === 'you' ||
      sender === 'me'
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-micro h-[calc(100vh-8.5rem)] flex flex-col font-sans overflow-hidden">
      {/* Campfire Header */}
      <div className="p-4 md:p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#6CC04A] text-white flex items-center justify-center font-black text-lg shadow-xs">
            #
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-extrabold text-[#0F172A]">Campfire Chat</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#10B981] border border-[#10B981]/20">
                Live
              </span>
            </div>
            <p className="text-xs font-medium text-[#64748B]">
              Real-time team messaging • active in <strong className="text-[#0F172A]">#{activeChannel}</strong>
            </p>
          </div>
        </div>

        {/* Channel Switcher */}
        <div className="flex items-center gap-1.5 bg-[#F4F6F8] p-1 rounded-xl border border-[#E5E5E5]">
          {['general', 'development', 'design'].map((ch) => (
            <button
              key={ch}
              onClick={() => setActiveChannel(ch)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                activeChannel === ch
                  ? 'bg-[#6CC04A] text-white shadow-xs'
                  : 'text-[#595959] hover:text-[#0F172A]'
              }`}
            >
              #{ch}
            </button>
          ))}
        </div>
      </div>

      {/* WhatsApp Style Messages Stream Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#F8FAFC]">
        {sortedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2 text-[#64748B]">
            <div className="w-12 h-12 rounded-full bg-[#EBF0F5] flex items-center justify-center text-xl">
              💬
            </div>
            <div className="text-sm font-bold text-[#0F172A]">No messages in #{activeChannel} yet</div>
            <p className="text-xs text-[#64748B]">Type a message below to start the conversation!</p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.dateKey} className="space-y-3">
              {/* WhatsApp Date Divider Pill */}
              <div className="flex justify-center my-3 sticky top-1 z-10 select-none">
                <span className="bg-[#E2E8F0]/90 backdrop-blur-xs text-[#334155] text-[11px] font-bold px-3 py-1 rounded-full shadow-2xs border border-[#CBD5E1]">
                  {group.label}
                </span>
              </div>

              {/* Messages in this date */}
              <div className="space-y-2.5">
                {group.messages.map((msg) => {
                  const isMe = isMyMessage(msg);

                  if (isMe) {
                    // Outgoing (My) Message - Right Aligned (WhatsApp green bubble)
                    return (
                      <div key={msg.id} className="flex justify-end items-end group">
                        <div className="bg-[#D9FDD3] border border-[#BDE3A8] text-[#111B21] rounded-2xl rounded-tr-xs px-3.5 py-2 max-w-sm sm:max-w-md md:max-w-lg shadow-2xs transition-shadow hover:shadow-xs">
                          <p className="text-sm font-normal text-[#111B21] leading-relaxed break-words whitespace-pre-wrap">
                            {msg.content}
                          </p>
                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] font-semibold text-[#595959] select-none">
                            <span>{msg.timestamp}</span>
                            <span className="text-[#34B7F1] font-bold text-xs leading-none" title="Delivered">
                              ✓✓
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Incoming (Other's) Message - Left Aligned (WhatsApp white bubble)
                  return (
                    <div key={msg.id} className="flex items-start gap-2.5 justify-start group">
                      <div
                        className={`w-8 h-8 rounded-full ${msg.avatarBg || 'bg-[#049FD9] text-white'} font-bold flex items-center justify-center text-xs shadow-xs shrink-0 mt-0.5 select-none`}
                      >
                        {msg.senderAvatar || (msg.sender ? msg.sender[0].toUpperCase() : 'U')}
                      </div>
                      <div className="bg-white border border-[#E2E8F0] text-[#111B21] rounded-2xl rounded-tl-xs px-3.5 py-2 max-w-sm sm:max-w-md md:max-w-lg shadow-2xs transition-shadow hover:shadow-xs">
                        <div className="mb-0.5">
                          <span className="text-xs font-bold text-[#049FD9]">{msg.sender}</span>
                        </div>
                        <p className="text-sm font-normal text-[#111B21] leading-relaxed break-words whitespace-pre-wrap">
                          {msg.content}
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] font-semibold text-[#64748B] select-none">
                          <span>{msg.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        {/* Invisible anchor to ensure smooth scroll to latest message below */}
        <div ref={messagesEndRef} />
      </div>

      {/* WhatsApp Style Chat Input Form */}
      <form onSubmit={handleSubmit} className="p-3.5 md:p-4 border-t border-[#E2E8F0] bg-white flex items-center gap-3 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Type a message in #${activeChannel}...`}
          className="flex-1 bg-[#F1F3F6] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#0F172A] font-medium placeholder:text-[#94A3B8] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] transition-all"
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-[#049FD9] hover:bg-[#004BAF] active:bg-[#049FD9] text-white font-semibold text-sm rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <span>Send</span>
          <svg className="w-3.5 h-3.5 fill-current rotate-45 -mt-0.5" viewBox="0 0 20 20">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </form>
    </div>
  );
};
