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
    <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-2xs h-full min-h-[500px] flex flex-col font-sans w-full">
      {/* Campfire Header */}
      <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div>
            <h2 className="text-xl font-semibold text-[#111827]">Campfire Chat</h2>
            <p className="text-xs text-[#595959] font-normal">Real-time team messaging & informal discussions</p>
          </div>
        </div>

        {/* Channels */}
        <div className="flex items-center gap-1 bg-[#F4F6F8] p-1 rounded-lg border border-[#E5E5E5] text-xs font-medium">
          {['general', 'development', 'design'].map((ch) => (
            <button
              key={ch}
              onClick={() => setActiveChannel(ch)}
              className={`px-3 py-1.5 rounded-md text-xs capitalize transition-all cursor-pointer ${
                activeChannel === ch ? 'bg-white text-[#111827] shadow-2xs font-semibold' : 'text-[#595959] hover:text-[#111827]'
              }`}
            >
              #{ch}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {filteredMessages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-3.5">
            <div
              className={`w-8 h-8 rounded-full ${msg.avatarBg} font-bold flex items-center justify-center text-xs shadow-2xs shrink-0`}
            >
              {msg.senderAvatar}
            </div>
            <div className="bg-[#F9FAFB] border border-[#E5E5E5] rounded-lg p-3 max-w-xl space-y-1">
              <div className="flex items-center justify-between gap-4 mb-0.5">
                <span className="text-xs font-semibold text-[#111827]">{msg.sender}</span>
                <span className="text-[10px] text-[#6B7280]">{msg.timestamp}</span>
              </div>
              <p className="text-xs text-[#374151] leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chat Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-[#E5E5E5] flex items-center gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Type a message in #${activeChannel}...`}
          className="flex-1 bg-[#F9FAFB] border border-[#E5E5E5] rounded-md px-3.5 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9]"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-[#011826] hover:bg-[#082236] text-white font-medium text-xs rounded-md shadow-2xs transition-colors cursor-pointer"
        >
          Send
        </button>
      </form>
    </div>
  );
};
