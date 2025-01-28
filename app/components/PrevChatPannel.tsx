import React from 'react';
import { Trash2 } from 'lucide-react';

interface PrevChatItem {
  id: string;
  title: string;
}

interface PrevChatPanelProps {
  previousChats: PrevChatItem[];
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
}

const PrevChatPannel: React.FC<PrevChatPanelProps> = ({
  previousChats,
  selectedChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
}) => {
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent chat selection when clicking delete
    onDeleteChat(id);
  };

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
            className={`group p-2 shadow rounded-lg cursor-pointer flex items-center justify-between ${
              selectedChatId === item.id
                ? 'bg-blue-500 text-white'
                : 'bg-white hover:bg-blue-100'
            }`}
            onClick={() => onSelectChat(item.id)}
          >
            <span className="truncate flex-1 mr-2">{item.title || 'New Chat'}</span>
            <button
              onClick={(e) => handleDelete(e, item.id)}
              className={`p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                selectedChatId === item.id
                  ? 'hover:bg-blue-600 text-white'
                  : 'hover:bg-gray-200 text-gray-600'
              }`}
              aria-label="Delete chat"
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PrevChatPannel;