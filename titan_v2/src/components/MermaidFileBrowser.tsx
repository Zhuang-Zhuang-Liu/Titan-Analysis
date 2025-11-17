import React, { useState, useEffect } from 'react';
import MermaidViewer from './MermaidViewer';
import { listFiles, readFile, writeFile } from '../utils/fileSystem';

interface MermaidFileBrowserProps {
  directoryPath?: string;
  className?: string;
  onFileSelect?: (fileName: string) => void;
}

const MermaidFileBrowser: React.FC<MermaidFileBrowserProps> = ({
  directoryPath = '/backend/fresh_workflow',
  className = '',
  onFileSelect
}) => {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [editedContent, setEditedContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadMermaidFiles();
  }, [directoryPath]);

  useEffect(() => {
    if (selectedFile) {
      loadFileContent(selectedFile);
    }
  }, [selectedFile]);

  const loadMermaidFiles = async () => {
    try {
      setLoading(true);
      const allFiles = await listFiles(directoryPath);
      const mermaidFiles = allFiles.filter(file => 
        file.endsWith('.mmd') || file.endsWith('.mermaid')
      );
      setFiles(mermaidFiles);
      
      if (mermaidFiles.length > 0 && !selectedFile) {
        setSelectedFile(mermaidFiles[0]);
      }
    } catch (err) {
      setError('加载文件列表失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const loadFileContent = async (fileName: string) => {
    try {
      setLoading(true);
      setError('');
      const content = await readFile(`${directoryPath}/${fileName}`);
      setFileContent(content);
      setEditedContent(content);
    } catch (err) {
      setError('加载文件内容失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (fileName: string) => {
    if (isEditing) {
      if (window.confirm('有未保存的更改，是否继续切换文件？')) {
        setIsEditing(false);
        setSelectedFile(fileName);
        onFileSelect?.(`${directoryPath}/${fileName}`);
      }
    } else {
      setSelectedFile(fileName);
      onFileSelect?.(`${directoryPath}/${fileName}`);
    }
  };

  const handleRefresh = () => {
    loadMermaidFiles();
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(fileContent);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent(fileContent);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      await writeFile(`${directoryPath}/${selectedFile}`, editedContent);
      setFileContent(editedContent);
      setIsEditing(false);
      setSaveSuccess(true);
      
      // 3秒后隐藏成功提示
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError('保存文件失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleContentChange = (content: string) => {
    setEditedContent(content);
    setSaveSuccess(false);
  };

  if (loading && files.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载文件中...</span>
      </div>
    );
  }

  if (error && files.length === 0) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-700 font-medium">加载失败</span>
          </div>
          <button
            onClick={handleRefresh}
            className="text-sm text-red-600 hover:text-red-800 underline"
          >
            重试
          </button>
        </div>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className={`p-4 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <p className="text-gray-600 text-center">未找到 Mermaid 文件 (.mmd 或 .mermaid)</p>
      </div>
    );
  }

  return (
    <div className={`flex h-full bg-white ${className}`}>
      {/* 左侧文件列表 */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 truncate" title={directoryPath}>{directoryPath}</h3>
          <div className="flex items-center space-x-2">
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
        
        <div className="space-y-1">
          {files.map((file) => (
            <button
              key={file}
              onClick={() => handleFileSelect(file)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                selectedFile === file
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
      </div>

      {/* 右侧内容区域 */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {selectedFile && (
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                  {selectedFile}
                </h2>
              </div>
              <div className="flex items-center space-x-2">
                {!isEditing ? (
                  <button
                    onClick={handleEdit}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                  >
                    编辑
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {loading ? '保存中...' : '保存'}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>
            </div>
            {saveSuccess && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">文件保存成功！</p>
              </div>
            )}
            {error && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        )}
        
        <div className="flex-1 overflow-auto p-4 bg-white">
          {isEditing ? (
            <div className="h-full flex flex-col">
              <textarea
                value={editedContent}
                onChange={(e) => handleContentChange(e.target.value)}
                className="flex-1 w-full p-4 border border-gray-300 rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="在此编辑Mermaid代码..."
              />
              <div className="mt-2 text-xs text-gray-500">
                提示：支持Mermaid语法，保存后实时预览
              </div>
            </div>
          ) : (
            <MermaidViewer
              mmdContent={fileContent}
              onError={setError}
              className="min-h-full"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MermaidFileBrowser;