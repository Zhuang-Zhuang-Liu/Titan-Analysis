


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



