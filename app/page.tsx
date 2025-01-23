'use client';

import LanguageLearningChat from './components/LanguageLearningChat';
import ChatHistoryPanel from './components/ChatHistoryPannel';

import React, { useState } from 'react';

export default function Page() {
  const [history, setHistory] = React.useState<{ id: string; title: string }[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);

  function onSelectHistory(id: string) {
    setSelected(id);
  }
  
  function onNewChat() {
    const id = Math.random().toString(36).substr(2, 9);
    setHistory([{ id: id, title: '' }, ...history]);
    setSelected(id);

  }
  return (
    <main className="min-h-screen flex">
      {/* Left Panel: Chat History */}
      <div className="w-64 bg-gray-100 border-r">
        <ChatHistoryPanel history={history} selectedChatId={selected} onSelectHistory={onSelectHistory} onNewChat={onNewChat} />
      </div>

      {/* Right Panel: Chat Component */}
      <div className="flex-1">
        <LanguageLearningChat />
      </div>
    </main>
  );
}
