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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs h-[calc(100vh-8.5rem)] flex flex-col">
      {/* Campfire Header */}
      <div className="p-5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Campfire Chat</h2>
            <p className="text-sm font-medium text-slate-500">Real-time team messaging & informal discussions</p>
          </div>
        </div>

        {/* Channels */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl">
          {['general', 'development', 'design'].map((ch) => (
            <button
              key={ch}
              onClick={() => setActiveChannel(ch)}
              className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                activeChannel === ch ? 'bg-white text-slate-900 shadow-xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
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
              className={`w-10 h-10 rounded-full ${msg.avatarBg} font-extrabold flex items-center justify-center text-base shadow-xs shrink-0`}
            >
              {msg.senderAvatar}
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 max-w-xl shadow-2xs space-y-1">
              <div className="flex items-center justify-between gap-6 mb-1">
                <span className="text-sm font-bold text-slate-900">{msg.sender}</span>
                <span className="text-xs font-semibold text-slate-400">{msg.timestamp}</span>
              </div>
              <p className="text-base font-medium text-slate-800 leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chat Input Form */}
      <form onSubmit={handleSubmit} className="p-5 border-t border-slate-200 flex items-center gap-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Type a message in #${activeChannel}...`}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-base text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-slate-900 hover:bg-black text-white font-bold text-base rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          Send
        </button>
      </form>
    </div>
  );
};
