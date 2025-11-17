import React, { useState } from 'react';
import { FileInfo } from '../utils/fileSystem';

interface FileExplorerProps {
  files: string[];
  workspaceFiles?: FileInfo[];
  selectedFile?: string;
  onSelectFile: (file: string) => void;
  onRefresh?: () => void;
  onOpenFile?: (filePath: string) => void;
  onDeleteFile?: (filePath: string) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ files, workspaceFiles, selectedFile, onSelectFile, onRefresh, onOpenFile, onDeleteFile }) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'workspace': true,
  });

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folder]: !prev[folder]
    }));
  };

  const getFileIcon = (filename: string) => {
    if (!filename || typeof filename !== 'string') {
      return (
        <svg className="w-4 h-4 text-zinc-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-5L9 2H4z" clipRule="evenodd" />
        </svg>
      );
    }
    const extension = filename.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'py':
        return (
          <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      case 'csv':
      case 'xlsx':
      case 'xls':
        return (
          <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-5L9 2H4z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-zinc-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-5L9 2H4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const renderFileTree = () => {
    // 使用 workspaceFiles 如果可用，否则回退到 files 数组
    const fileList = workspaceFiles || files.map(path => ({
      name: path.split('/').pop() || '',
      path,
      type: 'file' as const
    }));

    // 按目录层级组织文件
    const rootItems: Array<{ name: string; path: string; type: 'file' | 'directory'; children?: any[] }> = [];
    
    fileList.forEach(file => {
      // 检查 file.path 是否存在且为字符串
      if (!file.path || typeof file.path !== 'string') {
        console.warn('Invalid file path:', file);
        return; // 跳过无效的文件
      }
      
      const parts = file.path.split('/');
      let currentLevel = rootItems;
      
      // 构建目录路径
      let currentPath = '';
      
      // 处理每个目录层级
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part) continue; // 跳过空的部分
        
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (i === parts.length - 1) {
          // 这是文件，添加到当前目录
          currentLevel.push({
            ...file
          });
        } else {
          // 这是目录
          let dir = currentLevel.find(item => item.name === part && item.type === 'directory');
          if (!dir) {
            dir = {
              name: part,
              path: currentPath,
              type: 'directory',
              children: []
            };
            currentLevel.push(dir);
          }
          if (!dir.children) {
            dir.children = [];
          }
          currentLevel = dir.children;
        }
      }
    });

    const renderItems = (items: any[], level: number = 0) => {
      return items.map(item => {
        if (item.type === 'directory') {
          const isExpanded = expandedFolders[item.path];
          return (
            <div key={item.path}>
              <div
                className="flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-zinc-600 rounded cursor-pointer text-gray-700 dark:text-gray-200"
                style={{ marginLeft: level * 16 }}
                onClick={() => toggleFolder(item.path)}
              >
                <svg
                  className={`w-4 h-4 mr-1 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                <span className="text-sm">{item.name}</span>
              </div>
              
              {isExpanded && item.children && (
                <div>
                  {renderItems(item.children, level + 1)}
                </div>
              )}
            </div>
          );
        } else {
          // 文件
          return (
            <div
              key={item.path}
              className="flex items-center py-1 px-2 rounded cursor-pointer text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-600"
              style={{ marginLeft: level * 16 }}
              onClick={() => onSelectFile(item.path)}
            >
              <div className="mr-2">{getFileIcon(item.name)}</div>
              <span className="text-sm flex-1">{item.name}</span>
              <div className="flex items-center space-x-2 text-xs text-zinc-500">
                {item.size && (
                  <span>{item.size}B</span>
                )}
                {item.lastModified && (
                  <span>
                    {item.lastModified instanceof Date 
                      ? item.lastModified.toLocaleTimeString()
                      : new Date(item.lastModified).toLocaleTimeString()
                    }
                  </span>
                )}
                <div className="flex items-center space-x-1">
                  {onOpenFile && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenFile(item.path);
                      }}
                      className="p-1 text-zinc-500 dark:text-zinc-400 hover:text-white transition-colors"
                      title="Open file"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                  )}
                  {onDeleteFile && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFile(item.path);
                      }}
                      className="p-1 text-zinc-500 dark:text-zinc-400 hover:text-red-400 transition-colors"
                      title="Delete file"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }
      });
    };

    return renderItems(rootItems, 0);
  };

  return (
    <div className="fixed-height-container bg-gray-200 dark:bg-zinc-900 rounded-2xl shadow-lg overflow-hidden border border-gray-400/50 dark:border-zinc-700" style={{ height: '100%', maxHeight: '100%', minHeight: '0' }}>
      <div className="px-3 py-2 border-b border-gray-300 dark:border-zinc-700 bg-gray-200 dark:bg-zinc-800 flex justify-between items-center flex-shrink-0">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">File Explorer</h2>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1 text-gray-600 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            title="Refresh files"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>
      
      <div style={{ flex: '1 1 auto', minHeight: '0', overflow: 'scroll', overflowY: 'scroll', maxHeight: 'none', padding: '0.75rem' }}>
        {files.length > 0 ? (
          renderFileTree()
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 dark:text-zinc-400">
            <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a 2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm">No files</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;