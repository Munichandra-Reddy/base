'use client';

import React, { useState } from 'react';
import { ChatMessage } from '@/lib/types';

interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (content: string, channel: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ messages, onSendMessage }) => {
  const [input, setInput] = useState('');
  const [activeChannel, setActiveChannel] = useState('general');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input, activeChannel);
    setInput('');
  };

  const filteredMessages = messages.filter((m) => m.channel === activeChannel);

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-micro h-[calc(100vh-8.5rem)] flex flex-col font-sans">
      {/* Campfire Header */}
      <div className="p-5 border-b border-[#E5E5E5] flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div>
            <h2 className="text-2xl font-light text-[#222222]">Campfire Chat</h2>
            <p className="text-sm font-medium text-[#595959]">Real-time team messaging & informal discussions</p>
          </div>
        </div>

        {/* Channels */}
        <div className="flex items-center gap-2 bg-[#F4F6F8] p-1.5 rounded-xl border border-[#E5E5E5]">
          {['general', 'development', 'design'].map((ch) => (
            <button
              key={ch}
              onClick={() => setActiveChannel(ch)}
              className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                activeChannel === ch ? 'bg-[#011826] text-white shadow-xs font-bold' : 'text-[#595959] hover:text-[#011826]'
              }`}
            >
              #{ch}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-7 space-y-5">
        {filteredMessages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-4">
            <div
              className={`w-10 h-10 rounded-full ${msg.avatarBg || 'bg-[#011826] text-white'} font-bold flex items-center justify-center text-base shadow-xs shrink-0`}
            >
              {msg.senderAvatar}
            </div>
            <div className="bg-[#F4F6F8] border border-[#E5E5E5] rounded-tl-2xl rounded-br-2xl rounded-tr-md rounded-bl-md p-4 max-w-xl shadow-2xs space-y-1">
              <div className="flex items-center justify-between gap-6 mb-1">
                <span className="text-sm font-bold text-[#222222]">{msg.sender}</span>
                <span className="text-xs font-semibold text-[#595959]">{msg.timestamp}</span>
              </div>
              <p className="text-base font-medium text-[#222222] leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chat Input Form */}
      <form onSubmit={handleSubmit} className="p-5 border-t border-[#E5E5E5] flex items-center gap-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Type a message in #${activeChannel}...`}
          className="flex-1 bg-white border border-[#CCCCCC] rounded-xl px-5 py-3 text-base text-[#222222] font-medium focus:outline-none focus:ring-2 focus:ring-[#049FD9]"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-[#049FD9] hover:bg-[#004BAF] active:bg-[#049FD9] text-white font-semibold text-base rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          Send
        </button>
      </form>
    </div>
  );
};
