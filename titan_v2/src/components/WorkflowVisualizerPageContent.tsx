import React, { useState, useEffect } from 'react';
import { WorkflowVisualizer } from '../workflow-visualizer/WorkflowVisualizer';
import { listFiles } from '../utils/fileSystem';

const WorkflowVisualizerPageContent: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('/backend/fresh_workflow/base01.mmd');
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMermaidFiles();
  }, []);

  const loadMermaidFiles = async () => {
    try {
      setLoading(true);
      const allFiles = await listFiles('/backend/fresh_workflow');
      const mermaidFiles = allFiles.filter(file => 
        file.endsWith('.mmd') || file.endsWith('.mermaid')
      );
      setFiles(mermaidFiles);
    } catch (err) {
      console.error('加载文件列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (fileName: string) => {
    setSelectedFile(`/backend/fresh_workflow/${fileName}`);
  };

  const handleRefresh = () => {
    loadMermaidFiles();
  };

  return (
    <div className="flex h-full bg-gray-100">
      {/* 左侧文件选择器 */}
      <div className="w-64 bg-white border-r border-gray-200 overflow-hidden flex-shrink-0">
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">流程文件</h3>
              <button
                onClick={handleRefresh}
                className="text-gray-500 hover:text-gray-700"
                title="刷新文件列表"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                未找到 Mermaid 文件
              </div>
            ) : (
              <div className="space-y-1">
                {files.map((file) => (
                  <button
                    key={file}
                    onClick={() => handleFileSelect(file)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedFile === `/backend/fresh_workflow/${file}`
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                      {file}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 右侧编辑器 */}
      <div className="flex-1 bg-white overflow-hidden min-w-0">
        <WorkflowVisualizer 
          filePath={selectedFile}
          className="h-full"
        />
      </div>
    </div>
  );
};

export default WorkflowVisualizerPageContent;