import React, { useState, useEffect } from 'react';
import { AgentState } from '../utils/api';

interface AgentStatusPanelProps {
  agentStates: AgentState[];
}

const AgentStatusPanel: React.FC<AgentStatusPanelProps> = ({ agentStates }) => {
  const [selectedAgent, setSelectedAgent] = useState<AgentState | null>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // 检查是否需要滚动指示器
  useEffect(() => {
    setShowScrollIndicator(agentStates.length > 6);
  }, [agentStates.length]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle':
      case 'waiting':
        return 'bg-gray-500';
      case 'thinking':
      case 'working':
        return 'bg-yellow-500';
      case 'speaking':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'idle':
        return 'Idle';
      case 'waiting':
        return 'Waiting';
      case 'thinking':
        return 'Thinking';
      case 'working':
        return 'Working';
      case 'speaking':
        return 'Speaking';
      default:
        return 'Unknown';
    }
  };

  const renderAgentCard = (agent: AgentState, index: number) => (
    <div
      key={index}
      className="bg-white dark:bg-zinc-800 rounded-lg p-1 cursor-pointer hover:bg-gray-300 dark:hover:bg-zinc-700 transition-all duration-200 border border-transparent hover:border-gray-400 dark:hover:border-zinc-600 group h-full overflow-hidden"
      onClick={() => setSelectedAgent(agent)}>
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center space-x-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(agent.status)} animate-pulse-slow`}></div>
          <h3 className="font-medium text-gray-800 dark:text-gray-200 text-xs truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {agent.name}
          </h3>
        </div>
        <div className="flex items-center space-x-1 flex-shrink-0">
          {agent.status === 'working' && (
            <div className="w-2.5 h-0.5 bg-zinc-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full animate-pulse-slow" 
                style={{ width: `${Math.random() * 100}%` }}
              ></div>
            </div>
          )}
          <span className={`text-xs px-1 py-0.5 rounded-full font-medium ${
            agent.status === 'idle' ? 'text-gray-600 bg-gray-300' :
            agent.status === 'waiting' ? 'text-gray-600 bg-gray-300' :
            agent.status === 'thinking' ? 'text-yellow-700 bg-yellow-200' :
            agent.status === 'working' ? 'text-blue-700 bg-blue-200' :
            'text-green-700 bg-green-200'
          }`}>
            {getStatusText(agent.status)}
          </span>
        </div>
      </div>
      
      <div className="text-xs text-gray-600 dark:text-gray-400 leading-tight line-clamp-1">
        {agent.memory.length > 20 ? 
          `${agent.memory.substring(0, 20)}...` : 
          agent.memory
        }
      </div>
    </div>
  );

  return (
    <div className="fixed-height-container bg-gray-200 dark:bg-zinc-900 rounded-2xl shadow-lg overflow-hidden border border-gray-400/50 dark:border-zinc-700" style={{ height: '100%', maxHeight: '100%', minHeight: '0' }}>
      <div className="px-3 py-2 border-b border-gray-300 dark:border-zinc-700 flex justify-between items-center flex-shrink-0 bg-gray-200 dark:bg-zinc-800">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Agent Status</h2>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-600">{agentStates.length} agents</span>
        </div>
      </div>
      
      <div style={{ 
        flex: '1 1 auto', 
        minHeight: '0', 
        overflow: 'scroll',
        overflowY: 'scroll',
        maxHeight: 'none',
        padding: '0.75rem'
      }}>
        <div className="grid grid-cols-2 gap-1.5" style={{ minHeight: '0', maxHeight: '200px', overflowY: 'auto' }}>
          {agentStates.map((agent, index) => (
            <div key={index} className="h-16">
              {renderAgentCard(agent, index)}
            </div>
          ))}
        </div>
        
        {/* 滚动指示器 */}
        {showScrollIndicator && (
          <div className="absolute bottom-3 right-3">
            <div className="flex items-center space-x-1 text-xs text-gray-600 bg-gray-300/80 backdrop-blur-sm px-2 py-1 rounded-full border border-gray-400">
              <svg className="w-3 h-3 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span>Scroll for more agents</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Agent详情弹窗 */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col border border-gray-400 dark:border-zinc-600">
            <div className="p-4 border-b border-gray-300 dark:border-zinc-600 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(selectedAgent.status)} animate-pulse-slow`}></div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{selectedAgent.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  selectedAgent.status === 'idle' ? 'text-gray-600 bg-gray-300' :
                  selectedAgent.status === 'waiting' ? 'text-gray-600 bg-gray-300' :
                  selectedAgent.status === 'thinking' ? 'text-yellow-700 bg-yellow-200' :
                  selectedAgent.status === 'working' ? 'text-blue-700 bg-blue-200' :
                  'text-green-700 bg-green-200'
                }`}>
                  {getStatusText(selectedAgent.status)}
                </span>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-zinc-400 hover:text-white transition-colors"
                title="Close agent details"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1" style={{maxHeight: 'calc(80vh - 200px)', minHeight: '200px'}}>
              <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-4 text-gray-700 dark:text-gray-200 whitespace-pre-wrap text-sm leading-relaxed">
                {selectedAgent.memory || 'No content available'}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-300 dark:border-zinc-600">
              <button
                onClick={() => setSelectedAgent(null)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentStatusPanel;