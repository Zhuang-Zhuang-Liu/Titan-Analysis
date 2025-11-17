import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatPanel from './components/ChatPanel';
import FileExplorer from './components/FileExplorer';
import FileViewer from './components/FileViewer';
import AgentStatusPanel from './components/AgentStatusPanel';
import Workbench from './components/Workbench';
import AdminDashboard from './components/AdminDashboard';
import StartupAnimation from './components/StartupAnimation';
import ThemeToggle from './components/ThemeToggle';


import { sendAgentMessage, getAgentStates, AgentMessage, AgentState } from './utils/api';
import { getFilePaths, watchWorkspaceChanges, FileInfo, scanWorkspaceFiles, deleteFile } from './utils/fileSystem';
import BackendControl from './components/BackendControl';

function App() {
  const [showStartup, setShowStartup] = useState(true);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [workspaceFiles, setWorkspaceFiles] = useState<FileInfo[]>([]);
  const [agentStates, setAgentStates] = useState<AgentState[]>([]);


  // 移除 workbenchOutput 状态
  // const [workbenchOutput, setWorkbenchOutput] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [viewingFile, setViewingFile] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showAdmin, setShowAdmin] = useState<boolean>(false);



  const [realtimeOutput, setRealtimeOutput] = useState<string>('');

  // 初始化 workspace 文件列表
  useEffect(() => {
    const initializeFiles = async () => {
      try {
        const initialFiles = await getFilePaths();
        setFiles(initialFiles);
        
        const initialFileInfos = await scanWorkspaceFiles();
        setWorkspaceFiles(initialFileInfos);
      } catch (error) {
        console.error('Error initializing files:', error);
      }
    };
    
    initializeFiles();
    
    // 设置实时文件监听
    const cleanup = watchWorkspaceChanges((newFiles) => {
      setWorkspaceFiles(newFiles);
      const newFilePaths = newFiles.map(file => file.path);
      setFiles(newFilePaths);
    });
    
    return () => {
      cleanup();
    };
  }, []);

  // 发送欢迎消息
  useEffect(() => {
    const welcomeMessage: AgentMessage = {
      role: "agent",
      content: "Hello! I am Titan, how can I help you?",
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, []);



  // 轮询agent状态
    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        
        const pollAgentStates = async () => {
            try {
                const states = await getAgentStates();
                setAgentStates(states);
            } catch (error) {
                console.error('获取agent状态失败:', error);
            }
        };
        
        // 提高轮询频率到1秒，确保状态更新更及时
        pollAgentStates(); // 立即获取一次
        intervalId = setInterval(pollAgentStates, 2000);
        
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, []);



  const handleRefreshFiles = async () => {
    try {
      const newFiles = await getFilePaths();
      setFiles(newFiles);
      const fileInfos = await scanWorkspaceFiles();
      setWorkspaceFiles(fileInfos);
    } catch (error) {
      console.error('Error refreshing files:', error);
    }
  };

  const handleOpenFile = (filePath: string) => {
    setViewingFile(filePath);
  };

  const handleCloseFile = () => {
    setViewingFile('');
  };

  const handleDeleteFile = async (filePath: string) => {
    if (window.confirm(`确定要删除文件 "${filePath}" 吗？此操作不可撤销。`)) {
      try {
        await deleteFile(filePath);
        // 删除成功后刷新文件列表
        await handleRefreshFiles();
        
        // 如果删除的是当前选中的文件，清除选中状态
        if (selectedFile === filePath) {
          setSelectedFile('');
        }
        
        // 如果删除的是当前查看的文件，关闭查看器
        if (viewingFile === filePath) {
          setViewingFile('');
        }
      } catch (error) {
        console.error('删除文件失败:', error);
        alert(`删除文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }
  };





  const handleSendMessage = async (input: string, file?: File) => {
    const userMessage: AgentMessage = {
      role: "user",
      content: input + (file ? `\n[已上传文件: ${file.name}]` : ""),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // 如果是开始分析，清空实时输出缓冲区
    if (input.trim() === "开始分析") {
      setRealtimeOutput('');
    }
    
    setIsLoading(true);
    
    try {
        const response = await sendAgentMessage(input, file);
        
        setMessages(prev => [...prev, ...response.messages]);
        
        if (response.files.length > 0) {
            setFiles(prev => [...prev, ...response.files.filter(f => !prev.includes(f))]);
        }
        
        setAgentStates(response.agentStates);
        
    } catch (error) {
        console.error('Error:', error);
        setMessages(prev => [...prev, {
            role: "agent",
            content: "Sorry, an error occurred while processing your request. Please try again.",
            timestamp: new Date()
        }]);
    } finally {
        // 无论成功还是失败，都要重置isLoading状态
        setIsLoading(false);
    }
};

  const [showAboutUs, setShowAboutUs] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [workbenchHeight, setWorkbenchHeight] = useState(68); // Workbench初始高度百分比
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef({
    startY: 0,
    startHeight: 68
  });

  // 从localStorage加载主题设置
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // 切换主题
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleStartupComplete = () => {
    setShowStartup(false);
  };

  // 处理拖拽调整大小
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    // 记录拖拽开始时的鼠标位置和当前高度
    resizeStartRef.current = {
      startY: e.clientY,
      startHeight: workbenchHeight
    };
    
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    document.body.classList.add('resizing');
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    // 使用ref来获取容器元素，更可靠
    const container = containerRef.current;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const containerHeight = containerRect.height;
    
    // 计算鼠标移动的偏移量（相对于容器高度的比例）
    const deltaY = e.clientY - resizeStartRef.current.startY;
    const deltaPercentage = (deltaY / containerHeight) * 100;
    
    // 根据偏移量计算新的Workbench高度（注意：鼠标向下移动时，Workbench高度应该减少）
    const newHeight = Math.max(20, Math.min(80, resizeStartRef.current.startHeight - deltaPercentage));
    setWorkbenchHeight(newHeight);
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.body.classList.remove('resizing');
  }, []);

  // 添加全局鼠标事件监听
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  if (showStartup) {
    return <StartupAnimation onLoadingComplete={handleStartupComplete} />;
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-black dark:text-gray-100 overflow-hidden relative">
      <div 
        className={`min-h-screen transition-all duration-500 ease-in-out ${showAdmin ? 'transform -translate-x-full' : ''}`}
      >
        <div className="min-h-screen bg-white text-zinc-900 dark:bg-black dark:text-gray-100 p-4">
          <div className="max-w-full mx-auto px-4">
            <header className="mb-4 flex justify-between items-center">
              <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-800 via-gray-700 to-gray-900 tracking-wide dark:from-gray-200 dark:via-gray-300 dark:to-gray-100">
                Titan V
                <span className="text-base font-medium text-black ml-3 dark:text-gray-300">All Data Insights with Agents</span>
              </h1>
              <div className="flex items-center space-x-4">
                <ThemeToggle isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowAboutUs(true)}
                    className="px-4 py-1.5 h-7 bg-black text-white dark:bg-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-300 shadow-lg hover:shadow-gray-500/25 dark:hover:shadow-gray-300/25 flex items-center text-sm"
                  >
                    About Us
                  </button>
                  <BackendControl />
                </div>
              </div>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 h-[calc(100vh-6rem)]">
              <div className="lg:col-span-1 h-full" style={{ height: 'calc(100vh - 6rem)', maxHeight: 'calc(100vh - 6rem)' }}>
                <ChatPanel 
              messages={messages} 
              onSendMessage={handleSendMessage} 
              isLoading={isLoading} 
            />
              </div>
              
              <div ref={containerRef} className="lg:col-span-3 relative h-full" style={{ height: 'calc(100vh - 6rem)', maxHeight: 'calc(100vh - 6rem)' }}>
                {/* 上部区域：File Explorer 和 Agent Status */}
                <div className={`absolute top-0 left-0 right-0 resizable-panel ${isResizing ? '' : 'transition-all duration-200'}`} style={{ height: `${100 - workbenchHeight}%`, maxHeight: `${100 - workbenchHeight}%` }}>
                  <div className="flex gap-3 h-full pb-2">
                    <div className="flex-1 h-full min-w-0">
                      <FileExplorer
                        files={files}
                        workspaceFiles={workspaceFiles}
                        selectedFile={selectedFile}
                        onSelectFile={setSelectedFile}
                        onRefresh={handleRefreshFiles}
                        onOpenFile={handleOpenFile}
                        onDeleteFile={handleDeleteFile}
                      />
                    </div>
                    <div className="flex-1 h-full min-w-0">
                      <AgentStatusPanel agentStates={agentStates} />
                    </div>
                  </div>
                </div>
                
                {/* 可拖拽的分割条 */}
                <div 
                  className={`absolute left-0 right-0 bg-transparent hover:bg-gray-400 dark:hover:bg-zinc-600 cursor-ns-resize z-10 transition-colors duration-200 resizable-divider ${isResizing ? 'dragging bg-gray-400 dark:bg-zinc-600' : ''}`}
                  style={{ 
                    top: `${100 - workbenchHeight}%`, 
                    height: '4px',
                    marginTop: '-2px'
                  }}
                  onMouseDown={handleMouseDown}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-0.5 bg-gray-500 dark:bg-zinc-400 rounded-full opacity-0 hover:opacity-50 transition-opacity duration-200"></div>
                  </div>
                </div>
                
                {/* 下部区域：Workbench */}
                <div className={`absolute bottom-0 left-0 right-0 resizable-panel ${isResizing ? '' : 'transition-all duration-200'}`} style={{ height: `${workbenchHeight}%`, maxHeight: `${workbenchHeight}%` }}>
                  <Workbench 
                    output={realtimeOutput} 
                    realtimeOutput={realtimeOutput} 
                    onAddMessage={(content: string) => {
                      const newMessage = {
                        role: "user" as const,
                        content: content,
                        timestamp: new Date()
                      };
                      setMessages(prev => [...prev, newMessage]);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div 
        className={`absolute top-0 left-0 w-full h-full transition-all duration-500 ease-in-out ${showAdmin ? 'transform translate-x-0' : 'transform translate-x-full'}`}
      >
        <AdminDashboard />
      </div>





      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
        <button
          onClick={() => setShowAdmin(!showAdmin)}
          className={`bg-gradient-to-r px-4 py-2 rounded-full shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-1.5 group text-sm ${
            showAdmin 
              ? 'from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800' 
              : 'from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800'
          }`}
          title={showAdmin ? '返回主界面' : '打开后台管理'}
        >
          <svg 
            className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d={showAdmin ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} 
            />
          </svg>
          <span className="font-medium">{showAdmin ? 'Back' : 'Admin'}</span>
        </button>
      </div>
      
      <FileViewer
        filePath={viewingFile}
        onClose={handleCloseFile}
        isDarkMode={isDarkMode}
      />

      {/* About Us Modal */}
      {showAboutUs && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-900">
                About Titan V
              </h2>
              <button
                onClick={() => setShowAboutUs(false)}
                className="text-zinc-400 hover:text-white transition-colors duration-200"
                title="关闭关于我们"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4 text-zinc-300">
              <p className="text-sm leading-relaxed">
                <strong className="text-cyan-400">Titan V</strong> is an advanced AI-powered data analysis platform 
                that leverages autonomous agents to provide comprehensive insights from your datasets.
              </p>
              
              <div className="border-t border-zinc-700 pt-4">
                <h3 className="font-semibold text-white mb-2">Key Features:</h3>
                <ul className="text-sm space-y-1 text-zinc-400">
                  <li>• Multi-agent collaborative analysis</li>
                  <li>• Real-time data processing and insights</li>
                  <li>• Interactive file management system</li>
                  <li>• HTTP轮询实时状态更新</li>
                  <li>• Intelligent data cleaning and validation</li>
                </ul>
              </div>
              
              <div className="border-t border-zinc-700 pt-4">
                <h3 className="font-semibold text-white mb-2">Technology Stack:</h3>
                <p className="text-sm text-zinc-400">
                  Built with React, TypeScript, Python, FastAPI, and the CAMEL AI framework.
                </p>
              </div>
              
              <div className="border-t border-zinc-700 pt-4">
                <p className="text-xs text-zinc-500 text-center">
                  Version 1.0.0 • Designed for advanced data science workflows
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowAboutUs(false)}
                className="px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg hover:from-gray-900 hover:to-black transition-all duration-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;