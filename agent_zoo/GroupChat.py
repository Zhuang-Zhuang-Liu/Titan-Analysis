
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


