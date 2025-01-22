'use client';

import React, { useState } from 'react';
import { diffWords } from 'diff';
import { Send, RotateCcw, Loader2 } from 'lucide-react';

interface ChatMessage {
  role: "system" | "assistant" | "user";
  content: string;
}

// Processed messages for rendering in the chat UI
type ProcessedMessage =
  | {
      type: "user";
      original: string;
      corrected: string;
      explanation: string;
      conversation: string;
      timestamp: string;
    }
  | {
      type: "partner";
      text: string;
      timestamp: string;
    }
  | {
      type: "correction";
      explanation: string;
      timestamp: string;
    }
  | {
      type: "system";
      text: string;
      timestamp: string;
    };

// Shape of the parsed response from the LLM
interface ParsedLLMResponse {
  original: string;
  corrected: string;
  explanation: string;
  conversation: string;
}


const LanguageLearningChat = () => {
    // Updated system prompt for original+corrected approach
    const SYSTEM_PROMPT = `You are a helpful language learning partner. Analyze each message for language mistakes and respond in exactly this format:

    FIRST, output a single-line JSON object:
    {
      "original": "the user’s text exactly as they wrote it",
      "corrected": "the corrected text if there are mistakes, or the same as 'original' if there are none",
      "explanation": "brief explanation of the correction(s)"
    }
    
    THEN, on a new line after that JSON object, write a natural conversational response.
    
    IMPORTANT:
    1. The JSON must be a single line with no line breaks.
    2. Keep corrections focused on 1–2 of the most important mistakes.
    3. Always validate your JSON to ensure it is properly formatted.
    4. If there are no mistakes, keep 'original' and 'corrected' the same and 'explanation' empty.
    
    Example 1 (with mistakes):
    {"original":"I am useing the wrongt words","corrected":"I am using the wrong words","explanation":"useing → using, wrongt → wrong"}
    Looks good! Let’s keep going.
    
    Example 2 (no mistakes):
    {"original":"Everything is perfect here!","corrected":"Everything is perfect here!","explanation":""}
    That’s great! Keep up the good work.
    `;
  
  const [messages, setMessages] = useState([{ role: 'system', content: SYSTEM_PROMPT }] as ChatMessage[]);
  const [processedMessages, setProcessedMessages] = useState([] as ProcessedMessage[]);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

      console.log(result.choices[0].message.content)

      return result.choices[0].message.content;
    } catch (error) {
      console.error('Error calling /api/chat:', error);
      throw error;
    }

  }
  

  /**
   * Parses the LLM response to extract a JSON block (original, corrected, explanation)
   * and the leftover conversational response. If parsing fails, we return fallback values.
   */
  const parseLLMResponse = (response: string): ParsedLLMResponse => {
    try {
      // Find the JSON object using a regex that looks for a {...} block
      const jsonRegex = /\{(?:[^{}]|(?:\{[^{}]*\}))*\}/;
      const match = response.match(jsonRegex);
      if (!match) {
        // No JSON found; fallback
        return {
          original: '',
          corrected: '',
          explanation: '',
          conversation: response,
        };
      }

      // Extract JSON substring
      const jsonStr = match[0]
        .replace(/[\u201C\u201D]/g, '"') // Replace any “smart quotes”
        .replace(/[\n\r]/g, ' ')        // Remove newlines
        .replace(/,\s*}/g, '}');        // Remove trailing commas if any

      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (err) {
        // If JSON parsing fails, fallback
        console.error('JSON parse error:', err);
        return {
          original: '',
          corrected: '',
          explanation: '',
          conversation: response,
        };
      }

      // The leftover conversation is everything after the JSON block
      const leftover = response.slice(response.indexOf(match[0]) + match[0].length).trim();

      // Validate the shape of the parsed data
      if (
        typeof parsed.original !== 'string' ||
        typeof parsed.corrected !== 'string' ||
        typeof parsed.explanation !== 'string'
      ) {
        // Fallback if the structure isn't correct
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
      console.error('Error parsing ChatGPT response:', error);
      return {
        original: '',
        corrected: '',
        explanation: '',
        conversation: response,
      };
    }
  };

  /**
   * Diff utility: given original & corrected text, returns an array
   * of parts that indicate additions/removals/unchanged.
   */
  const computeDiffParts = (originalText: string, correctedText: string) => {
    // If either is empty, just show the original
    if (!originalText) {
      return [{ value: correctedText, added: false, removed: false }];
    }
    if (!correctedText) {
      return [{ value: originalText, added: false, removed: false }];
    }

    return diffWords(originalText, correctedText);
  };

  /**
   * Renders a string with inline diff formatting:
   * - Removed text in red with strikethrough
   * - Added text in green highlight
   * - Unchanged text in normal style
   */
  const renderDiff = (originalText: string, correctedText: string) => {
    const diffParts = computeDiffParts(originalText, correctedText);

    return (
      <span>
        {diffParts.map((part, i) => {
          if (part.added) {
            // This text was inserted in `corrected`
            return (
              <span key={i} className="bg-green-200 text-green-900 px-1 rounded">
                {part.value}
              </span>
            );
          } else if (part.removed) {
            // This text was removed from `original`
            return (
              <span
                key={i}
                className="line-through text-red-500 bg-red-50 px-1 rounded"
              >
                {part.value}
              </span>
            );
          } else {
            // Unchanged
            return <span key={i}>{part.value}</span>;
          }
        })}
      </span>
    );
  };

  /**
   * Sends the user's message to the API and updates state with the response.
   */
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    setIsLoading(true);

    // 1) Store user's raw input as a new message
    const userMessage = {
      'role': 'user',
      'content': inputValue,
    } as ChatMessage;

    const processesdUserMessage = {
      type: 'user',
      original: inputValue,
      corrected: '',
      explanation: '',
      conversation: '',
      timestamp: new Date().toLocaleTimeString(),
    } as ProcessedMessage;

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setProcessedMessages((prev) => [...prev, processesdUserMessage]);
    // 2) Clear input
    setInputValue('');

    try {
      const llmResponse = await callRunPodModel(updatedMessages);

      const responseMessage = {
        'role': 'partner',
        'content': llmResponse,
      };

      setMessages([...updatedMessages, responseMessage] as ChatMessage[]);

      // 4) Parse the returned JSON + leftover conversation
      const parsed = parseLLMResponse(llmResponse);

      // 5) Insert the updated info for the user’s text
      setProcessedMessages((prev) => {
        // Update the last user message with the corrected text, explanation, etc.
        const newMessages = [...prev];
        const lastUserMsg = newMessages[newMessages.length - 1];
        lastUserMsg.corrected = parsed.corrected;
        lastUserMsg.explanation = parsed.explanation;

        // If there's an explanation, add a "correction" message
        if (parsed.explanation) {
          newMessages.push({
            type: 'correction',
            explanation: parsed.explanation,
            timestamp: new Date().toLocaleTimeString(),
          });
        }

        // Add the AI's "conversational" response as a partner message
        newMessages.push({
          type: 'partner',
          text: parsed.conversation || 'I understand! Please continue.',
          timestamp: new Date().toLocaleTimeString(),
        });

        return newMessages;
      });
    } catch (error) {
      // If any error, add an error message
      setMessages((prev) => [
        ...prev,
        {
          type: 'system',
          text: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ] as ChatMessage[]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Renders each message type differently:
   * - user: show the original + corrected text diff
   * - correction: show an explanation block
   * - partner: show AI’s text
   * - system: show an error message, etc.
   */
  const renderMessage = (message, index) => {
    if (message.type === 'correction') {
      // Just show the explanation in a highlight area
      return (
        <div key={index} className="my-2 p-2 bg-yellow-50 rounded-lg">
          <div className="text-sm text-gray-600">
            {message.explanation}
          </div>
        </div>
      );
    }

    if (message.type === 'system') {
      // System or error message
      return (
        <div
          key={index}
          className="my-2 p-2 bg-red-50 rounded-lg text-center text-red-600"
        >
          {message.text}
        </div>
      );
    }

    if (message.type === 'partner') {
      // AI's response
      return (
        <div key={index} className="flex justify-start my-2">
          <div className="max-w-[70%] p-3 rounded-lg bg-gray-100 text-gray-800">
            <div className="text-sm">{message.text}</div>
            <div className="text-xs mt-1 opacity-70">{message.timestamp}</div>
          </div>
        </div>
      );
    }

    // Otherwise, it's a user message: show local diff
    // (original vs. corrected)
    if (message.type === 'user') {
      return (
        <div key={index} className="flex justify-end my-2">
          <div className="max-w-[70%] p-3 rounded-lg bg-blue-500 text-white">
            <div className="text-sm">
              {message.corrected && message.corrected !== message.original
                ? renderDiff(message.original, message.corrected)
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
        {/* Chat header */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Language Practice Chat</h2>
          <p className="text-sm text-gray-500">
            Practice with an AI language partner
          </p>
        </div>

        {/* Messages container */}
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {processedMessages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              Start the conversation! Try writing something in English and I'll
              help you improve it.
            </div>
          ) : (
            processedMessages.map((message, index) => renderMessage(message, index))
          )}
        </div>

        {/* Input area */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            </button>
            <button
              onClick={() => setMessages([])}
              disabled={isLoading}
              className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageLearningChat;
