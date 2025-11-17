import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { readFile, writeFile } from '../utils/fileSystem';

interface FlowNodeData {
  label: string;
  type: 'node' | 'decision' | 'start' | 'end';
}

export type FlowNode = Node<FlowNodeData>;
export type FlowEdge = Edge;

interface WorkflowVisualizerProps {
  filePath: string;
  className?: string;
}

// Dagre布局配置
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// 节点尺寸配置
const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;

// 自定义边样式配置
const getEdgeStyle = (edge: FlowEdge) => {
  return {
    strokeWidth: 2,
    stroke: '#6b7280',
    strokeDasharray: edge.type === 'decision' ? '5,5' : undefined,
  };
};

// 应用Dagre布局的函数
const getLayoutedElements = (nodes: FlowNode[], edges: FlowEdge[], direction = 'TB') => {
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 80,  // 增加节点间距
    edgesep: 40,  // 增加边间距
    ranksep: 100  // 增加层级间距
  });

  // 清除现有节点和边
  dagreGraph.nodes().forEach(n => dagreGraph.removeNode(n));
  dagreGraph.edges().forEach(e => dagreGraph.removeEdge(e.v, e.w));

  // 添加节点到Dagre图
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  // 添加边到Dagre图，并优化边的路由
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target, {
      weight: 1,
      labelpos: 'c'
    });
  });

  // 计算布局
  dagre.layout(dagreGraph);

  // 应用布局结果
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  // 优化边的样式和路由
  const layoutedEdges = edges.map((edge) => {
    const sourceNode = layoutedNodes.find(n => n.id === edge.source);
    const targetNode = layoutedNodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return edge;

    // 根据节点类型和位置优化边的样式
    let edgeType = 'smoothstep';
    let animated = false;
    
    // 决策节点的边使用不同的样式
    if (targetNode.data?.type === 'decision') {
      edgeType = 'step';
    }
    
    // 循环边使用动画效果
    if (edge.source === edge.target || 
        edges.some(e => e.source === edge.target && e.target === edge.source)) {
      animated = true;
    }

    // 计算边的路由优化
    const sourceX = sourceNode.position.x + NODE_WIDTH / 2;
    const sourceY = sourceNode.position.y + NODE_HEIGHT / 2;
    const targetX = targetNode.position.x + NODE_WIDTH / 2;
    const targetY = targetNode.position.y + NODE_HEIGHT / 2;
    
    // 根据节点位置关系选择最佳连接点
    let sourceHandle = 'bottom';
    let targetHandle = 'top';
    
    if (Math.abs(targetX - sourceX) < 50) {
      // 垂直对齐的节点
      if (targetY > sourceY) {
        sourceHandle = 'bottom';
        targetHandle = 'top';
      } else {
        sourceHandle = 'top';
        targetHandle = 'bottom';
      }
    } else {
      // 水平对齐的节点
      if (targetX > sourceX) {
        sourceHandle = 'right';
        targetHandle = 'left';
      } else {
        sourceHandle = 'left';
        targetHandle = 'right';
      }
    }

    return {
      ...edge,
      type: edgeType,
      animated,
      sourceHandle,
      targetHandle,
      style: getEdgeStyle(edge),
      markerEnd: { 
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#6b7280'
      },
      labelBgStyle: {
        fill: '#ffffff',
        fillOpacity: 0.8,
        stroke: '#d1d5db',
        strokeWidth: 1
      },
      labelBgPadding: [4, 4] as [number, number],
      labelBgBorderRadius: 4
    };
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
};

export const WorkflowVisualizer: React.FC<WorkflowVisualizerProps> = ({
  filePath,
  className = ''
}) => {
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [mermaidCode, setMermaidCode] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');
  
  // 用于存储临时编辑值的状态
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [tempNodeId, setTempNodeId] = useState<string>('');
  
  // 添加代码编辑器的专门状态
  const [codeEditorFocused, setCodeEditorFocused] = useState(false);
  
  // 添加成功消息状态
  const [successMessage, setSuccessMessage] = useState('');

  // 应用布局的函数
  const applyLayout = useCallback(() => {
    if (nodes.length > 0) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, layoutDirection);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      
      // 延迟执行fitView，确保节点位置更新完成
      setTimeout(() => {
        if (reactFlowInstance) {
          reactFlowInstance.fitView({ 
            padding: 0.3,
            includeHiddenNodes: false,
            minZoom: 0.5,
            maxZoom: 1.5
          });
        }
      }, 150);
    }
  }, [nodes, edges, layoutDirection, reactFlowInstance]);

  // 解析Mermaid代码为节点和连线
  const parseMermaidCode = useCallback((code: string) => {
    const lines = code.split('\n').filter(line => line.trim() && !line.trim().startsWith('flowchart'));
    const newNodes: FlowNode[] = [];
    const newEdges: FlowEdge[] = [];
    
    // 用于存储已定义的节点ID
    const definedNodes = new Set<string>();
    
    // 第一遍：收集所有节点定义
    lines.forEach((line) => {
      line = line.trim();
      
      // 解析标准节点: 节点ID[标签]
      const nodeMatch = line.match(/^\s*(\w+)\s*\[([^\]]+)\]/);
      if (nodeMatch) {
        const [, id, label] = nodeMatch;
        const type = id.toLowerCase().includes('decision') ? 'decision' : 
                     id.toLowerCase().includes('用户') || id.toLowerCase().includes('start') ? 'start' : 
                     id.toLowerCase().includes('end') ? 'end' : 'node';
        
        newNodes.push({
          id: id,
          type: type === 'decision' ? 'decision' : 'default',
          position: { x: 0, y: 0 }, // 初始位置设为0，让Dagre计算
          data: { label: label, type }
        });
        definedNodes.add(id);
      }
      
      // 解析决策节点: 节点ID{标签}
      const decisionMatch = line.match(/^\s*(\w+)\s*\{([^}]+)\}/);
      if (decisionMatch) {
        const [, id, label] = decisionMatch;
        newNodes.push({
          id: id,
          type: 'decision',
          position: { x: 0, y: 0 }, // 初始位置设为0，让Dagre计算
          data: { label: label, type: 'decision' }
        });
        definedNodes.add(id);
      }
      
      // 解析圆形节点: 节点ID([标签])
      const circleMatch = line.match(/^\s*(\w+)\s*\(\[([^\]]+)\]\)/);
      if (circleMatch) {
        const [, id, label] = circleMatch;
        const type = id.toLowerCase().includes('用户') || id.toLowerCase().includes('start') ? 'start' : 'node';
        newNodes.push({
          id: id,
          type: type === 'start' ? 'start' : 'default',
          position: { x: 0, y: 0 }, // 初始位置设为0，让Dagre计算
          data: { label: label, type }
        });
        definedNodes.add(id);
      }
    });
    
    // 第二遍：解析连接关系
    lines.forEach((line) => {
      line = line.trim();
      
      // 解析带标签的连接: A -->|标签| B
      const labeledEdgeMatch = line.match(/^\s*(\w+)\s*--?>\s*\|([^|]+)\|\s*(\w+)/);
      if (labeledEdgeMatch) {
        const [, from, label, to] = labeledEdgeMatch;
        // 确保目标节点存在，如果不存在则创建
        if (!definedNodes.has(to)) {
          newNodes.push({
            id: to,
            type: 'default',
            position: { x: 0, y: 0 }, // 初始位置设为0，让Dagre计算
            data: { label: to, type: 'node' }
          });
          definedNodes.add(to);
        }
        
        newEdges.push({
          id: `${from}-${to}-${label}`,
          source: from,
          target: to,
          label: label,
          type: 'smoothstep',
          style: getEdgeStyle({ id: `${from}-${to}-${label}`, source: from, target: to } as FlowEdge),
          markerEnd: { 
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#6b7280'
          },
          labelBgStyle: {
            fill: '#ffffff',
            fillOpacity: 0.8,
            stroke: '#d1d5db',
            strokeWidth: 1
          },
          labelBgPadding: [4, 4] as [number, number],
          labelBgBorderRadius: 4
        });
        return;
      }
      
      // 解析不带标签的连接: A --> B
      const edgeMatch = line.match(/^\s*(\w+)\s*--?>\s*(\w+)/);
      if (edgeMatch) {
        const [, from, to] = edgeMatch;
        // 确保目标节点存在，如果不存在则创建
        if (!definedNodes.has(to)) {
          newNodes.push({
            id: to,
            type: 'default',
            position: { x: 0, y: 0 }, // 初始位置设为0，让Dagre计算
            data: { label: to, type: 'node' }
          });
          definedNodes.add(to);
        }
        
        newEdges.push({
          id: `${from}-${to}`,
          source: from,
          target: to,
          type: 'smoothstep',
          style: getEdgeStyle({ id: `${from}-${to}`, source: from, target: to } as FlowEdge),
          markerEnd: { 
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#6b7280'
          },
          labelBgStyle: {
            fill: '#ffffff',
            fillOpacity: 0.8,
            stroke: '#d1d5db',
            strokeWidth: 1
          },
          labelBgPadding: [4, 4] as [number, number],
          labelBgBorderRadius: 4
        });
      }
    });
    
    setNodes(newNodes);
    setEdges(newEdges);
  }, []);

  // 生成Mermaid代码
  const generateMermaidCode = useCallback(() => {
    let code = 'flowchart TD\n';
    
    // 添加节点 - 使用正确的Mermaid语法
    nodes.forEach(node => {
      const label = node.data?.label || node.id;
      if (node.data?.type === 'decision') {
        code += `    ${node.id}{"${label}"}\n`;
      } else if (node.data?.type === 'start' || node.data?.type === 'end') {
        code += `    ${node.id}(["${label}"])\n`;
      } else {
        code += `    ${node.id}["${label}"]\n`;
      }
    });
    
    // 添加空行分隔节点和连接
    if (nodes.length > 0 && edges.length > 0) {
      code += '\n';
    }
    
    // 添加连线
    edges.forEach(edge => {
      if (edge.label) {
        code += `    ${edge.source} -->|"${edge.label}"| ${edge.target}\n`;
      } else {
        code += `    ${edge.source} --> ${edge.target}\n`;
      }
    });
    
    return code;
  }, [nodes, edges]);

  // 加载文件
  const loadFile = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');
      const content = await readFile(filePath);
      setMermaidCode(content);
      parseMermaidCode(content);
    } catch (err) {
      setError('加载文件失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  }, [filePath, parseMermaidCode]);

  // 保存文件 - 始终可用，支持双向同步
  const saveFile = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');
      const newCode = generateMermaidCode();
      await writeFile(filePath, newCode);
      setMermaidCode(newCode);
      setIsEditing(false);
      
      // 显示成功提示
      setSuccessMessage('保存成功！');
      setTimeout(() => setSuccessMessage(''), 2000);
      
    } catch (err) {
      setError('保存文件失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  }, [filePath, generateMermaidCode]);

  // 自动保存功能 - 当节点或边发生变化时自动更新Mermaid代码
  useEffect(() => {
    // 在代码编辑模式下，不自动覆盖用户的输入
    if (!isEditing) {
      const newCode = generateMermaidCode();
      setMermaidCode(newCode);
    }
  }, [nodes, edges, generateMermaidCode, isEditing]);

  // 监听ReactFlow的变化并同步到Mermaid代码
  const handleNodesChangeWithSync = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    []
  );
  
  const handleEdgesChangeWithSync = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    []
  );
  
  const handleConnectWithSync = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      
      const newEdge: FlowEdge = {
        id: `${connection.source}-${connection.target}`,
        source: connection.source,
        target: connection.target,
        type: 'smoothstep',
        style: getEdgeStyle({ id: `${connection.source}-${connection.target}`, source: connection.source, target: connection.target } as FlowEdge),
        markerEnd: { 
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#6b7280'
        },
        labelBgStyle: {
          fill: '#ffffff',
          fillOpacity: 0.8,
          stroke: '#d1d5db',
          strokeWidth: 1
        },
        labelBgPadding: [4, 4] as [number, number],
        labelBgBorderRadius: 4
      };
      
      setEdges((eds) => [...eds, newEdge]);
    },
    []
  );
  
  const addNode = () => {
    const newNode: FlowNode = {
      id: `node_${Date.now()}`,
      type: 'default',
      position: { x: 0, y: 0 }, // 初始位置设为0，让Dagre计算
      data: { label: '新节点', type: 'node' }
    };
    setNodes(prev => [...prev, newNode]);
  };
  
  const deleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    setEdges(prev => prev.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
    if (selectedNode === nodeId) setSelectedNode(null);
    if (editingNodeId === nodeId) {
      setEditingNodeId(null);
      setTempNodeId('');
    }
  };
  
  const updateNodeText = (nodeId: string, text: string) => {
    setNodes(prev => 
      prev.map(node => 
        node.id === nodeId ? { ...node, data: { ...node.data, label: text } } : node
      )
    );
  };

  const updateNodeId = (oldId: string, newId: string) => {
    if (oldId === newId) return;
    
    // 检查新ID是否已存在
    if (nodes.some(node => node.id === newId && node.id !== oldId)) {
      alert('节点ID已存在，请使用其他ID');
      return;
    }
    
    // 更新节点ID
    setNodes(prev => 
      prev.map(node => 
        node.id === oldId ? { ...node, id: newId } : node
      )
    );
    
    // 更新所有相关的边
    setEdges(prev => 
      prev.map(edge => ({
        ...edge,
        id: edge.id.replace(oldId, newId),
        source: edge.source === oldId ? newId : edge.source,
        target: edge.target === oldId ? newId : edge.target
      }))
    );
    
    if (selectedNode === oldId) {
      setSelectedNode(newId);
    }
    if (editingNodeId === oldId) {
      setEditingNodeId(newId);
      setTempNodeId(newId);
    }
  };

  // 处理节点ID编辑开始
  const handleNodeIdEditStart = (nodeId: string) => {
    setEditingNodeId(nodeId);
    setTempNodeId(nodeId);
  };

  // 处理节点ID编辑完成
  const handleNodeIdEditComplete = () => {
    if (editingNodeId && tempNodeId) {
      updateNodeId(editingNodeId, tempNodeId);
    }
    setEditingNodeId(null);
    setTempNodeId('');
  };

  // 处理节点ID编辑取消
  const handleNodeIdEditCancel = () => {
    setEditingNodeId(null);
    setTempNodeId('');
  };

  // 当节点或边发生变化时，自动应用布局
  useEffect(() => {
    if (nodes.length > 0 && !isEditing) {
      // 延迟应用布局，确保所有变化都已完成
      const timer = setTimeout(() => {
        applyLayout();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [nodes.length, edges.length, isEditing, applyLayout]);

  useEffect(() => {
    loadFile();
  }, [loadFile]);

  useEffect(() => {
    // 在代码编辑模式下，不自动覆盖用户的输入
    if (!isEditing) {
      const newCode = generateMermaidCode();
      setMermaidCode(newCode);
    }
  }, [nodes, edges, generateMermaidCode, isEditing]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-red-700 font-medium">错误</span>
        </div>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className={`flex h-full bg-white ${className}`}>
      {/* 左侧编辑区域 */}
      <div className="w-[300px] bg-gray-50 border-r border-gray-200 p-4 overflow-auto flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">流程编辑器</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1 rounded-md text-sm ${
                isEditing 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {isEditing ? '预览' : '编辑'}
            </button>
            <button
              onClick={addNode}
              className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
            >
              添加节点
            </button>
            {/* 移除左侧的保存按钮 */}
          </div>
        </div>
        
        {isEditing ? (
          <div className="space-y-2">
            {nodes.map((node) => (
              <div
                key={node.id}
                className={`p-3 border rounded-md cursor-move ${
                  selectedNode === node.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 bg-white'
                }`}
                onClick={() => setSelectedNode(node.id)}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">节点ID:</label>
                    {editingNodeId === node.id ? (
                      <div className="flex items-center space-x-1">
                        <input
                          type="text"
                          value={tempNodeId}
                          onChange={(e) => setTempNodeId(e.target.value)}
                          className="w-32 px-2 py-1 border border-blue-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                        <button
                          onClick={handleNodeIdEditComplete}
                          className="text-green-600 hover:text-green-700 text-xs"
                          title="确认"
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleNodeIdEditCancel}
                          className="text-red-600 hover:text-red-700 text-xs"
                          title="取消"
                        >
                          ✗
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <span 
                          className="w-32 px-2 py-1 border border-transparent rounded text-xs font-mono hover:border-gray-300 cursor-text"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNodeIdEditStart(node.id);
                          }}
                        >
                          {node.id}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">节点标签:</label>
                    <input
                      type="text"
                      value={node.data?.label || ''}
                      onChange={(e) => updateNodeText(node.id, e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm ml-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">节点类型:</label>
                    <select
                      value={node.data?.type || 'node'}
                      onChange={(e) => {
                        const newType = e.target.value as FlowNodeData['type'];
                        setNodes(prev => 
                          prev.map(n => 
                            n.id === node.id ? { ...n, data: { ...n.data, type: newType } } : n
                          )
                        );
                      }}
                      className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="start">开始</option>
                      <option value="node">普通节点</option>
                      <option value="decision">决策节点</option>
                      <option value="end">结束</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-end mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNode(node.id);
                    }}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    删除节点
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
            <div className="space-y-2">
              {nodes.map((node) => (
                <div
                  key={node.id}
                  className="p-3 border border-gray-300 rounded-md bg-white"
                >
                  <div className="font-medium text-gray-800">{node.data?.label}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    类型: {node.data?.type} | ID: {node.id}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* 右侧预览区域 */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden min-w-0">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div>
              {/* 移除流程图预览标题 */}
              <div className="text-sm text-gray-600">
                文件: {filePath}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* 布局方向选择器 */}
              <select
                value={layoutDirection}
                onChange={(e) => setLayoutDirection(e.target.value as 'TB' | 'LR')}
                className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label="选择布局方向"
              >
                <option value="TB">垂直布局</option>
                <option value="LR">水平布局</option>
              </select>
              
              {/* 重新布局按钮 */}
              <button
                onClick={applyLayout}
                className="px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700"
                title="重新应用布局"
              >
                重新布局
              </button>
              
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`px-3 py-1 rounded-md text-sm ${
                  isEditing 
                    ? 'bg-gray-600 text-white' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isEditing ? '预览模式' : '代码模式'}
              </button>
              {/* 保留右侧的保存按钮 */}
              <button
                onClick={saveFile}
                className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
              >
                保存
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-2 p-2 rounded-md bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {successMessage && (
            <div className="mt-2 p-2 rounded-md bg-green-50 border border-green-200">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-auto p-4 bg-white">
          {isEditing ? (
            <div className="h-full flex flex-col">
              <textarea
                value={mermaidCode}
                onChange={(e) => {
                  setMermaidCode(e.target.value);
                  parseMermaidCode(e.target.value);
                }}
                className="flex-1 w-full p-4 border border-gray-300 rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="在此编辑Mermaid代码..."
                style={{
                  userSelect: 'text',
                  cursor: 'text',
                  pointerEvents: 'auto'
                } as React.CSSProperties}
                onFocus={(e) => {
                  setCodeEditorFocused(true);
                  // 强制设置样式
                  const target = e.target;
                  target.style.setProperty('user-select', 'text', 'important');
                  target.style.setProperty('cursor', 'text', 'important');
                  target.style.setProperty('pointer-events', 'auto', 'important');
                  target.style.setProperty('-webkit-user-select', 'text', 'important');
                  target.style.setProperty('-moz-user-select', 'text', 'important');
                  target.style.setProperty('-ms-user-select', 'text', 'important');
                }}
                onBlur={(e) => {
                  setCodeEditorFocused(false);
                  // 保持样式设置
                  const target = e.target;
                  target.style.setProperty('user-select', 'text', 'important');
                  target.style.setProperty('cursor', 'text', 'important');
                  target.style.setProperty('pointer-events', 'auto', 'important');
                  target.style.setProperty('-webkit-user-select', 'text', 'important');
                  target.style.setProperty('-moz-user-select', 'text', 'important');
                  target.style.setProperty('-ms-user-select', 'text', 'important');
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onCompositionStart={(e) => {
                  e.stopPropagation();
                }}
                onCompositionEnd={(e) => {
                  e.stopPropagation();
                }}
                onInput={(e) => {
                  e.stopPropagation();
                }}
                onKeyDown={(e) => {
                  // 阻止事件冒泡
                  e.stopPropagation();
                  
                  // Ctrl+S 保存
                  if (e.ctrlKey && e.key === 's') {
                    e.preventDefault();
                    saveFile();
                  }
                  
                  // Tab 键处理
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const target = e.target as HTMLTextAreaElement;
                    const start = target.selectionStart;
                    const end = target.selectionEnd;
                    const value = target.value;
                    
                    // 插入两个空格作为缩进
                    const newValue = value.substring(0, start) + '  ' + value.substring(end);
                    
                    // 直接更新状态，而不是通过事件
                    setMermaidCode(newValue);
                    parseMermaidCode(newValue);
                    
                    // 设置光标位置
                    setTimeout(() => {
                      target.selectionStart = target.selectionEnd = start + 2;
                    }, 0);
                  }
                }}
              />
              <div className="mt-2 text-xs text-gray-500">
                提示：支持Mermaid语法，实时预览效果 | Tab键缩进 | Ctrl+S保存
                {codeEditorFocused && (
                  <span className="ml-2 text-blue-600 font-medium">
                    ✓ 编辑模式已激活
                  </span>
                )}
              </div>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChangeWithSync}
              onEdgesChange={handleEdgesChangeWithSync}
              onConnect={handleConnectWithSync}
              onInit={setReactFlowInstance}
              fitView
              className="min-h-full"
              defaultEdgeOptions={{
                type: 'smoothstep',
                style: { strokeWidth: 2, stroke: '#6b7280' },
                markerEnd: { 
                  type: MarkerType.ArrowClosed,
                  width: 20,
                  height: 20,
                  color: '#6b7280'
                }
              }}
              snapToGrid={true}
              snapGrid={[15, 15]}
              minZoom={0.1}
              maxZoom={2}
              attributionPosition="bottom-right"
            >
              <Controls 
                showZoom={true}
                showFitView={true}
                showInteractive={false}
                position="bottom-left"
              />
              <Background 
                color="#f8fafc"
                gap={20}
                size={1}
              />
            </ReactFlow>
          )}
        </div>
      </div>
    </div>
  );
};