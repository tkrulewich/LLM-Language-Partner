import React from 'react';

interface ChatHistoryItem {
  id: string;
  title: string;
}

interface ChatHistoryPanelProps {
  history: ChatHistoryItem[];
  selectedChatId: string | null;
  onSelectHistory: (id: string) => void;
  onNewChat: () => void;
}

const ChatHistoryPanel: React.FC<ChatHistoryPanelProps> = ({
  history,
  selectedChatId,
  onSelectHistory,
  onNewChat,
}) => {
  return (
    <div className="w-64 bg-gray-100 p-4 overflow-y-auto h-full">
      <h2 className="text-lg font-semibold mb-4">Chat History</h2>

      {/* New Chat Button */}
      <button
        onClick={onNewChat}
        className="w-full py-2 mb-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        + New Chat
      </button>

      <ul className="space-y-2">
        {history.map((item) => (
          <li
            key={item.id}
            className={`p-2 shadow rounded-lg cursor-pointer ${
              selectedChatId === item.id
                ? 'bg-blue-500 text-white'
                : 'bg-white hover:bg-blue-100'
            }`}
            onClick={() => onSelectHistory(item.id)}
          >
            {item.title || 'New Chat'}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatHistoryPanel;
