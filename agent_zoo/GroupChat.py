# 标准库导入
import json
import logging
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

# 第三方库导入
import autogen
from autogen import Agent, AssistantAgent, UserProxyAgent
from autogen.coding.jupyter import JupyterCodeExecutor, LocalJupyterServer
from autogen.agentchat.contrib.capabilities import transform_messages, transforms

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 常量定义
class Config:
    """配置常量类"""
    MAX_ROUNDS = 33
    MAX_RETRIES = 2
    TIMEOUT = 30
    MAX_MESSAGES = 4
    MAX_TOKENS = 4000
    MAX_TOKENS_PER_MESSAGE = 4000
    MIN_TOKENS = 50
    ERROR_THRESHOLD = 2
    MIN_TASK_LENGTH = 10


def load_data_and_prompts(dataset_card_path: str, agent_prompts_path: str, 
                         da_guide_path: str, indicator_guide_path: str) -> Tuple[Dict, str, Dict, Dict]:
    """
    加载数据和提示信息
    
    Args:
        dataset_card_path: 数据集卡片路径
        agent_prompts_path: 代理提示路径
        da_guide_path: 数据分析指南路径
        indicator_guide_path: 指标指南路径
        
    Returns:
        Tuple[Dict, str, Dict, Dict]: 返回提示、数据信息、数据分析指南、指标指南
    """
    try:
        # 加载提示
        with open(agent_prompts_path, 'r', encoding='utf-8') as file:
            prompts = json.load(file)

        # 加载数据信息
        merged_data_info = "\n{数据库指南}:"
        for filename in os.listdir(dataset_card_path):
            if filename.startswith("DataCard") and filename.endswith(".json"):
                file_path = os.path.join(dataset_card_path, filename)
                with open(file_path, 'r', encoding='utf-8') as file:
                    json_content = json.load(file)
                    merged_data_info += '\n' + str(json_content)

        # 加载数据分析指南
        with open(da_guide_path, 'r', encoding='utf-8') as file:
            da_guide_dict = json.load(file)

        # 加载指标指南
        with open(indicator_guide_path, 'r', encoding='utf-8') as file:
            indicator_guide = json.load(file)
             
        return prompts, merged_data_info, da_guide_dict, indicator_guide
        
    except FileNotFoundError as e:
        logger.error(f"文件未找到: {e}")
        raise
    except json.JSONDecodeError as e:
        logger.error(f"JSON解析错误: {e}")
        raise


def show_chat_history(result: Any, save_to_file: bool = False) -> None:
    """
    显示聊天历史
    
    Args:
        result: 聊天结果对象
        save_to_file: 是否保存到文件
    """
    for i, chat_item in enumerate(result.chat_history):
        logger.info('---------------------------------')
        logger.info(f"角色: {chat_item['role']}")
        logger.info(f"内容: {chat_item['content']}")
    
    if save_to_file:
        try:
            with open('output.txt', 'w', encoding='utf-8') as file:
                file.write(str(result) + '\n')
            logger.info("***聊天历史已保存***")
        except IOError as e:
            logger.error(f"保存文件失败: {e}")


def extract_info_to_dict(text: str) -> Dict[str, str]:
    """
    从文本中提取键值对信息
    
    Args:
        text: 包含键值对的文本
        
    Returns:
        Dict[str, str]: 提取的键值对字典
    """
    pairs = re.findall(r'\{(.*?)\}=\{(.*?)\}', text)
    result_dict = {}
    for key, value in pairs:
        result_dict[key] = value
    return result_dict


def search_da_guide(data_analysis_guide: Dict[str, Any], keyword: str) -> Optional[str]:
    """
    在数据分析指南中搜索关键词
    
    Args:
        data_analysis_guide: 数据分析指南字典
        keyword: 搜索关键词
        
    Returns:
        Optional[str]: 找到的指南内容，未找到返回None
    """
    for key, value in data_analysis_guide.items():
        if key in keyword or keyword in key:
            logger.info(f"***已检索到【数据分析指南】:{key}***")
            return f"\n{{数据分析指南}}:{keyword}={str(value)}"
    return None


def search_indicator_guide(indicator_guide: Dict[str, Any], keyword_list: List[str]) -> str:
    """
    在指标指南中搜索关键词列表
    
    Args:
        indicator_guide: 指标指南字典
        keyword_list: 关键词列表
        
    Returns:
        str: 找到的指标指南内容
    """
    rag_indicator_guide = "\n{指标口径指南}:"
    
    for keyword in keyword_list:
        found = False
        logger.info(f"***正在检索与【{keyword}】有关的【指标口径指南】***")
        
        for key, value in indicator_guide.items():
            if key in keyword or keyword in key:
                logger.info(f"***已检索到相关内容:{str(value)}***")
                found = True
                rag_indicator_guide += f"{keyword}={str(value)}   "
        
        if not found:
            logger.info("***未检索到相关的【指标口径指南】,Titan 要自己发挥啦***")
        logger.info('-----------------------------------------------------------')
    
    return rag_indicator_guide


