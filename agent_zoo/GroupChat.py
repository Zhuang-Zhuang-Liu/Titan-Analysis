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


def agent_create(path,llm_config,agent_prompts,rag_guide):
    output_dir = Path(path) 
    output_dir.mkdir(exist_ok=True) 
    executor = JupyterCodeExecutor(jupyter_server = LocalJupyterServer(),timeout= 30,output_dir=output_dir) #每次需要reset,否则pipe error
    code_executor_agent = autogen.UserProxyAgent(name="code_executor_agent",human_input_mode="NEVER",
                                                 code_execution_config={"executor": executor,"last_n_messages": 3,'max_retries':2}) 

    #knowledge rag
    guide_local_path = 'guide.txt'
    with open(guide_local_path, 'w') as file:file.write(rag_guide) 
    print('*** rag guide save to local：',guide_local_path )
    classify_agent = AssistantAgent(name="classify_agent",llm_config=llm_config,system_message=agent_prompts['promopt_rag_classify_agent']) 


    ragproxyagent = RetrieveUserProxyAgent(name="ragproxyagent",retrieve_config={"task": "qa","vector_db": "chroma",
                                                                                 "update_context": True, #选中则可以更新rag database
                                                                                 "embedding_model": "all-MiniLM-L6-v2","get_or_create": True,  
                                                                                 "docs_path": guide_local_path  },  human_input_mode="NEVER")

    ragproxyagent.reset()

    user_proxy = autogen.UserProxyAgent(name="Admin",code_execution_config=False,
                                        system_message="""A human admin.Plan execution needs to be approved by this admin.""")

    planner = autogen.AssistantAgent(name="planner",llm_config=llm_config,system_message=agent_prompts['promopt_planner'])

    project_manager = autogen.AssistantAgent(name="project_manager",llm_config=llm_config,code_execution_config=False,
                                             system_message = agent_prompts['promopt_project_manager'] )  

    code_writer_agent = autogen.AssistantAgent(name="code_writer_agent",llm_config=llm_config,code_execution_config=False,
                                               system_message=agent_prompts['promopt_code_writer_agent']) 

    analyst = autogen.AssistantAgent(name="analyst",llm_config=llm_config,code_execution_config=False,
                                     system_message=agent_prompts['promopt_analyst']) 

    checker = autogen.AssistantAgent(name="checker",llm_config=llm_config,code_execution_config=False,
                                     system_message=agent_prompts['promopt_checker'])
    # history limit
    context_handling = transform_messages.TransformMessages(
        transforms=[transforms.MessageHistoryLimiter(max_messages=4),
                    transforms.MessageTokenLimiter(max_tokens=4000, max_tokens_per_message=4000, min_tokens=50)]  )
    #context_handling.add_to_agent(code_writer_agent)
    print('***agent_ready***')
    
    return user_proxy,code_writer_agent,code_executor_agent, checker,project_manager,planner,analyst,ragproxyagent,classify_agent


def load_data_and_prompts(dataset_card_path,agent_prompts_path,guide_path):
    import json
    import pandas as pd
    # load prompts
    with open(agent_prompts_path, 'r') as file:  prompts = json.load(file)

    # load data_info
    with open(dataset_card_path, 'r') as file:
        dataset_card = json.load(file)
        data_info = """\n{数据格式示例}={\n""" + pd.read_csv(dataset_card['data_path']).head(3).to_string() \
                        +  """}\n\n{数据地址}="""+ dataset_card['data_path'] \
                        +  """}\n\n{数据描述}="""+ dataset_card['data_describe']
        
    with open(guide_path, 'r') as file:
        guide = json.load(file)['demo_da_guide']
        
    return prompts,data_info,guide


def show_chat_history( result ):
    for i in range(len(result.chat_history)):
        print('---------------------------------')
        print(result.chat_history[i]['role'])
        print(result.chat_history[i]['content'])
    if save is True:
        with open('output.txt', 'w') as file:
            file.write(str(result) + '\n')
            print("***chat_history saved***")

#################################################

import re
def extract_info_to_dict(text):
    pairs = re.findall(r'\{(.*?)\}=\{(.*?)\}', text)  # 使用正则表达式提取键值对
    result_dict = {}
    for key, value in pairs:
        result_dict[key] = value
    return result_dict

def search_da_guide(data_analysis_guide, keyword):
    """在给定的数据分析指南字典中，根据输入的关键词进行模糊匹配，查找对应的键值对"""
    for key, value in data_analysis_guide.items():
        if key in keyword or keyword in key:
            print("***已检索到【数据分析指南】:{}***".format(key))
            print('-----------------------------------------------------------') 
            rag_da_guide = "\n{数据分析指南}:" + keyword + '=' + str(value) 
            return rag_da_guide
    

