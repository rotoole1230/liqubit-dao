
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

  // Add typewriter effect for welcome message
  useEffect(() => {
    setMessages([{
      role: 'system',
      content: '> LIQUBIT TERMINAL v2.0 [INITIALIZED]\n> Ready for market analysis...',
      timestamp: new Date()
    }]);
  }, []);

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
    <div className="flex flex-col h-[100dvh] bg-[#0a0f16] text-[#00ff9d] font-terminal relative overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-24 bg-gradient-to-b from-[#00ff9d]/5 to-transparent pointer-events-none z-10" />
      <div className="fixed bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#00ff9d]/5 to-transparent pointer-events-none z-10" />
      <div className="flex-1 overflow-y-auto px-3 py-4 md:p-4 space-y-3 relative scrollbar-thin scrollbar-thumb-[#00ff9d]/30 scrollbar-track-transparent">
        <div className="fixed top-2 right-2 text-[#00ff9d]/40 text-[10px] font-terminal tracking-wider">
          <div className="flex items-center gap-1">
            <CommandLineIcon className="w-3 h-3" />
            SYSTEM:ACTIVE
          </div>
        </div>
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded border-l-2 ${
              msg.role === 'user' 
                ? 'bg-[#00ff9d]/5 border-[#00ff9d] ml-auto text-[#00ff9d]' 
                : msg.role === 'system' 
                  ? 'bg-[#1a1f2c] border-[#00ff9d]/50 font-terminal tracking-wider text-[#00ff9d]/80' 
                  : 'bg-[#131922] border-[#00ff9d]/70 text-[#00ff9d]/90'
            } max-w-[85%] backdrop-blur-sm shadow-lg font-mono text-sm`}
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

      <form onSubmit={handleSubmit} className="sticky bottom-0 p-3 md:p-4 bg-gray-900/80 border-t border-cyan-500/30 backdrop-blur-md">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
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
