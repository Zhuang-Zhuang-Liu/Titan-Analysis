import numpy as np # linear algebra
import pandas as pd # data processing, CSV file I/O (e.g. pd.read_csv)
import random
from PIL import Image
import matplotlib.pyplot as plt
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

from utils.utils import generate_random_data,data_info_put  # IO Data


import os
current_directory = os.getcwd()

def agent_create(path,llm_config,loaded_data,guide_path):
    output_dir = Path(path) 
    output_dir.mkdir(exist_ok=True) 
    executor = JupyterCodeExecutor(jupyter_server = LocalJupyterServer(),timeout= 30,output_dir=output_dir) #每次需要reset,否则pipe error
    code_executor_agent = autogen.UserProxyAgent(name="code_executor_agent",human_input_mode="NEVER",
                                                 code_execution_config={"executor": executor,"last_n_messages": 3,'max_retries':2}) 

    #knowledge rag
    classify_agent = AssistantAgent(name="classify_agent",llm_config=llm_config,system_message=loaded_data['promopt_rag_classify_agent']) 


    ragproxyagent = RetrieveUserProxyAgent(name="ragproxyagent",retrieve_config={"task": "qa","vector_db": "chroma",
                                                                                 "update_context": True, #选中则可以更新rag database
                                                                                 "embedding_model": "all-MiniLM-L6-v2","get_or_create": True,  
                                                                                 "docs_path": guide_path  },  human_input_mode="NEVER")
    ragproxyagent.reset()

    user_proxy = autogen.UserProxyAgent(name="Admin",code_execution_config=False,
                                        system_message="""A human admin.Plan execution needs to be approved by this admin.""")

    planner = autogen.AssistantAgent(name="planner",llm_config=llm_config,system_message=loaded_data['promopt_planner'])

    project_manager = autogen.AssistantAgent(name="project_manager",llm_config=llm_config,code_execution_config=False,
                                             system_message = loaded_data['promopt_project_manager'] )  

    code_writer_agent = autogen.AssistantAgent(name="code_writer_agent",llm_config=llm_config,code_execution_config=False,
                                               system_message=loaded_data['promopt_code_writer_agent']) 

    analyst = autogen.AssistantAgent(name="analyst",llm_config=llm_config,code_execution_config=False,
                                     system_message=loaded_data['promopt_analyst']) 

    checker = autogen.AssistantAgent(name="checker",llm_config=llm_config,code_execution_config=False,
                                     system_message=loaded_data['promopt_analyst'])

    # history limit
    context_handling = transform_messages.TransformMessages(
        transforms=[transforms.MessageHistoryLimiter(max_messages=4),
                    transforms.MessageTokenLimiter(max_tokens=4000, max_tokens_per_message=4000, min_tokens=50)]  )
    #context_handling.add_to_agent(code_writer_agent)
    #不能简单限制上下文，因为最上文的数据基础信息，不能丢。替代方案是把报错信息，像sensitive一样替换掉
    print('***agent_ready***')

    return user_proxy,code_writer_agent,code_executor_agent, checker,project_manager,planner,analyst,ragproxyagent,classify_agent



def task_load():
    print('***请输入数据分析任务，如使用默认任务，请输入“默认”***')
    task_info=input()
    task_info_default="""{销售收入大于1万、销售成本小于700的用户，主要分布在哪些年龄段和哪些等级城市，先单独分析、然后交叉分析这2个维度
                           备注： 年龄段的划分：18~30岁=青年，30~60=中年，60岁以上=老年}"""
    if len(task_info) <= 5:
        task_info = task_info_default
    print('[任务已接收]:' + task_info)

    return task_info



def titan_analysis(path,llm_config,loaded_data,guide_path,task_info,data_info):
    
    def custom_speaker_selection_func(last_speaker: Agent, groupchat: autogen.GroupChat):
        messages = groupchat.messages
        #early stop
        error_count = sum(1 for msg in messages if "(execution failed)" in msg["content"] or "FileNotFoundError" in msg["content"] )
        if error_count >= 2:
            print('当前已累计报错2次，请重新描述问题试试吧')
            return None

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
            if "Code_Execute_Successful" not in messages[-1]["content"] :
                return code_executor_agent
            else:
                return project_manager

        if last_speaker is code_executor_agent:
                return code_writer_agent

        if last_speaker is analyst :
            return checker    
        else:
            return None # None=终止对话
    
    
    # agent create
    user_proxy,code_writer_agent,code_executor_agent,checker,project_manager,planner,analyst,ragproxyagent,\
    classify_agent = agent_create(path=path,llm_config = llm_config, loaded_data=loaded_data, guide_path=guide_path)

    # for broken pip
    output_dir = Path(path) 
    executor = JupyterCodeExecutor(jupyter_server = LocalJupyterServer(),timeout= 30,output_dir=output_dir) #每次需要reset,否则pipe error
    code_executor_agent = autogen.UserProxyAgent(name="code_executor_agent",human_input_mode="NEVER",
                                                 code_execution_config={"executor": executor,"last_n_messages": 3,'max_retries':2})
    
    # agent analysis
    groupchat = autogen.GroupChat(agents=[user_proxy,code_writer_agent,code_executor_agent, checker,project_manager,planner,
                                          analyst,ragproxyagent,classify_agent],
                                  messages=[],max_round=27,speaker_selection_method=custom_speaker_selection_func)
    manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=llm_config)
    ragproxyagent.initiate_chat(manager,message=ragproxyagent.message_generator,problem = '{任务}=' + task_info + data_info ) 


    




