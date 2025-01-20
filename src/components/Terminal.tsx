
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CommandLineIcon } from '@heroicons/react/24/outline';
import { EnhancedLLM } from '../ai/enhanced-conversation';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

const Terminal: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const llm = useRef(new EnhancedLLM());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    setMessages([{
      role: 'system',
      content: 'Welcome to LIQUBIT Terminal! Ask me anything about crypto markets.',
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user' as const,
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await llm.current.chat(userMessage.content);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: 'Sorry, there was an error processing your request.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white bg-grid-pattern relative">
      <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-cyan-500/20 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-cyan-500/20 to-transparent pointer-events-none" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
        <div className="absolute top-4 left-4 text-cyan-500 text-xs font-mono animate-pulse">
          LIQUBIT TERMINAL v1.0
        </div>
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg border ${
              msg.role === 'user' 
                ? 'bg-cyan-900/30 border-cyan-500/50 ml-auto text-cyan-100' 
                : msg.role === 'system' 
                  ? 'bg-purple-900/30 border-purple-500/50 text-purple-100' 
                  : 'bg-green-900/30 border-green-500/50 text-green-100'
            } max-w-[80%] backdrop-blur-sm shadow-lg`}
          >
            <p className="text-sm text-gray-300 mb-1">
              {msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}
            </p>
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </motion.div>
        ))}
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-2 text-gray-400"
          >
            <div className="animate-pulse">Thinking...</div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-gray-900/50 border-t border-cyan-500/30 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <CommandLineIcon className="w-5 h-5 text-cyan-500" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-gray-800/50 text-cyan-100 px-4 py-2 rounded-lg border border-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 placeholder-cyan-300/30"
            placeholder="Ask about crypto markets..."
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-cyan-900/50 text-cyan-100 rounded-lg border border-cyan-500/30 hover:bg-cyan-800/50 hover:border-cyan-400 transition-all disabled:opacity-50 font-mono"
          >
            EXECUTE
          </button>
        </div>
      </form>
    </div>
  );
};

export default Terminal;
