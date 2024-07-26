> # <span style="color:darkblue; font-size:30px; font-weight:bold; font-style:italic;">Titan-Analysis</span>
> 
> ## <span style="color:darkblue; font-size:24px; font-weight:bold; font-style:italic;">(〃’▽’〃) Let Agent be DataAnalyst</span>
> #### Version: V.1.2
> #### Git: https://github.com/Zhuang-Zhuang-Liu/Titan-Analysis/tree/main
> #### Power_By: DeepSeek-Chat-V2 & AutoGen
> #### Author: Zhuang-Zhuang-Liu
> #### Update_Date: 20240623


**Demo**：
```python

# git clone
import shutil,sys,os
current_directory = os.getcwd()
!git clone https://github.com/Zhuang-Zhuang-Liu/Titan-Analysis.git
sys.path.append( current_directory +'/Titan-Analysis') 
from agent_zoo.GroupChat import Titan,agent_create,show_chat_history,load_data_and_prompts

# llm api
llm_config_deep = {"config_list": [{ "model": "deepseek-chat","base_url": 'https://api.deepseek.com/v1',"api_key": "sk-xx","temperature": 1.0 }] }

# load_data_and_prompts
prompts,data_info,guide= load_data_and_prompts(dataset_card_path = current_directory +'/Titan-Analysis/dataset/demo_dataset_card.json',
                                         agent_prompts_path = '/kaggle/working/Titan-Analysis/agent_zoo/agent_prompts.json',
                                         guide_path = current_directory +'/Titan-Analysis/rag_zoo/data_analysis_guide.json')

# analysis
ana = Titan(guide = guide,datacard=data_info,prompts=prompts )
ana.task_input()
result = ana.analysis(path='coding',llm_config=llm_config_deep,max_round_num =27)
```

   
**Copyright and License**
This project follows the MIT License Agreement

