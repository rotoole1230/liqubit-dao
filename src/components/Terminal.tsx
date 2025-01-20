
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
      content: `Welcome to LIQUBIT Terminal v2!\n\nAvailable commands:\n• /analyze <token> - Deep analysis\n• /market [token] - Market data\n• /chart <token> - Price chart\n• /help - Commands`,
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const parseCommand = (input: string) => {
    if (!input.startsWith('/')) return null;
    const parts = input.slice(1).split(' ');
    return { command: parts[0], args: parts.slice(1) };
  };

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
      const parsedCommand = parseCommand(userQuery);
      let response;

      if (parsedCommand) {
        const { command, args } = parsedCommand;
        if (commands[command]) {
          const result = await commands[command].execute(args);
          response = { role: 'system', content: result };
        } else {
          response = { role: 'system', content: 'Unknown command. Type /help for available commands.' };
        }
      } else {
        const aiResponse = await llm.current.chat(userQuery);
        response = { role: 'assistant', content: aiResponse };
      }

      setMessages(prev => [...prev, {
        ...response,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Terminal error:', error);
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isUser = message.role === 'user';
    const messageVariants = {
      initial: { opacity: 0, x: isUser ? 20 : -20, y: 20 },
      animate: { opacity: 1, x: 0, y: 0 },
      exit: { opacity: 0, y: -20 }
    };

    return (
      <motion.div
        key={index}
        variants={messageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ type: "spring", stiffness: 100 }}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 px-2 md:px-4`}
      >
        <div
          className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl backdrop-blur-lg
            ${isUser 
              ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-l-4 border-cyan-500 text-cyan-300 ml-auto' 
              : message.role === 'system'
                ? 'bg-gradient-to-br from-violet-500/20 to-purple-500/20 border-l-4 border-violet-500 text-violet-300'
                : 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border-l-4 border-blue-500 text-blue-300'}
            shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-all duration-300`}
        >
          <div className="whitespace-pre-wrap text-sm md:text-base">
            {typeof message.content === 'string' 
              ? message.content 
              : JSON.stringify(message.content, null, 2)}
          </div>
          <div className="text-[10px] md:text-xs opacity-70 mt-2 font-mono">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f] text-cyan-400 overflow-hidden">
      {/* Terminal Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between p-3 bg-gradient-to-r from-black/80 to-gray-900/80 border-b border-cyan-500/30 backdrop-blur-xl z-10"
      >
        <div className="flex items-center space-x-2">
          <div className="flex space-x-2">
            {[['bg-red-500', 0], ['bg-yellow-500', 0.2], ['bg-green-500', 0.4]].map(([color, delay]) => (
              <motion.div 
                key={color}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2, delay: delay }}
                className={`w-3 h-3 rounded-full ${color}`}
              />
            ))}
          </div>
        </div>
        <motion.div
          animate={{ 
            textShadow: ['0 0 8px rgb(34,211,238)', '0 0 16px rgb(34,211,238)', '0 0 8px rgb(34,211,238)']
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-sm font-mono font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400"
        >
          LIQUBIT Terminal v2
        </motion.div>
        <div className="w-16" />
      </motion.div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 bg-gradient-to-b from-gray-900 to-black scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent">
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => renderMessage(message, index))}
          {isProcessing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-start px-4"
            >
              <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 p-4 rounded-xl border-l-4 border-cyan-500/50 backdrop-blur-lg">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-6 h-6 text-cyan-400"
                >
                  <ArrowPathIcon />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <motion.form
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onSubmit={handleSubmit}
        className="p-4 bg-gradient-to-r from-black/90 to-gray-900/90 border-t border-cyan-500/30 backdrop-blur-xl"
      >
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <CommandLineIcon className="h-5 w-5 text-cyan-500/50" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full bg-gradient-to-r from-cyan-950/50 to-blue-950/50 text-cyan-300 rounded-xl pl-12 pr-4 py-3 border border-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400/50 placeholder-cyan-700 text-sm md:text-base"
              placeholder="Type a command (/help) or ask a question..."
              disabled={isProcessing}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={isProcessing}
            className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400 px-6 py-3 rounded-xl hover:from-cyan-500/30 hover:to-blue-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/20 text-sm md:text-base"
          >
            Send
          </motion.button>
        </div>
      </motion.form>
    </div>
  );
};

export default Terminal;
