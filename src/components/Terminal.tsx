import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal as TerminalIcon,
  ArrowDownUp,
  BarChart3,
  Cpu,
  Clock
} from 'lucide-react';
import { EnhancedLLM } from '../ai/enhanced-conversation';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

const Terminal = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef(null);
  const llmRef = useRef<EnhancedLLM | null>(null);

  const [metrics] = useState({
    latency: '150ms',
    accuracy: '87%',
    processing: '100k/s'
  });

  // Initialize LLM
  useEffect(() => {
    try {
      llmRef.current = new EnhancedLLM();
      console.log('LLM initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LLM:', error);
      setMessages(prev => [...prev, {
        role: 'system',
        content: 'Error: AI system initialization failed. Please check configuration.',
        timestamp: new Date()
      }]);
    }
  }, []);

  // Handle time updates
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString());
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);

    return () => clearInterval(timer);
  }, []);

  // Initialize system message only once
  useEffect(() => {
    if (currentTime && !isInitialized) {
      setMessages([
        {
          role: 'system',
          content: `SYSTEM●${currentTime}\nLIQUBIT TERMINAL v2.0 [INITIALIZED]\nProcessing Layer: LLaMA-3.3-70B\nInference: Groq\nNetworks: Solana | Base\nStatus: Ready for market analysis...`,
          timestamp: new Date()
        }
      ]);
      setIsInitialized(true);
    }
  }, [currentTime, isInitialized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !llmRef.current) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await llmRef.current.chat(input.trim());
      console.log('Got response:', response); // Debug log

      // Add assistant's response to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error processing query:', error);

      setMessages(prev => [...prev, {
        role: 'system',
        content: 'Error processing request. Please check console for details.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentTime) return null;

  return (
    <div className="flex flex-col h-screen bg-black text-terminal-green font-mono">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black border-b border-terminal-green/20 text-xs">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" />
          {currentTime}
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-3 h-3" />
            {metrics.latency}
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-3 h-3" />
            {metrics.accuracy}
          </div>
          <div className="flex items-center gap-2">
            <ArrowDownUp className="w-3 h-3" />
            {metrics.processing}
          </div>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`
              rounded px-3 py-2 
              ${msg.role === 'system' 
                ? 'font-bold' 
                : msg.role === 'user'
                ? 'bg-terminal-green/5 border-l-2 border-terminal-green ml-8'
                : 'bg-black/30 border-l-2 border-terminal-green/50 mr-8'}
            `}
          >
            <div className="flex items-center gap-2 mb-1 text-xs opacity-70">
              <span>{msg.role.toUpperCase()}</span>
              <span>●</span>
              <span>{msg.timestamp.toLocaleTimeString()}</span>
            </div>
            <div className="whitespace-pre-wrap">{msg.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-terminal-green/50">
            <div className="animate-spin">
              <ArrowDownUp className="w-4 h-4" />
            </div>
            <span>Processing market data...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-terminal-green/20">
        <div className="flex items-center gap-2">
          <span className="text-terminal-green">{'>'}</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-black text-terminal-green border border-terminal-green/20 rounded px-4 py-2 focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green"
            placeholder="Enter market analysis query..."
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading}
            className="px-6 py-2 bg-terminal-green/10 text-terminal-green border border-terminal-green/20 rounded hover:bg-terminal-green/20 transition-all disabled:opacity-50 uppercase tracking-wider text-sm"
          >
            Execute
          </button>
        </div>
      </form>
    </div>
  );
};

export default Terminal;