// ChatView.tsx
import React, { useMemo } from 'react';
import { Send, RotateCcw, Loader2 } from 'lucide-react';
import { diffWords } from 'diff';

export interface ChatMessage {
  role: "system" | "assistant" | "user";
  content: string;
}

interface ProcessedMessage {
  type: "user" | "partner" | "correction" | "system";
  original?: string;
  corrected?: string;
  explanation?: string;
  conversation?: string;
  text?: string;
  timestamp: string;
}

interface ParsedLLMResponse {
  original: string;
  corrected: string;
  explanation: string;
  conversation: string;
}

interface ChatViewProps {
  messages: ChatMessage[];
  inputValue: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
}

const parseLLMResponse = (response: string): ParsedLLMResponse => {
  try {
    const jsonRegex = /\{(?:[^{}]|(?:\{[^{}]*\}))*\}/;
    const match = response.match(jsonRegex);
    if (!match) {
      return {
        original: '',
        corrected: '',
        explanation: '',
        conversation: response,
      };
    }

    const jsonStr = match[0]
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\n\r]/g, ' ')
      .replace(/,\s*}/g, '}');

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (err) {
      console.error('JSON parse error:', err);
      return {
        original: '',
        corrected: '',
        explanation: '',
        conversation: response,
      };
    }

    const leftover = response.slice(response.indexOf(match[0]) + match[0].length).trim();

    if (
      typeof parsed.original !== 'string' ||
      typeof parsed.corrected !== 'string' ||
      typeof parsed.explanation !== 'string'
    ) {
      console.error('Parsed JSON does not match the expected structure.');
      return {
        original: '',
        corrected: '',
        explanation: '',
        conversation: response,
      };
    }

    return {
      original: parsed.original,
      corrected: parsed.corrected,
      explanation: parsed.explanation,
      conversation: leftover || '',
    };
  } catch (error) {
    console.error('Error parsing response:', error);
    return {
      original: '',
      corrected: '',
      explanation: '',
      conversation: response,
    };
  }
};

const ChatView: React.FC<ChatViewProps> = ({
  messages,
  inputValue,
  isLoading,
  onInputChange,
  onSend
}) => {
  const processedMessages = useMemo(() => {
    const processed: ProcessedMessage[] = [];
    
    messages.forEach((message, index) => {
      if (message.role === 'system') return;
      
      if (message.role === 'user') {
        processed.push({
          type: 'user',
          original: message.content,
          timestamp: new Date().toLocaleTimeString(),
        });
      } else if (message.role === 'assistant') {
        const parsed = parseLLMResponse(message.content);
        
        // Update the last user message with corrections if they exist
        if (parsed.corrected && processed.length > 0) {
          const lastMsg = processed[processed.length - 1];
          if (lastMsg.type === 'user') {
            lastMsg.corrected = parsed.corrected;
          }
        }
        
        // Add correction message if there's an explanation
        if (parsed.explanation) {
          processed.push({
            type: 'correction',
            explanation: parsed.explanation,
            timestamp: new Date().toLocaleTimeString(),
          });
        }
        
        // Add the conversation response
        processed.push({
          type: 'partner',
          text: parsed.conversation || 'I understand! Please continue.',
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    });
    
    return processed;
  }, [messages]);

  const computeDiffParts = (originalText: string, correctedText: string) => {
    if (!originalText) {
      return [{ value: correctedText, added: false, removed: false }];
    }
    if (!correctedText) {
      return [{ value: originalText, added: false, removed: false }];
    }
    return diffWords(originalText, correctedText);
  };

  const renderDiff = (originalText: string, correctedText: string) => {
    const diffParts = computeDiffParts(originalText, correctedText);

    return (
      <span>
        {diffParts.map((part, i) => {
          if (part.added) {
            return (
              <span key={i} className="bg-green-200 text-green-900 px-1 rounded">
                {part.value}
              </span>
            );
          } else if (part.removed) {
            return (
              <span key={i} className="line-through text-red-500 bg-red-50 px-1 rounded">
                {part.value}
              </span>
            );
          } else {
            return <span key={i}>{part.value}</span>;
          }
        })}
      </span>
    );
  };

  const renderMessage = (message: ProcessedMessage, index: number) => {
    if (message.type === 'correction') {
      return (
        <div key={index} className="my-2 p-2 bg-yellow-50 rounded-lg">
          <div className="text-sm text-gray-600">{message.explanation}</div>
        </div>
      );
    }

    if (message.type === 'system') {
      return (
        <div key={index} className="my-2 p-2 bg-red-50 rounded-lg text-center text-red-600">
          {message.text}
        </div>
      );
    }

    if (message.type === 'partner') {
      return (
        <div key={index} className="flex justify-start my-2">
          <div className="max-w-[70%] p-3 rounded-lg bg-gray-100 text-gray-800">
            <div className="text-sm">{message.text}</div>
            <div className="text-xs mt-1 opacity-70">{message.timestamp}</div>
          </div>
        </div>
      );
    }

    if (message.type === 'user') {
      return (
        <div key={index} className="flex justify-end my-2">
          <div className="max-w-[70%] p-3 rounded-lg bg-blue-500 text-white">
            <div className="text-sm">
              {message.corrected && message.corrected !== message.original
                ? renderDiff(message.original!, message.corrected)
                : message.original}
            </div>
            <div className="text-xs mt-1 opacity-70">{message.timestamp}</div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Language Practice Chat</h2>
          <p className="text-sm text-gray-500">Practice with an AI language partner</p>
        </div>

        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {processedMessages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              Start the conversation! Try writing something in English and I'll help you improve it.
            </div>
          ) : (
            processedMessages.map((message, index) => renderMessage(message, index))
          )}
        </div>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSend()}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={onSend}
              disabled={isLoading}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;