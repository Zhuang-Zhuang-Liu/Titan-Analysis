import React, { useEffect, useState, useRef } from 'react';

interface OutputMessage {
  id: string;
  content: string;
  timestamp: Date;
}

interface WorkbenchProps {
  output?: string;
  realtimeOutput?: string;
  onAddMessage?: (content: string) => void;
}

const Workbench: React.FC<WorkbenchProps> = ({ output, realtimeOutput, onAddMessage }) => {
  const [titanOutput, setTitanOutput] = useState<OutputMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const wsRef = useRef<WebSocket | null>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const messageBufferRef = useRef<string[]>([]);
  const bufferTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 字体大小映射
  const fontSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  // 自动滚动到底部
  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [titanOutput]);

  // WebSocket连接
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket('ws://localhost:8000/ws/titan-output');
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket连接已建立');
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          const message = event.data;
          
          // 将消息添加到缓冲区
          messageBufferRef.current.push(message);
          
          // 清除之前的定时器
          if (bufferTimerRef.current) {
            clearTimeout(bufferTimerRef.current);
          }
          
          // 设置新的定时器，将短时间内的消息合并为一个输出
          bufferTimerRef.current = setTimeout(() => {
            if (messageBufferRef.current.length > 0) {
              const combinedMessage = messageBufferRef.current.join('\n');
              const newOutput: OutputMessage = {
                id: Date.now().toString(),
                content: combinedMessage,
                timestamp: new Date()
              };
              
              setTitanOutput(prev => [...prev, newOutput]);
              messageBufferRef.current = [];
            }
          }, 100); // 100ms内合并消息
        };

        ws.onclose = () => {
          console.log('WebSocket连接已关闭');
          setIsConnected(false);
        };

        ws.onerror = (error) => {
          console.error('WebSocket错误:', error);
          setIsConnected(false);
        };
      } catch (error) {
        console.error('WebSocket连接失败:', error);
        setIsConnected(false);
      }
    };

    connectWebSocket();

    // 清理函数
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed-height-container bg-gray-200 dark:bg-zinc-900 rounded-2xl shadow-lg overflow-hidden border border-gray-400/50 dark:border-zinc-700" style={{ height: '100%', maxHeight: '100%', minHeight: '0' }}>
      <div className="px-3 py-2 border-b border-gray-300 dark:border-zinc-700 flex items-center justify-between flex-shrink-0 bg-gray-200 dark:bg-zinc-800">
        <div className="flex items-center space-x-4">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Work Bench</h2>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        </div>
        <div className="flex items-center space-x-2">
          {/* 字体大小调节按钮 */}
          <div className="flex items-center space-x-1 mr-2">
            <button
              onClick={() => setFontSize('small')}
              className={`px-2 py-1 rounded-md transition-colors duration-200 ${fontSize === 'small' ? 'bg-blue-500 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-700'}`}
              title="小字体"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button
              onClick={() => setFontSize('medium')}
              className={`px-2 py-1 rounded-md transition-colors duration-200 ${fontSize === 'medium' ? 'bg-blue-500 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-700'}`}
              title="中字体"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button
              onClick={() => setFontSize('large')}
              className={`px-2 py-1 rounded-md transition-colors duration-200 ${fontSize === 'large' ? 'bg-blue-500 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-700'}`}
              title="大字体"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </div>
          <button
            onClick={async () => {
              try {
                if (onAddMessage) {
                  onAddMessage("正在执行终止操作");
                }
                const response = await fetch('http://localhost:8000/api/test_terminate', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                });
                await response.json();
              } catch (error) {
                console.error('Error creating test terminate signal:', error);
              }
            }}
            className="px-2 py-1 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md transition-colors duration-200"
            title="中止分析（用于调试）"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={() => setTitanOutput([])}
            className="px-2 py-1 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md transition-colors duration-200"
            title="清空输出"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="fixed-height-content p-3 custom-scrollbar" style={{ flex: '1 1 auto', minHeight: '0', overflow: 'auto' }}>
        {titanOutput.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className={`text-sm ${fontSizeClasses[fontSize]}`}>Waiting for Titan Agent output...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {titanOutput.map((message, index) => (
              <div key={message.id} className="bg-white dark:bg-zinc-800 border border-gray-400 dark:border-zinc-600 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className={`font-mono ${fontSizeClasses[fontSize]} text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words mb-3`}>
                  {message.content}
                </div>
                <div className="flex justify-end">
                  <span className={`text-xs ${fontSizeClasses[fontSize]} text-blue-600`}>{message.timestamp.toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
            <div ref={outputEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Workbench;