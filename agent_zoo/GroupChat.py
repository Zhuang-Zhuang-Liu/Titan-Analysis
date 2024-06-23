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



