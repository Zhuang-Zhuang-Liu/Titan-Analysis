# -*- coding: utf-8 -*-
import json
import os
from typing import Dict, Any, List
from camel.agents import ChatAgent
from camel.messages import BaseMessage
from utils.utils import load_work_documents
from utils.agent_manager import register_agent

def create_agents_from_config(
    prompts_json_path: str,
    model: Any,
    status: str = "",
    code_tools: List[Any] = None
) -> Dict[str, ChatAgent]:
    """
    Dynamically create agents based on the prompts.json configuration.
    
    Args:
        prompts_json_path: Path to the prompts.json file.
        model: LLM model configuration.
        document_path: Path to the work_document folder.
        status: Status information (used for status_bar).
        code_tools: List of code tools.
    
    Returns:
        Dict[str, ChatAgent]: A dictionary of agents with role_name as the key.
    """
    
    # load prompts
    with open(prompts_json_path, 'r', encoding='utf-8') as f:
        prompts_config = json.load(f)
    
    # create agent dict
    agents = {}
    for agent_key, agent_config in prompts_config.items():
        role_name = agent_config.get("role_name", agent_key)

        # # base system_content
        content = agent_config.get("content", "")
        system_content = content
        
        # llm config
        for field_key, field_value in agent_config.items():
            # document config
            if field_key == "document_path" and field_value:
                if isinstance(field_value, str) and field_value.strip():
                    # join path
                    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                    document_path = os.path.join(project_root, field_value)
                    if os.path.exists(document_path):
                        try:
                            file_dir = os.path.dirname(document_path)
                            file_name = os.path.basename(document_path)
                            work_document = load_work_documents(path=file_dir, file_name=file_name)
                            print(f"[SYSTEM] Document Config:\n {work_document}")
                            system_content = f"{work_document}{system_content}"
                        except Exception as e:
                            print(f"[WARNING] Document Config [{document_path}] Load Failed: {e}")
                    else:
                        print(f"[WARNING] Document Path Not Exist: {document_path}")
            # status_bar config
            if field_key == "status_bar" and field_value and status:
                print(f"[SYSTEM] Status Config:\n {status}")
                system_content = f"{status}\n{system_content}"
        
        # join system_content
        system_message = BaseMessage.make_assistant_message(role_name=role_name,content=system_content)
        
        # tool config
        tools = None
        code_toolkit_config = agent_config.get("code_toolkit")
        if code_toolkit_config and code_tools:
            if isinstance(code_toolkit_config, str) and code_toolkit_config == "code_tools":
                tools = code_tools
                print(f"[SYSTEM] Tool Config [{tools}] Success")
        
        # create ChatAgent
        agent = ChatAgent(system_message=system_message,model=model,tools=tools)
        register_agent(agent_key, agent_key, role_name, "Waiting for Task")
        agents[role_name] = agent
        print(f"[SYSTEM] Created agent: {role_name}")
    
    print("[SYSTEM] All Agents Created and Registered")
    print("--------------------------------------------------")
    
    return agents