import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CommandLineIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { EnhancedLLM } from '../ai/enhanced-conversation';
import { commands } from '../lib/commands';

interface Message {
  role: 'user' | 'assistant' | 'system' | 'chart';
  content: string | any;
  timestamp: Date;
}

const Terminal: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const llm = useRef(new EnhancedLLM());

  useEffect(() => {
    setMessages([{
      role: 'system',
      content: 'Welcome to LIQUBIT Terminal v2! Type /help for available commands.',
      timestamp: new Date()
    }]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userQuery = input.trim();
    setInput('');
    setIsProcessing(true);

    setMessages(prev => [...prev, {
      role: 'user',
      content: userQuery,
      timestamp: new Date()
    }]);

    try {
      const response = { role: 'system', content: 'Command processing...' };
      setMessages(prev => [...prev, {
        ...response,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, idx) => (
          <div key={idx} className="mb-4">
            <div className={`p-3 rounded ${
              msg.role === 'user' ? 'bg-blue-500 ml-auto' : 'bg-gray-700'
            } max-w-[80%]`}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-gray-800">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-2 rounded bg-gray-700 text-white"
            placeholder="Type a command..."
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 rounded text-white"
            disabled={isProcessing}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default Terminal;