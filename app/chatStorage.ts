// chatStorage.ts
import { ChatMessage } from './components/ChatView';

export interface StoredChat {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastUpdated: number;
}

export const chatStorage = {
  saveChat(chatId: string, messages: ChatMessage[]) {
    try {
      // Get existing chats
      const existingChats = this.getAllChats();
      
      // Create or update chat
      const chatToSave: StoredChat = {
        id: chatId,
        title: this.generateTitle(messages),
        messages,
        lastUpdated: Date.now()
      };
      
      // Update in existing chats array
      const chatIndex = existingChats.findIndex(chat => chat.id === chatId);
      if (chatIndex >= 0) {
        existingChats[chatIndex] = chatToSave;
      } else {
        existingChats.unshift(chatToSave);
      }
      
      // Save to localStorage
      localStorage.setItem('chats', JSON.stringify(existingChats));
      
      return chatToSave;
    } catch (error) {
      console.error('Error saving chat:', error);
      return null;
    }
  },

  getChat(chatId: string): StoredChat | null {
    try {
      const chats = this.getAllChats();
      return chats.find(chat => chat.id === chatId) || null;
    } catch (error) {
      console.error('Error getting chat:', error);
      return null;
    }
  },

  getAllChats(): StoredChat[] {
    try {
      const chatsJson = localStorage.getItem('chats');
      return chatsJson ? JSON.parse(chatsJson) : [];
    } catch (error) {
      console.error('Error getting all chats:', error);
      return [];
    }
  },

  deleteChat(chatId: string): boolean {
    try {
      const chats = this.getAllChats().filter(chat => chat.id !== chatId);
      localStorage.setItem('chats', JSON.stringify(chats));
      return true;
    } catch (error) {
      console.error('Error deleting chat:', error);
      return false;
    }
  },

  generateTitle(messages: ChatMessage[]): string {
    // Find first user message to use as title
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (!firstUserMessage) return 'New Chat';
    
    // Truncate message to create title
    const title = firstUserMessage.content.slice(0, 30);
    return title.length < firstUserMessage.content.length ? `${title}...` : title;
  }
}