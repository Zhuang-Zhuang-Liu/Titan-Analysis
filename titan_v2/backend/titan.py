# -*- coding: utf-8 -*-
import json
import sys
from tqdm import tqdm
import os

sys.stdout.reconfigure(line_buffering=True)   # 非缓冲模式实时输出
os.environ['PYTHONUNBUFFERED'] = '1'  # 设置环境变量PYTHONUNBUFFERED环境变量

from camel.models import ModelFactory
from camel.types import ModelPlatformType
from camel.toolkits import CodeExecutionToolkit
from camel.messages import BaseMessage

from dotenv import load_dotenv
from utils.utils import chat_terminate
from utils.status_bar import create_status_bar
from utils.agent_manager import update_agent_status
from utils.agent_factory import create_agents_from_config
from utils.logger import auto_logger


# load .env
load_dotenv()
api_key = os.getenv("DEEPSEEK_API_KEY")
model_type = os.getenv("MODEL_TYPE")
api_url = os.getenv("API_URL")
initial_message = os.getenv("CAMEL_TASK")
work_dir = os.path.dirname(os.path.abspath(__file__)) # 获取当前脚本所在目录


# clean terminate signal file 
terminate_signal_file = os.path.join(work_dir, 'terminate_signal.txt')
if os.path.exists(terminate_signal_file):
    os.remove(terminate_signal_file)


if __name__ == "__main__":
    # log to backend/logs
    log_directory = os.path.join(work_dir, "logs")
    with auto_logger(log_dir=log_directory):
        
        # llm config
        model = ModelFactory.create(
            model_platform=ModelPlatformType.OPENAI_COMPATIBLE_MODEL,
            model_type=model_type, 
            api_key=api_key,       
            url=api_url, 
            model_config_dict={ "temperature": 0.7,"max_tokens": 8000}
        )

        # tool: code execution
        print("--------------------------------------------------")
        code_toolkit = CodeExecutionToolkit(sandbox="jupyter",verbose=False,require_confirm=True  )
        packages_to_install = ["numpy","pandas", "matplotlib","seaborn","scikit-learn"]
        print("[SYSTEM] Loading Python Environment: ", packages_to_install)
        for package in tqdm(packages_to_install, desc="Installing Dependencies Progress"):
            try:
                result = code_toolkit.execute_command(f"pip install {package}")
            except Exception as e:
                print(f"[ERROR] Failed to install {package}: {e}")
        print("[SYSTEM] Python Environment Loading Complete")
        print("--------------------------------------------------")
        code_tools = code_toolkit.get_tools() 

        # bar : status_bar for programmer
        status_bar = create_status_bar(packages=packages_to_install)

        # group chat config
        agent_map = create_agents_from_config(
            prompts_json_path=os.path.join(work_dir, 'prompts.json'),
            model=model,
            status=status_bar,
            code_tools=code_tools,
            token_limit=36000  # max history context
        )
        AGENT_LIST = list(agent_map.keys())
        conversation_history = []
        max_rounds = 10

        # group chat
        print(f"用户: {initial_message}")
        next_agent = 'programmer'
        for i in range(max_rounds):
            # index
            print("--------------------------------------------------")
            agent = agent_map.get(next_agent)
            
            # check terminate
            if chat_terminate(work_dir):
                break
            
            # get agent memory
            context_records = agent.memory.retrieve()
            current_context = ''
            for record in context_records:
                current_context += record.memory_record.message.content
            update_agent_status(next_agent, "speaking", current_context)
            
            # input message
            if next_agent == 'programmer':
                message = BaseMessage.make_user_message(role_name="用户", content=initial_message)
            elif next_agent == 'analyst':
                conversation_str = "\n".join(conversation_history)
                message = BaseMessage.make_user_message(role_name="用户", content=conversation_str)
            else: 
                message = BaseMessage.make_user_message(role_name="用户", content=response_content)

            # talk
            response = agent.step(message)
            response_content = response.msgs[0].content
            # update agent status
            update_agent_status(next_agent, "waiting", current_context)
            
            # process output
            if next_agent == 'programmer' and hasattr(response, 'info') and 'tool_calls' in response.info:
                execution_results = []
                # tool results
                for tool_call_record in response.info['tool_calls']:
                    if hasattr(tool_call_record, 'result') and tool_call_record.result:
                        execution_results.append(tool_call_record.result)
                # execution results
                if execution_results:
                    response_content += "\n" + "\n".join(execution_results)

            # print output
            print(f"{next_agent}: {response_content}", flush=True)
            conversation_history.append(f"{next_agent}:{response_content}")

            # chat flow
            use_agentic_llm  = True #dpsk v3.2

            if not use_agentic_llm: # dpsk v3
                if next_agent == 'planner':
                    next_agent = 'assigner' 
                elif next_agent == 'assigner':
                    if "{计划已完成}" in response_content:
                        next_agent = 'analyst'
                    else:
                        next_agent = 'programmer'
                elif next_agent == 'programmer':
                    next_agent = 'assigner'
                elif next_agent == 'analyst':
                    print("[SYSTEM] Task Completed", flush=True)
                    break

            else:  #dpsk v3.2
                if  next_agent == 'programmer':
                    print("[SYSTEM] Task Completed", flush=True)
                    break
        else:
            print("[SYSTEM] Conversation Not Completed But Reached Max Rounds. Please Check Task Flow Or Increase Loop Times.", flush=True)

        #shut down
        for agent_key in AGENT_LIST:
            update_agent_status(agent_key, "waiting")    
        print("--------------------------------------------------")






