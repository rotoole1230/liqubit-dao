import React, { useState, useRef, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { commands } from '../lib/commands';
import { ConversationalLLM } from '../ai/conversation';

interface Message {
  role: 'user' | 'assistant' | 'system' | 'chart';
  content: string | any;
  timestamp: Date;
}

interface ChartData {
  name: string;
  value: number;
}

const Terminal: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: `Welcome to LIQUBIT Terminal v2! Available commands:
• /analyze <token> - Deep analysis of a token
• /market [token] - Market overview or token data
• /chart <token> - Display price chart
• /help - Show all commands`,
      timestamp: new Date(Date.now())
    }
  ]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const llm = useRef(new ConversationalLLM());

  const parseCommand = (input: string) => {
    if (!input.startsWith('/')) return null;
    const parts = input.slice(1).split(' ');
    const command = parts[0];
    const args = parts.slice(1);
    return { command, args };
  };

  const handleCommand = async (commandStr: string, args: string[]) => {
    if (commands[commandStr]) {
      try {
        const result = await commands[commandStr].execute(args);
        if (commandStr === 'market' && args[0]) {
          // If it's market data for a specific token, parse and display as chart
          const data = JSON.parse(result);
          return {
            role: 'chart',
            content: {
              data: [
                { name: '24h', value: data.metrics.price },
                { name: 'High', value: data.metrics.high24h },
                { name: 'Low', value: data.metrics.low24h }
              ],
              token: args[0].toUpperCase()
            }
          };
        }
        return { role: 'system', content: result };
      } catch (error) {
        return {
          role: 'system',
          content: `Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
    return { role: 'system', content: 'Unknown command. Type /help for available commands.' };
  };

  const renderMessage = (message: Message) => {
    if (message.role === 'chart' && typeof message.content === 'object') {
      return (
        <div className="h-64 w-full bg-gray-800 rounded-lg p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={message.content.data}>
              <XAxis dataKey="name" stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
          <div className="text-center mt-2 text-sm text-gray-400">
            {message.content.token} Price Chart
          </div>
        </div>
      );
    }

    return (
      <div className={`max-w-3/4 p-3 rounded-lg ${
        message.role === 'user'
          ? 'bg-blue-600 text-white'
          : message.role === 'system'
          ? 'bg-gray-700 text-gray-200'
          : 'bg-gray-800 text-gray-100'
      }`}>
        <div className="whitespace-pre-wrap">
          {typeof message.content === 'string' ? message.content : JSON.stringify(message.content, null, 2)}
        </div>
        <div className="text-xs opacity-50 mt-1">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    );
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
      timestamp: new Date(Date.now())
    }]);

    try {
      const parsedCommand = parseCommand(userQuery);
      let response;

      if (parsedCommand) {
        const { command, args } = parsedCommand;
        response = await handleCommand(command, args);
      } else {
        const aiResponse = await llm.current.chat(userQuery);
        response = { role: 'assistant', content: aiResponse };
      }

      setMessages(prev => [...prev, {
        ...response,
        timestamp: new Date(Date.now())
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Something went wrong'}`,
        timestamp: new Date(Date.now())
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Rest of the component remains the same...
  // (Terminal header, message rendering, input form)

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      {/* Terminal Header */}
      <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span className="text-sm font-mono">LIQUBIT Terminal v2</span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}>
            {renderMessage(message)}
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-800 p-3 rounded-lg">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type a command (/help) or ask a question..."
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={isProcessing}
            className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default Terminal;