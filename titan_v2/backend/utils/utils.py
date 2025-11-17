from camel.memories import ChatHistoryMemory
from camel.memories.records import MemoryRecord
from camel.messages import BaseMessage
from camel.types import OpenAIBackendRole

import os
import json






def chat_terminate(work_dir):
    terminate_signal_file = os.path.join(work_dir, 'terminate_signal.txt')
    if os.path.exists(terminate_signal_file):
        print("[SYSTEM] 正在中止任务")
        os.remove(terminate_signal_file)
        return True
    return False




def load_work_documents(path= "work_document",file_name="DataCard_v1.json"):
    """
    读取work_document文件夹中的所有JSON文件，返回格式化的文档信息
    """
    work_doc_path = path
    documents_info = []
    if os.path.exists(work_doc_path):
        file_path = os.path.join(work_doc_path, file_name)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                doc_data = json.load(f)
            
            if "tables" in doc_data and isinstance(doc_data["tables"], list):
                for table in doc_data["tables"]:
                    doc_info = ""
                    for key, value in table.items():
                        doc_info += f"{key}: {value}\n"
                    doc_info += "-" * 50
                    documents_info.append(doc_info)
                
        except Exception as e:
            print(f"读取文件 {filename} 时出错: {e}")
    
    documents_info = "\n".join(documents_info)
    work_document = f"""
================================================================================
数据库指南：
{'-' * 50}
{documents_info}
注意事项
- 以上是work_document文件夹中的数据表信息，包含了表名、字段描述、数据格式示例等详细信息。
- 当用户提到具体的数据文件时，请参考上述数据库指南中的表信息
- 根据表名和字段描述来制定分析计划
- 确保分析步骤与数据表的结构和字段相匹配
================================================================================
"""
    return work_document




def change_memory(agent_planner, new_content, n=0):
    """
    Info: 修改agent在指定索引位置n的记忆内容为new_content
    Returns:修改后的记忆记录列表
    """
    # get memory
    context_records = agent_planner.memory.retrieve()
    
    # check index
    if n >= len(context_records):
        raise ValueError(f"索引 {n} 超出范围，当前记忆记录数量为 {len(context_records)}")
    
    # create new record
    new_record = MemoryRecord(
        message=BaseMessage.make_assistant_message(
            role_name=context_records[n].memory_record.message.role_name,
            content=new_content),
        role_at_backend=OpenAIBackendRole.SYSTEM,
        timestamp=context_records[n].memory_record.timestamp,
        agent_id=context_records[n].memory_record.agent_id
    )

    # rewrite memory
    agent_planner.memory.clear()
    for i, record in enumerate(context_records):
        if i == n:
            agent_planner.memory.write_record(new_record) #写入新记录
        else:
            agent_planner.memory.write_record(record.memory_record) #写入旧记录

    return agent_planner.memory.retrieve()
    


