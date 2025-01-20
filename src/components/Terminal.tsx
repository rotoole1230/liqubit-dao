import React, { useState, useRef, useEffect } from 'react';
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
      content: `Welcome to LIQUBIT Terminal v2! Available commands:
• /analyze <token> - Deep analysis of a token
• /market [token] - Market overview or token data
• /chart <token> - Display price chart
• /help - Show all commands`,
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const parseCommand = (input: string) => {
    if (!input.startsWith('/')) return null;
    const parts = input.slice(1).split(' ');
    const command = parts[0];
    const args = parts.slice(1);
    return { command, args };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userQuery = input.trim();
    setInput('');
    setIsProcessing(true);

    // Add user message
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
        // Process with LLM if not a command
        const aiResponse = await llm.current.chat(userQuery);
        response = { role: 'assistant', content: aiResponse };
      }

      setMessages(prev => [...prev, {
        ...response,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Terminal error:', error);
      let errorMessage = 'An unexpected error occurred';
      
      if (error instanceof Error) {
        if (error.message.includes('GROQ_API_KEY')) {
          errorMessage = 'AI service is not properly configured. Please check API key.';
        } else if (error.message.includes('Groq API error')) {
          errorMessage = 'AI service is temporarily unavailable. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Error: ${errorMessage}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isUser = message.role === 'user';
    return (
      <div key={index} 
           className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-[80%] p-4 rounded-xl shadow-lg 
          ${isUser 
            ? 'bg-blue-600 text-white rounded-br-none' 
            : message.role === 'system'
              ? 'bg-gray-700 text-gray-200 rounded-bl-none'
              : 'bg-indigo-600 text-white rounded-bl-none'}`}>
          <div className="whitespace-pre-wrap">
            {typeof message.content === 'string' 
              ? message.content 
              : JSON.stringify(message.content, null, 2)}
          </div>
          <div className="text-xs opacity-70 mt-2">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
      {/* Terminal Header */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span className="text-sm font-mono font-bold">LIQUBIT Terminal v2</span>
        <div className="w-16" />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message, index) => renderMessage(message, index))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-300" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700 bg-gray-800">
        <div className="flex items-center space-x-4">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-gray-900 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type a command (/help) or ask a question..."
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={isProcessing}
            className="bg-blue-600 px-6 py-3 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default Terminal;