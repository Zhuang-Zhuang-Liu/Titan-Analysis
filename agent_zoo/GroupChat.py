import numpy as np # linear algebra
import pandas as pd # data processing, CSV file I/O (e.g. pd.read_csv)
import random

from PIL import Image
import matplotlib.pyplot as plt
import os


import tempfile
from pathlib import Path

from datetime import datetime, timedelta
import copy
import pprint
import re
from typing import Dict, List, Tuple

import unittest
import autogen
from typing import Dict, List
from autogen import Agent
from autogen import AssistantAgent, UserProxyAgent,ConversableAgent
from autogen.coding import LocalCommandLineCodeExecutor
from autogen.coding import CodeBlock
from autogen.coding.jupyter import JupyterCodeExecutor, LocalJupyterServer
from autogen.agentchat.contrib.retrieve_assistant_agent import RetrieveAssistantAgent
from autogen.agentchat.contrib.retrieve_user_proxy_agent import RetrieveUserProxyAgent
from autogen.agentchat.contrib.capabilities import transform_messages, transforms
from autogen.agentchat.contrib.capabilities.transforms import  MessageHistoryLimiter, MessageTokenLimiter

#api
api_zz_deep = 'sk-ca2eb7e5374c47419bc8f6276f90cda1'
url_deep = 'https://api.deepseek.com/v1'
model_deep="deepseek-chat" # deepseek-chat *	擅长通用对话任务	32K * deepseek-coder 16K
llm_config_deep = {"config_list": [{ "model": model_deep,"base_url": url_deep,"api_key": api_zz_deep,"temperature": 0,"cache_seed":None  }] }  
#如果想要每次都访问llm，不希望直接取缓存结果可配置为None
llm_config = llm_config_deep
print('llm_config：',llm_config)


def folder_clean(folder_path):
    if os.path.isdir(folder_path):
        for file in os.listdir(folder_path):
            file_path = os.path.join(folder_path, file)
            if os.path.isfile(file_path):
                os.remove(file_path)
        print('***folder clean ready***')
    else:     
        print('***folder not exist***')


#folder path
path="coding"
folder_clean(path)
output_dir = Path(path) 
output_dir.mkdir(exist_ok=True) 
executor = JupyterCodeExecutor(jupyter_server = LocalJupyterServer(),
                               timeout= 30,
                               output_dir=output_dir) #每次需要reset,否则pipe error
code_executor_agent = autogen.UserProxyAgent(name="code_executor_agent",human_input_mode="NEVER",
                                             code_execution_config={"executor": executor,
                                                                    "last_n_messages": 3,
                                                                   'max_retries':2
                                                                   } ) #每次需要reset,否则pipe error

#knowledge rag
classify_agent = AssistantAgent(name="classify_agent",llm_config=llm_config,system_message=promopt_rag_classify_agent)

ragproxyagent = RetrieveUserProxyAgent(name="ragproxyagent",retrieve_config={"task": "qa","vector_db": "chroma",
                                                                             "update_context": True, #选中则可以更新rag database
                                                                             "embedding_model": "all-MiniLM-L6-v2","get_or_create": True,  
                                                                             "docs_path": guide_path  },  human_input_mode="NEVER")
ragproxyagent.reset()

user_proxy = autogen.UserProxyAgent(name="Admin",code_execution_config=False,
                                    system_message="""A human admin.Plan execution needs to be approved by this admin.""")

planner = autogen.AssistantAgent(name="planner",llm_config=llm_config,system_message=promopt_planner)

project_manager = autogen.AssistantAgent(name="project_manager",llm_config=llm_config,code_execution_config=False,
                                         system_message=promopt_project_manager)

code_writer_agent = autogen.AssistantAgent(name="code_writer_agent",llm_config=llm_config,code_execution_config=False,
                                           system_message=promopt_code_writer_agent)

analyst = autogen.AssistantAgent(name="analyst",llm_config=llm_config,code_execution_config=False,system_message=promopt_analyst )

checker = autogen.AssistantAgent(name="checker",llm_config=llm_config,code_execution_config=False,system_message=promopt_checker)

# history limit
# suppose this capability is not available
context_handling = transform_messages.TransformMessages(
    transforms=[transforms.MessageHistoryLimiter(max_messages=4),
                transforms.MessageTokenLimiter(max_tokens=4000, max_tokens_per_message=4000, min_tokens=50)]  )
#context_handling.add_to_agent(code_writer_agent)
#不能简单限制上下文，因为最上文的数据基础信息，不能丢。
#替代方案是把报错信息，像sensitive一样替换掉

print('***agent_ready***')






import autogen
from autogen import Agent

def custom_speaker_selection_func(last_speaker: Agent, groupchat: autogen.GroupChat):
    """
    Define: a customized speaker selection function.
    Returns: Return an `Agent` class or a string from ['auto', 'manual', 'random', 'round_robin',None] to select a default method to use.
    """
    messages = groupchat.messages
    
    ### 0616 update  ### early stop(早停)逻辑：统计累计bug次数
    error_count = sum(1 for msg in messages if "(execution failed)" in msg["content"] or "FileNotFoundError" in msg["content"] )
    if error_count >= 2:
        print('当前已累计报错2次，请重新描述问题试试吧')
        return None
        
    ####################
    
    if last_speaker is ragproxyagent:
        return classify_agent

    if last_speaker is classify_agent :
        if  "表信息查询" not in messages[-1]["content"] :
            return planner
        else:
            return analyst
        
    if last_speaker is planner:
        return project_manager
    
    if last_speaker is project_manager:
        if  "计划已完成" not in messages[-1]["content"] :
            return code_writer_agent
        else:
            return analyst
    
    if last_speaker is code_writer_agent:
        if "Code has been executed successfully" not in messages[-1]["content"] :
            return code_executor_agent
        else:
            return project_manager

    if last_speaker is code_executor_agent:
            return code_writer_agent

    if last_speaker is analyst :
        return checker    
    else:
        return None # None=终止对话
print('***speaker_selection_func ready***')



import autogen

def agent_DA(task_info): 
    print('\n***Agent_Data_Analysis launching***\n')
    groupchat = autogen.GroupChat(agents=[user_proxy,code_writer_agent,code_executor_agent, checker,project_manager,planner,
                                          analyst,ragproxyagent,classify_agent],
                                  messages=[],enable_clear_history = True,
                                  max_round=27,speaker_selection_method=custom_speaker_selection_func)
    manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=llm_config)
    ragproxyagent.initiate_chat(manager,message=ragproxyagent.message_generator, # 目前的局限性，必须第一个让RetrieveUserProxyAgent发言
                                problem = task_info + data_info ) # 发言人.initiate_chat（听话人）

    show_images_in_directory(path)# show plt