class Titan:
    """Titan数据分析代理类"""
    
    titan_type = 'data_analysis'

    def __init__(self, da_guide_dict: Dict[str, Any], indicator_guide: Dict[str, Any], 
                 datacard: str, prompts: Dict[str, str], llm_config: Dict[str, Any]):
        """
        初始化Titan类
        
        Args:
            da_guide_dict: 数据分析指南字典
            indicator_guide: 指标指南字典
            datacard: 数据卡片信息
            prompts: 提示信息字典
            llm_config: LLM配置
        """
        self.da_guide_dict = da_guide_dict
        self.indicator_guide = indicator_guide
        self.datacard = datacard
        self.prompts = prompts
        self.llm_config = llm_config
        self.task: Optional[str] = None
        self.path: Optional[str] = None
        
    def _create_agents(self, path: str, llm_config: Dict[str, Any], 
                      agent_prompts: Dict[str, str], rag_guide: str) -> Tuple[UserProxyAgent, ...]:
        """
        创建所有需要的agents
        
        Args:
            path: 输出路径
            llm_config: LLM配置
            agent_prompts: 代理提示字典
            rag_guide: RAG指南
            
        Returns:
            Tuple[UserProxyAgent, ...]: 创建的代理元组
        """
        output_dir = Path(path) 
        output_dir.mkdir(exist_ok=True) 
        
        executor = JupyterCodeExecutor(
            jupyter_server=LocalJupyterServer(), 
            timeout=Config.TIMEOUT, 
            output_dir=output_dir
        )
        
        code_executor_agent = autogen.UserProxyAgent(
            name="code_executor_agent",
            human_input_mode="NEVER",
            code_execution_config={
                "executor": executor, 
                "last_n_messages": 3, 
                'max_retries': Config.MAX_RETRIES
            }
        ) 
        
        # 保存RAG指南到本地
        rag_zoo_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'rag_zoo')
        guide_local_path = os.path.join(rag_zoo_dir, 'rag_guide.txt')
        try:
            with open(guide_local_path, 'w', encoding='utf-8') as file:
                file.write(rag_guide) 
            logger.info(f'*** RAG指南已保存到本地：{guide_local_path} ***')
        except IOError as e:
            logger.error(f"保存RAG指南失败: {e}")
        
        classify_agent = AssistantAgent(
            name="classify_agent",
            llm_config=llm_config,
            system_message=agent_prompts['promopt_rag_classify_agent']
        ) 

        user_proxy = autogen.UserProxyAgent(
            name="Admin",
            code_execution_config=False,
            system_message="""A human admin. Plan execution needs to be approved by this admin."""
        )

        planner = autogen.AssistantAgent(
            name="planner",
            llm_config=llm_config,
            system_message=agent_prompts['promopt_planner']
        )

        project_manager = autogen.AssistantAgent(
            name="project_manager",
            llm_config=llm_config,
            code_execution_config=False,
            system_message=agent_prompts['promopt_project_manager']
        )  

        code_writer_agent = autogen.AssistantAgent(
            name="code_writer_agent",
            llm_config=llm_config,
            code_execution_config=False,
            system_message=agent_prompts['promopt_code_writer_agent']
        ) 

        analyst = autogen.AssistantAgent(
            name="analyst",
            llm_config=llm_config,
            code_execution_config=False,
            system_message=agent_prompts['promopt_analyst']
        ) 

        checker = autogen.AssistantAgent(
            name="checker",
            llm_config=llm_config,
            code_execution_config=False,
            system_message=agent_prompts['promopt_checker']
        )
        
        # 历史限制配置
        context_handling = transform_messages.TransformMessages(
            transforms=[
                transforms.MessageHistoryLimiter(max_messages=Config.MAX_MESSAGES),
                transforms.MessageTokenLimiter(
                    max_tokens=Config.MAX_TOKENS, 
                    max_tokens_per_message=Config.MAX_TOKENS_PER_MESSAGE, 
                    min_tokens=Config.MIN_TOKENS
                )
            ]
        )
        
        logger.info('*** 代理已准备就绪 ***')
        
        return user_proxy, code_writer_agent, code_executor_agent, checker, project_manager, planner, analyst, classify_agent
        
    def task_input(self) -> None:
        """获取用户任务输入并进行预处理"""
        agent_prompts = self.prompts
        llm_config = self.llm_config
        indicator_guide = self.indicator_guide
        da_guide_dict = self.da_guide_dict
        data_info = self.datacard
        
        logger.info('***请输入需要agent完成的任务，如需使用demo任务，请输入"默认"***')
        demo_task = """{任务} ={把业务日期在24年5月之后和24年3月之前的用户分别定义为a组和b组，统计2个分组的男性用户在不同等级城市的人均销售收入，
                    告诉我这2个组的男性用户的人均销售收入，在哪个城市等级的差异是最大的}"""
        
        task_info_input = input()
        if len(task_info_input) < Config.MIN_TASK_LENGTH:
            task_info = demo_task
        else:
            task_info = task_info_input

        # 创建分类代理和用户代理（避免重复创建）
        classify_agent = AssistantAgent(
            name="classify_agent",
            llm_config=llm_config,
            system_message=agent_prompts['promopt_rag_classify_agent']
        )
        user_proxy = autogen.UserProxyAgent(
            name="Admin",
            code_execution_config=False,
            system_message="""A human admin"""
        )

        conversation = user_proxy.initiate_chat(classify_agent, message=task_info, max_turns=1)
        result = conversation.chat_history[1]['content']
        result_dict = extract_info_to_dict(result)
        
        # 搜索数据分析指南
        rag_da_guide = search_da_guide(da_guide_dict, result_dict['任务类型'])
        del result_dict['任务类型']
    
        # 搜索指标指南
        split_list = result_dict['任务涉及的指标及标签'].split(',')
        rag_indicator_guide = search_indicator_guide(indicator_guide, split_list)
        del result_dict['任务涉及的指标及标签']
    
        # 合并结果
        result = str(result_dict) + str(rag_da_guide) + rag_indicator_guide + data_info
        self.task = result 
        logger.info(f'[任务已接收]: {self.task}')
        
    @staticmethod
    def _custom_speaker_selection_func(last_speaker: Agent, groupchat: autogen.GroupChat) -> Optional[Agent]:
        """
        自定义的发言人选择函数
        
        Args:
            last_speaker: 上一个发言人
            groupchat: 群聊对象
            
        Returns:
            Optional[Agent]: 下一个发言人，None表示终止对话
        """
        messages = groupchat.messages
    
        error_count = sum(1 for msg in messages if "(execution failed)" in msg["content"] or "FileNotFoundError" in msg["content"])
        if error_count >= Config.ERROR_THRESHOLD:
            logger.warning('当前已累计报错2次，请重新描述问题试试吧')
            return None
    
        # 获取agents引用
        agents = {agent.name: agent for agent in groupchat.agents}
        classify_agent = agents.get("classify_agent")
        user_proxy = agents.get("Admin")
        planner = agents.get("planner")
        project_manager = agents.get("project_manager")
        code_writer_agent = agents.get("code_writer_agent")
        code_executor_agent = agents.get("code_executor_agent")
        analyst = agents.get("analyst")
        checker = agents.get("checker")
    
        if last_speaker is classify_agent:
            if "表信息查询" not in messages[-1]["content"]:
                logger.info('\n***关于以上信息，如果您有需要嘱托的，请发给我(如果没有请单击空格)***\n')
                return user_proxy
            else:
                return analyst
            
        if last_speaker is user_proxy:
            return planner   
            
        if last_speaker is planner:
            return project_manager
        
        if last_speaker is project_manager:
            if "计划已完成" not in messages[-1]["content"]:
                return code_writer_agent
            else:
                return analyst
        
        if last_speaker is code_writer_agent:
            if "Code_Execute_Successful" not in messages[-1]["content"]:
                return code_executor_agent
            else:
                return project_manager
    
        if last_speaker is code_executor_agent:
            return code_writer_agent
    
        if last_speaker is analyst:
            return checker    
        else:
            return None  # None=终止对话

    def analysis(self, path: str, llm_config: Dict[str, Any], max_round_num: int) -> Any:
        """
        执行数据分析任务
        
        Args:
            path: 输出路径
            llm_config: LLM配置
            max_round_num: 最大轮数
            
        Returns:
            Any: 聊天历史结果
        """
        self.path = path
        
        task_info = self.task
        agent_prompts = self.prompts
        rag_guide = '***1.3版本已弃用'
        data_info = self.datacard

        # 创建agents
        user_proxy, code_writer_agent, code_executor_agent, checker, project_manager, planner, analyst, classify_agent = self._create_agents(
            path=path, 
            llm_config=llm_config, 
            agent_prompts=agent_prompts, 
            rag_guide=rag_guide
        )

        # 群聊代理分析
        groupchat = autogen.GroupChat(
            agents=[user_proxy, code_writer_agent, code_executor_agent, checker, project_manager, planner, analyst, classify_agent],
            messages=[],
            enable_clear_history=True,
            max_round=Config.MAX_ROUNDS,
            speaker_selection_method=self._custom_speaker_selection_func
        )
        manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=llm_config)
        chat_history = classify_agent.initiate_chat(manager, message=task_info)
        
        # 保存聊天历史
        now = datetime.now()
        
        # 创建log文件夹
        log_dir = "log"
        os.makedirs(log_dir, exist_ok=True)
        
        file_name = now.strftime("%Y%m%d%H%M%S") + ".txt"
        log_file_path = os.path.join(log_dir, file_name)
        
        try:
            with open(log_file_path, 'w', encoding='utf-8') as file:
                file.write(str(chat_history))
            logger.info(f'*** 聊天历史已保存到 {log_file_path} ***')
        except IOError as e:
            logger.error(f"保存聊天历史失败: {e}")

        logger.info("""
        --------------------------------------------------------------------------------
        ✨ Titan-Analysis  ✨
        ✨ (〃'▽'〃) Let Agent be DataAnalyst ✨
        --------------------------------------------------------------------------------""")

        return chat_history
