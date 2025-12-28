#!/usr/bin/env python3
"""
Agent管理器 - 统一的Agent注册和状态管理
合并了原有的agent_registry.py和agent_state_manager.py功能
为main.py和titan.py提供统一的Agent管理接口
"""
import json
import os
import threading
import time
from typing import List, Dict, Any
from dataclasses import dataclass, asdict

@dataclass
class AgentInfo:
    """Agent信息数据结构"""
    name: str
    role_name: str
    status: str
    memory: str
    agent_id: str

class AgentManager:
    """统一的Agent管理器，包含注册和状态管理功能"""
    
    def __init__(self, state_file: str = None):
        if state_file is None:
            state_file = os.path.join(os.path.dirname(__file__), '..', 'agent_states.json')
        self.state_file = state_file
        self.agents: Dict[str, AgentInfo] = {}
        self._lock = threading.Lock()
        self._load_from_file()
    
    def _load_from_file(self):
        """从文件加载agent状态"""
        with self._lock:
            try:
                if os.path.exists(self.state_file):
                    with open(self.state_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        agents_data = data.get('agents', [])
                        self.agents = {
                            agent_data['agent_id']: AgentInfo(**agent_data)
                            for agent_data in agents_data
                        }
                else:
                    self.agents = {}
            except Exception as e:
                print(f"从文件加载agent状态失败: {e}")
                self.agents = {}
    
    def _save_to_file(self):
        """保存agent状态到文件"""
        with self._lock:
            try:
                os.makedirs(os.path.dirname(self.state_file), exist_ok=True)
                agents_data = [asdict(agent) for agent in self.agents.values()]
                with open(self.state_file, 'w', encoding='utf-8') as f:
                    json.dump({
                        'agents': agents_data,
                        'timestamp': time.time()
                    }, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"保存Agent状态失败: {e}")
    
    def register_agent(self, agent_id: str, name: str, role_name: str, memory: str = "") -> None:
        """注册一个新的agent"""
        self.agents[agent_id] = AgentInfo(
            name=name,
            role_name=role_name,
            status="idle",
            memory=memory,
            agent_id=agent_id
        )
        self._save_to_file()
    
    def update_agent_status(self, agent_id: str, status: str, memory: str = None) -> None:
        """更新agent的状态和记忆
        - 1.idle - 空闲状态
        - 2.waiting - 等待状态
        - 3.thinking - 思考状态
        - 4.working - 工作状态
        - 5.speaking - 发言状态
        """
        if agent_id in self.agents:
            self.agents[agent_id].status = status
            if memory is not None:
                self.agents[agent_id].memory = memory
            self._save_to_file()
    
    def get_active_agents(self) -> List[Dict[str, Any]]:
        """获取所有活跃的agent信息"""
        self._load_from_file()  # 确保获取最新状态
        return [asdict(agent) for agent in self.agents.values()]
    
    def get_agent_by_id(self, agent_id: str) -> AgentInfo:
        """根据ID获取agent信息"""
        self._load_from_file()
        return self.agents.get(agent_id)
    
    def clear_agents(self) -> None:
        """清空所有agent"""
        with self._lock:
            self.agents.clear()
            try:
                if os.path.exists(self.state_file):
                    os.remove(self.state_file)
            except Exception as e:
                print(f"清除Agent状态失败: {e}")
    
    def get_agent_states_for_backend(self) -> List[Dict[str, str]]:
        """转换为后端AgentState格式"""
        agents = self.get_active_agents()
        return [
            {
                "name": agent["role_name"],  # 使用role_name作为显示名称
                "status": agent["status"],
                "memory": agent["memory"]
            }
            for agent in agents
        ]

# 创建全局管理器实例
_manager = AgentManager()

# 全局函数接口 - 保持向后兼容
def register_agent(agent_id: str, name: str, role_name: str, memory: str = "") -> None:
    """全局函数：注册agent"""
    _manager.register_agent(agent_id, name, role_name, memory)

def update_agent_status(agent_id: str, status: str, memory: str = None) -> None:
    """全局函数：更新agent状态"""
    _manager.update_agent_status(agent_id, status, memory)

def get_active_agents() -> List[Dict[str, Any]]:
    """全局函数：获取活跃agent列表"""
    return _manager.get_active_agents()

def clear_agents() -> None:
    """全局函数：清空agent"""
    _manager.clear_agents()

def get_agent_states_for_backend() -> List[Dict[str, str]]:
    """全局函数：获取后端格式的agent状态"""
    return _manager.get_agent_states_for_backend()

# 为了向后兼容agent_state_manager的函数

def load_agent_states() -> List[Dict[str, Any]]:
    """兼容函数：加载Agent状态"""
    return _manager.get_active_agents()

def update_agent_in_file(agent_id: str, status: str, memory: str) -> None:
    """兼容函数：更新单个Agent状态到文件"""
    _manager.update_agent_status(agent_id, status, memory)

def clear_agent_states() -> None:
    """兼容函数：清除所有Agent状态"""
    _manager.clear_agents()