def search_indicator_guide(indicator_guide, keyword_list):
    rag_indicator_guide = "\n{指标口径指南}:"
    for i in keyword_list:
        found = False
        print("***正在检索与【{}】有关的【指标口径指南】***".format(i))
        for key, value in indicator_guide.items():
            if key in i or i in key:
                print("***已检索到相关内容:{}***".format( str(value))  )
                found = True
                rag_indicator_guide = rag_indicator_guide + i + '='+ str(value) + "   "
        if not found:  # 如果内层循环结束后仍未找到匹配项
            print("***未检索到相关的【指标口径指南】,Titan 要自己发挥啦***")
        print('-----------------------------------------------------------') 
    rag_indicator_guide = rag_indicator_guide
    return rag_indicator_guide

#################################################

class Titan():
    titan_type = 'date_analysis'

    def __init__(self, guide, datacard, prompts):
        self.guide = guide
        self.datacard = datacard
        self.prompts=prompts
        
    def task_input(self):
        print('***请输入需要agent完成的任务，如需使用demo任务，请输入“默认”')
        demo_task = """{任务} ={把业务日期在24年5月之后和24年3月之前的用户分别定义为a组和b组，统计2个分组的男性用户在不同等级城市的人均销售收入，
                    告诉我这2个组的男性用户的人均销售收入，在哪个城市等级的差异是最大的}"""
        task_info_input = input()
        if len(task_info_input) < 10 : task_info = demo_task
        else: task_info = task_info_input
        conversation = user_proxy.initiate_chat( classify_agent , message=task_info,max_turns = 1)
        result = conversation.chat_history[1]['content']
        result_dict = extract_info_to_dict(  result )
    
        # da guide rag
        rag_da_guide  = search_da_guide(da_guide_dict, result_dict['任务类型'])
        del result_dict['任务类型']
    
        # indicator guide rag
        split_list = result_dict['任务涉及的指标及标签'].split(',')  #按照,拆分为列表
        rag_indicator_guide = search_indicator_guide(indicator_guide, split_list)
        del result_dict['任务涉及的指标及标签']
    
        # join
        result = str(result_dict) +  str(rag_da_guide) + rag_indicator_guide + data_info
        self.task = result 
        print('[任务已接收]:' + self.task)
        
    def analysis(self,path,llm_config,max_round_num =27):
        self.path = path
        
        task_info = self.task
        agent_prompts = self.prompts
        rag_guide = self.guide
        data_info = self.datacard

        def custom_speaker_selection_func(last_speaker: Agent, groupchat: autogen.GroupChat):
            """
            Define: a customized speaker selection function.
            Returns: Return an `Agent` class or a string from ['auto', 'manual', 'random', 'round_robin',None] to select a default method to use.
            """
            messages = groupchat.messages
        
            error_count = sum(1 for msg in messages if "(execution failed)" in msg["content"] or "FileNotFoundError" in msg["content"] )
            if error_count >= 2:
                print('当前已累计报错2次，请重新描述问题试试吧')
                return None
        
            if last_speaker is classify_agent :
                if  "表信息查询" not in messages[-1]["content"] :
                    print('/n***关于以上信息，如果您有需要嘱托的，请发给我(如果没有请单击空格)***/n')
                    return user_proxy
                else:
                    return analyst
                
            if last_speaker is user_proxy:
                return planner   
                
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

        # func:agent create
        user_proxy,code_writer_agent,code_executor_agent,checker,project_manager,planner,analyst,ragproxyagent,\
        classify_agent = agent_create(path=path,llm_config = llm_config, agent_prompts=agent_prompts, rag_guide=rag_guide)

        # for error : broken pip
        from pathlib import Path
        output_dir = Path(path) # 否则pipe error
        executor = JupyterCodeExecutor(jupyter_server = LocalJupyterServer(),timeout= 30,output_dir=output_dir) # 否则pipe error
        code_executor_agent = autogen.UserProxyAgent(name="code_executor_agent",human_input_mode="NEVER",code_execution_config={"executor": executor,"last_n_messages": 3,'max_retries':2}) # 否则pipe error

        # agent analysis
        groupchat = autogen.GroupChat(agents=[user_proxy,code_writer_agent,code_executor_agent, checker,project_manager,planner,
                                              analyst,ragproxyagent,classify_agent],
                                      messages=[],max_round=max_round_num,speaker_selection_method=custom_speaker_selection_func)
        manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=llm_config)
        chat_history = ragproxyagent.initiate_chat(manager,message=ragproxyagent.message_generator,problem = '{任务}=' + task_info + data_info ) 
        
        #save
        import datetime
        import sys
        now = datetime.datetime.now()
        file_name = now.strftime("%Y%m%d%H%M%S") + ".txt"
        with open(file_name, 'w') as file:
            file.write(str(chat_history))
            print('save to : ','analysis_output.txt')

        print("""✨ Titan-Analysis  ✨
        ✨ (〃’▽’〃) Let Agent be DataAnalyst ✨
        --------------------------------------------------------------------------------""")

        return chat_history
