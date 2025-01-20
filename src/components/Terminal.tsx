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
        <div className={`max-w-[80%] p-4 rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.1)] backdrop-blur-sm
          ${isUser 
            ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-br-none' 
            : message.role === 'system'
              ? 'bg-violet-500/10 border border-violet-500/30 text-violet-300 rounded-bl-none'
              : 'bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-bl-none'}`}>
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
    <div className="flex flex-col h-screen bg-gray-900 text-cyan-400 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Terminal Header */}
      <div className="flex items-center justify-between p-3 bg-black/50 border-b border-cyan-500/30 shadow-lg backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse delay-75" />
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse delay-150" />
        </div>
        <span className="text-sm font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
          LIQUBIT Terminal v2
        </span>
        <div className="w-16" />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-grid-pattern">
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
      <form onSubmit={handleSubmit} className="p-4 border-t border-cyan-500/30 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-cyan-950/50 text-cyan-300 rounded-lg px-4 py-3 border border-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400 placeholder-cyan-700"
            placeholder="Type a command (/help) or ask a question..."
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={isProcessing}
            className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-6 py-3 rounded-lg hover:bg-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 transition-all duration-200 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)]"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default Terminal;