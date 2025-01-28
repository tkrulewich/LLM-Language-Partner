'use client';

import ChatView, { ChatMessage } from './components/ChatView';
import PrevChatPannel from './components/PrevChatPannel';
import React, { useState, useEffect } from 'react';
import { chatStorage } from './chatStorage';

const SYSTEM_PROMPT = `You are a helpful language learning partner. Analyze each message for language mistakes and respond in exactly this format:

FIRST, output a single-line JSON object:
{
  "original": "the user's text exactly as they wrote it",
  "corrected": "the corrected text if there are mistakes, or the same as 'original' if there are none",
  "explanation": "brief explanation of the correction(s)"
}

THEN, on a new line after that JSON object, write a natural conversational response.`;

export default function Page() {
  const [history, setHistory] = useState<{ id: string; title: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'system', content: SYSTEM_PROMPT }]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load chat history and create initial chat on first render
  useEffect(() => {
    const chats = chatStorage.getAllChats();
    setHistory(chats.map(chat => ({ id: chat.id, title: chat.title })));
    
    // If no chats exist, create a new one
    if (chats.length === 0) {
      const newChatId = Math.random().toString(36).substr(2, 9);
      const initialMessages = [{ role: 'system', content: SYSTEM_PROMPT }];
      
      const savedChat = chatStorage.saveChat(newChatId, initialMessages);
      if (savedChat) {
        setHistory([{ id: savedChat.id, title: 'New Chat' }]);
        setSelected(newChatId);
        setMessages(initialMessages);
      }
    } else {
      // Select the most recent chat
      setSelected(chats[0].id);
      setMessages(chats[0].messages);
    }
  }, []);

  async function callRunPodModel(messages: ChatMessage[]) {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });

      if (!res.ok) {
        throw new Error(`API returned status: ${res.status}`);
      }

      const { result } = await res.json();
      return result.choices[0].message.content;
    } catch (error) {
      console.error('Error calling /api/chat:', error);
      throw error;
    }
  }

  const generateChatTitle = async (message: string) => {
    try {
      const titlePrompt = `Based on this first message, generate a very brief (2-4 words) title for this chat conversation: "${message}"`;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: titlePrompt }]
        }),
      });

      if (!res.ok) {
        throw new Error(`API returned status: ${res.status}`);
      }

      const { result } = await res.json();
      return result.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating chat title:', error);
      return 'New Chat';
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    setIsLoading(true);

    const userMessage = {
      role: 'user',
      content: inputValue,
    } as ChatMessage;

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');

    try {
      const llmResponse = await callRunPodModel(updatedMessages);
      const responseMessage = {
        role: 'assistant',
        content: llmResponse,
      };
      const newMessages = [...updatedMessages, responseMessage];
      setMessages(newMessages);
      
      // Generate title if this is the first user message
      if (selected && updatedMessages.filter(m => m.role === 'user').length === 1) {
        const title = await generateChatTitle(inputValue);
        const savedChat = chatStorage.saveChat(selected, newMessages, title);
        if (savedChat) {
          setHistory(prev => prev.map(chat => 
            chat.id === selected ? { id: chat.id, title } : chat
          ));
        }
      } else if (selected) {
        // Regular save for subsequent messages
        const savedChat = chatStorage.saveChat(selected, newMessages);
        if (savedChat) {
          setHistory(prev => prev.map(chat => 
            chat.id === selected ? { id: chat.id, title: savedChat.title } : chat
          ));
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  function onSelectHistory(id: string) {
    setSelected(id);
    const chat = chatStorage.getChat(id);
    if (chat) {
      setMessages(chat.messages);
    } else {
      setMessages([{ role: 'system', content: SYSTEM_PROMPT }]);
    }
  }
  
  function onNewChat() {
    const id = Math.random().toString(36).substr(2, 9);
    const initialMessages = [{ role: 'system', content: SYSTEM_PROMPT }];
    
    const savedChat = chatStorage.saveChat(id, initialMessages, 'New Chat');
    if (savedChat) {
      setHistory(prev => [{ id: savedChat.id, title: savedChat.title }, ...prev]);
      setSelected(id);
      setMessages(initialMessages);
      setInputValue('');
    }
  }

  function onDeleteChat(id: string) {
    // Don't allow deleting the last chat
    if (history.length <= 1) {
      return;
    }
  
    const success = chatStorage.deleteChat(id);
    if (success) {
      // Update history state
      setHistory(prev => prev.filter(chat => chat.id !== id));
      
      // If we're deleting the selected chat, select another one
      if (selected === id) {
        const remainingChats = history.filter(chat => chat.id !== id);
        if (remainingChats.length > 0) {
          const nextChat = remainingChats[0];
          setSelected(nextChat.id);
          const chatData = chatStorage.getChat(nextChat.id);
          if (chatData) {
            setMessages(chatData.messages);
          }
        }
      }
    }
  }

  return (
    <main className="min-h-screen flex">
      <div className="w-64 bg-gray-100 border-r">
        <PrevChatPannel
          previousChats={history}
          selectedChatId={selected}
          onSelectChat={onSelectHistory}
          onNewChat={onNewChat}
          onDeleteChat={onDeleteChat}
        />
      </div>
      <div className="flex-1">
        <ChatView
          messages={messages}
          inputValue={inputValue}
          isLoading={isLoading}
          onInputChange={setInputValue}
          onSend={handleSend}
        />
      </div>
    </main>
  );
}