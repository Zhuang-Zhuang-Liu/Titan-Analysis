import React, { useState, useRef, useEffect } from 'react';
import { AgentMessage } from '../utils/api';

interface ChatPanelProps {
  messages: AgentMessage[];
  onSendMessage: (message: string, file?: File) => void;
  isLoading: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage, isLoading }) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() || selectedFile) {
      onSendMessage(inputValue, selectedFile || undefined);
      setInputValue('');
      setSelectedFile(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed-height-container bg-gray-200 dark:bg-zinc-900 rounded-2xl shadow-md overflow-hidden" style={{ height: '100%', maxHeight: '100%', minHeight: '0' }}>
      <div className="px-3 py-2 border-b border-gray-400 dark:border-zinc-700 flex-shrink-0 bg-gray-200 dark:bg-zinc-800">
          <h2 className="text-base font-semibold text-zinc-800 dark:text-gray-100">Chat Bar</h2>
      </div>
      
      <div className="fixed-height-content p-3 custom-scrollbar" style={{ flex: '1 1 auto', minHeight: '0', overflow: 'auto' }}>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} ${index < messages.length - 1 ? 'mb-3' : ''}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                  message.role === 'user'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-gray-100 border border-gray-400 dark:border-zinc-600 rounded-br-none'
                    : 'bg-gray-100 dark:bg-zinc-800 text-zinc-800 dark:text-gray-100 border border-gray-400 dark:border-zinc-600 rounded-bl-none'
                }`}>
              <div className="whitespace-pre-wrap text-sm">{message.content}</div>
              {message.timestamp && (
                <div
                  className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-zinc-500 dark:text-gray-400' : 'text-zinc-500 dark:text-gray-400'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-zinc-800 text-zinc-800 dark:text-gray-100 border border-gray-400 dark:border-zinc-600 rounded-2xl rounded-bl-none px-3 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-3 border-t border-zinc-700 dark:border-gray-600 flex-shrink-0">
        <form onSubmit={handleSubmit} className="space-y-2">
          {selectedFile && (
            <div className="flex items-center justify-between bg-gray-100 dark:bg-zinc-800 border border-gray-400 dark:border-zinc-600 rounded-lg px-3 py-2">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-zinc-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm text-zinc-700 dark:text-gray-100 truncate max-w-xs">{selectedFile.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-zinc-400 dark:text-gray-400 hover:text-white dark:hover:text-gray-200"
                title="Remove file"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          <div className="flex space-x-2">
            <label className="flex items-center justify-center w-9 h-9 bg-gray-100 dark:bg-zinc-800 border border-gray-400 dark:border-zinc-600 hover:bg-gray-300 dark:hover:bg-zinc-700 rounded-lg cursor-pointer transition-colors group relative" title="Attach file (CSV, Excel)">
              <svg className="w-4 h-4 text-zinc-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <input
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
                title="Attach file (CSV, Excel)"
              />
              <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-zinc-700 dark:bg-zinc-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                支持格式: CSV, Excel (.csv, .xlsx, .xls)
              </div>
            </label>
            
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter message..."
              className="flex-1 bg-gray-100 dark:bg-zinc-800 border border-gray-400 dark:border-zinc-600 text-zinc-800 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none scrollbar-hide text-sm"
              rows={1}
              disabled={isLoading}
            />
            
            <button
              type="submit"
              disabled={isLoading || (!inputValue.trim() && !selectedFile)}
              className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
                'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:cursor-not-allowed'
              }`}
              title="Send message"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;