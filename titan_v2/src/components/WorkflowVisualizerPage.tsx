import React from 'react';
import WorkflowVisualizerPageContent from './WorkflowVisualizerPageContent';

const WorkflowVisualizerPage: React.FC = () => {
  const handleBack = () => {
    // 通过自定义事件通知父组件返回
    window.dispatchEvent(new CustomEvent('workflowVisualizerBack'));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="w-full mx-auto h-screen flex flex-col">
        {/* 顶部导航栏 */}
        <div className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Workflow Visualizer</h1>
            <div className="flex items-center space-x-6">
              <div className="text-sm text-gray-600">
                拖拽编辑流程图，实时保存到Mermaid文件
              </div>
              <button
                onClick={handleBack}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-full shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            </div>
          </div>
        </div>
        
        {/* 主要内容区域 */}
        <div className="flex-1 overflow-hidden">
          <WorkflowVisualizerPageContent />
        </div>
      </div>
    </div>
  );
};

export default WorkflowVisualizerPage;