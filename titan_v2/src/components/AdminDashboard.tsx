import React, { useState, useEffect } from 'react';
import WorkflowVisualizerPageContent from './WorkflowVisualizerPageContent';

interface PromptConfig {
  [key: string]: {
    role_name: string;
    content: string;
    code_toolkit: string;
    status_bar: string;
    document_path: string;
  };
}

const AdminDashboard: React.FC = () => {
  const [showSystemCard, setShowSystemCard] = useState(false);
  const [showAgentConfigCard, setShowAgentConfigCard] = useState(false);
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [showMermaidModal, setShowMermaidModal] = useState(false);
  const [formData, setFormData] = useState({
    API_KEY: '',
    MODEL_TYPE: 'deepseek-chat',
    API_URL: 'https://api.deepseek.com/v1'
  });
  const [promptsData, setPromptsData] = useState<PromptConfig>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [promptsLoading, setPromptsLoading] = useState(false);

  // 获取当前配置
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/env');
      const data = await response.json();
      setFormData({
        API_KEY: data.config.DEEPSEEK_API_KEY || '',
        MODEL_TYPE: data.config.MODEL_TYPE || 'deepseek-chat',
        API_URL: data.config.API_URL || 'https://api.deepseek.com/v1'
      });
    } catch (error) {
      console.error('获取配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取prompts配置
  const fetchPromptsConfig = async () => {
    try {
      setPromptsLoading(true);
      const response = await fetch('http://localhost:8000/api/prompts');
      const data = await response.json();
      setPromptsData(data.prompts || {});
    } catch (error) {
      console.error('获取prompts配置失败:', error);
      alert('获取prompts配置失败，请检查网络连接');
    } finally {
      setPromptsLoading(false);
    }
  };

  // 组件加载时获取配置
  useEffect(() => {
    if (showSystemCard) {
      fetchConfig();
    }
  }, [showSystemCard]);

  useEffect(() => {
    if (showAgentConfigCard) {
      fetchPromptsConfig();
    }
  }, [showAgentConfigCard]);

  const handleSystemStatusClick = () => {
    setShowSystemCard(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const response = await fetch('http://localhost:8000/api/env', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          DEEPSEEK_API_KEY: formData.API_KEY,
          MODEL_TYPE: formData.MODEL_TYPE,
          API_URL: formData.API_URL
        })
      });
      
      if (response.ok) {
        // 显示成功提示但不关闭弹窗
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg z-50';
        toast.textContent = 'Configuration saved!';
        document.body.appendChild(toast);
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 2000);
        setShowSystemCard(false);
      } else {
        alert('保存配置失败，请重试');
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      alert('保存配置失败，请检查网络连接');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setShowSystemCard(false);
    setFormData({ API_KEY: '', MODEL_TYPE: 'deepseek-chat', API_URL: 'https://api.deepseek.com/v1' });
  };

  const handleAgentConfigClick = () => {
    setShowAgentConfigCard(true);
  };

  const handleMermaidClick = () => {
    setShowMermaidModal(true);
  };

  const handlePromptsClose = () => {
    setShowAgentConfigCard(false);
    setPromptsData({});
  };

  const handleMermaidClose = () => {
    setShowMermaidModal(false);
  };

  const handlePromptChange = (role: string, field: string, value: string) => {
    setPromptsData(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [field]: value
      }
    }));
  };

  const handleAddAgent = () => {
    setShowAddAgentModal(true);
    setNewAgentName('');
  };

  const handleConfirmAddAgent = () => {
    if (newAgentName && newAgentName.trim()) {
      const cleanName = newAgentName.trim().toLowerCase().replace(/\s+/g, '_');
      
      // 检查是否已存在同名agent
      if (promptsData[cleanName]) {
        alert('该Agent名称已存在，请使用其他名称');
        return;
      }

      setPromptsData(prev => ({
        ...prev,
        [cleanName]: {
          role_name: newAgentName.trim(),
          content: 'You are a helpful AI assistant.',
          code_toolkit: 'default_toolkit.py',
          status_bar: 'Ready',
          document_path: './work_document/default.md'
        }
      }));
      setShowAddAgentModal(false);
      setNewAgentName('');
    }
  };

  const handleDeleteAgent = (role: string) => {
    const confirmDelete = window.confirm(`确定要删除 "${role}" 这个Agent吗？此操作不可恢复。`);
    if (confirmDelete) {
      setPromptsData(prev => {
        const newData = { ...prev };
        delete newData[role];
        return newData;
      });
    }
  };

  const handlePromptsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const response = await fetch('http://localhost:8000/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompts: promptsData
        })
      });
      
      if (response.ok) {
        // 显示成功提示但不关闭弹窗
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg z-50';
        toast.textContent = 'Configuration saved!';
        document.body.appendChild(toast);
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 2000);
      } else {
        alert('保存Agent配置失败，请重试');
      }
    } catch (error) {
      console.error('保存Agent配置失败:', error);
      alert('保存Agent配置失败，请检查网络连接');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4 animate-pulse-slow">
          Admin Backend
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div 
            className="bg-gray-800/80 backdrop-blur-lg rounded-lg p-6 border border-gray-600 hover:bg-gray-700/80 transition-all duration-300 cursor-pointer transform hover:scale-105"
            onClick={handleSystemStatusClick}
          >
            <h3 className="text-lg font-semibold text-white mb-2">LLM Config</h3>
            <p className="text-gray-300">Type your API Here</p>
          </div>
          <div 
            className="bg-gray-800/80 backdrop-blur-lg rounded-lg p-6 border border-gray-600 hover:bg-gray-700/80 transition-all duration-300 cursor-pointer transform hover:scale-105"
            onClick={handleAgentConfigClick}
          >
            <h3 className="text-lg font-semibold text-white mb-2">Agent Config</h3>
            <p className="text-gray-300">Manage Your Agents</p>
          </div>
          <div className="bg-gray-800/80 backdrop-blur-lg rounded-lg p-6 border border-gray-600 hover:bg-gray-700/80 transition-all duration-300">
            <h3 className="text-lg font-semibold text-white mb-2">Knowledge Bank</h3>
            <p className="text-gray-300">Manage Agents Knowledge</p>
          </div>
          <div 
            className="bg-gray-800/80 backdrop-blur-lg rounded-lg p-6 border border-gray-600 hover:bg-gray-700/80 transition-all duration-300 cursor-pointer transform hover:scale-105"
            onClick={handleMermaidClick}
          >
            <h3 className="text-lg font-semibold text-white mb-2">Workflow Visualizer</h3>
            <p className="text-gray-300">View .mmd Files</p>
          </div>
        </div>

        {showSystemCard && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 max-w-md w-full mx-4 text-left">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Configuration</h2>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving}
                    title="保存配置"
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 transform"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={handleClose}
                    title="关闭"
                    className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full transition-colors duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                    <p className="text-gray-300 mt-2">加载配置中...</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        API_KEY:
                      </label>
                      <input
                        type="text"
                        name="API_KEY"
                        value={formData.API_KEY}
                        onChange={handleInputChange}
                        maxLength={100}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        placeholder="Enter API key"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        MODEL_TYPE:
                      </label>
                      <input
                        type="text"
                        name="MODEL_TYPE"
                        value={formData.MODEL_TYPE}
                        onChange={handleInputChange}
                        maxLength={100}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        placeholder="Enter model type"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        API_URL:
                      </label>
                      <input
                        type="text"
                        name="API_URL"
                        value={formData.API_URL}
                        onChange={handleInputChange}
                        maxLength={100}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        placeholder="Enter API URL"
                        required
                      />
                    </div>
                    

                  </>
                )}
              </form>
            </div>
          </div>
        )}

        {showAgentConfigCard && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 w-11/12 max-w-7xl mx-4 text-left max-h-[85vh] overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Agent Configuration</h2>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleAddAgent}
                                title="Add New Agent"
                                className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors duration-200 hover:scale-110 transform"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handlePromptsSubmit}
                    disabled={saving}
                    title="保存配置"
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 transform"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={handlePromptsClose}
                    title="关闭"
                    className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full transition-colors duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <form onSubmit={handlePromptsSubmit} className="h-full flex flex-col">
                {promptsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                    <p className="text-gray-300 mt-2">加载配置中...</p>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-700/30 scrollbar-thumb-rounded-full">
                      <div className="flex space-x-3 min-w-max px-2">
                        {Object.entries(promptsData).map(([role, config]) => (
                          <div key={role} className="border border-white/20 rounded-lg p-2 space-y-2 bg-gray-800/30 backdrop-blur-sm flex-shrink-0 w-80 relative">
                            <div className="flex justify-between items-center border-b border-white/20 pb-1 mb-2">
                              <h3 className="text-lg font-semibold text-white capitalize">{role}</h3>
                              <button
                                onClick={() => handleDeleteAgent(role)}
                                title="删除Agent"
                                className="p-1 text-gray-500 hover:text-red-400 hover:bg-gray-700/50 rounded-full transition-colors duration-200"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          
                        <div className="space-y-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Role:
                            </label>
                            <input
                              type="text"
                              value={config.role_name}
                              onChange={(e) => handlePromptChange(role, 'role_name', e.target.value)}
                              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Prompt:
                            </label>
                            <textarea
                              value={config.content}
                              onChange={(e) => handlePromptChange(role, 'content', e.target.value)}
                              rows={6}
                              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500 font-mono text-sm leading-relaxed resize-none"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Toolkit:
                            </label>
                            <input
                              type="text"
                              value={config.code_toolkit}
                              onChange={(e) => handlePromptChange(role, 'code_toolkit', e.target.value)}
                              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Status:
                            </label>
                            <input
                              type="text"
                              value={config.status_bar}
                              onChange={(e) => handlePromptChange(role, 'status_bar', e.target.value)}
                              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Doc Path:
                            </label>
                            <input
                              type="text"
                              value={config.document_path}
                              onChange={(e) => handlePromptChange(role, 'document_path', e.target.value)}
                              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                      </div>
                    </div>
                  </>
                )}
              </form>
            </div>
          </div>
        )}

        {showAddAgentModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800/90 backdrop-blur-lg rounded-lg p-6 border border-white/20 max-w-md w-full mx-4 text-left">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Add New Agent</h3>
                <button
                  onClick={() => setShowAddAgentModal(false)}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    placeholder="e.g. data_analyst"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={50}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleConfirmAddAgent();
                      }
                    }}
                  />
                </div>
                
                <div className="text-xs text-gray-400">
                  Tip: Name will be automatically converted to lowercase with underscores
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddAgentModal(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAddAgent}
                  disabled={!newAgentName.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Agent
                </button>
              </div>
            </div>
          </div>
        )}

        {showMermaidModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800/90 backdrop-blur-lg rounded-lg border border-white/20 w-full max-w-7xl mx-4 text-left" style={{ height: '90vh' }}>
              <div className="flex justify-between items-center p-4 border-b border-white/20">
                <h3 className="text-xl font-bold text-white">Workflow Visualizer</h3>
                <button
                  onClick={handleMermaidClose}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="h-full" style={{ height: 'calc(90vh - 60px)' }}>
                <WorkflowVisualizerPageContent />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;