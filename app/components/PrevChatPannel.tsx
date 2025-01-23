import React from 'react';

interface PrevChatItem {
  id: string;
  title: string;
}

interface PrevChatPanelProps {
  previousChats: PrevChatItem[];
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
}

const PrevChatPannel: React.FC<PrevChatPanelProps> = ({
  previousChats,
  selectedChatId,
  onSelectChat,
  onNewChat,
}) => {
  return (
    <div className="w-64 bg-gray-100 p-4 overflow-y-auto h-full">
      <h2 className="text-lg font-semibold mb-4">Previous Chats</h2>

      {/* New Chat Button */}
      <button
        onClick={onNewChat}
        className="w-full py-2 mb-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        + New Chat
      </button>

      <ul className="space-y-2">
        {previousChats.map((item) => (
          <li
            key={item.id}
            className={`p-2 shadow rounded-lg cursor-pointer ${
              selectedChatId === item.id
                ? 'bg-blue-500 text-white'
                : 'bg-white hover:bg-blue-100'
            }`}
            onClick={() => onSelectChat(item.id)}
          >
            {item.title || 'New Chat'}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PrevChatPannel;
