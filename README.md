
## 🤖 Intro
 
> ## <span style="color:darkblue; font-size:30px; font-weight:bold; font-style:italic;">Titan-Analysis</span>
> #### <span style="color:darkblue; font-size:20px; font-weight:bold; font-style:italic;">(〃’▽’〃) Let Agent be DataAnalyst</span>
> #### <a href="https://github.com/Zhuang-Zhuang-Liu/Titan-Analysis">🔗 Version 1.2</a>
> #### 📚 https://github.com/Zhuang-Zhuang-Liu/Titan-Analysis
> #### 🤝 DeepSeek-Chat-V2 & AutoGen
> #### 📢 Zhuang-Zhuang-Liu
 
   
## 🚀 Getting Started
```python
import shutil,sys,os
current_directory = os.getcwd()
!git clone https://github.com/Zhuang-Zhuang-Liu/Titan-Analysis.git
sys.path.append( current_directory +'/Titan-Analysis') 

from agent_zoo.GroupChat import Titan,agent_create,show_chat_history,load_data_and_prompts
llm_config_deep = {"config_list": [{ "model": "deepseek-chat","base_url": 'https://api.deepseek.com/v1',"api_key": "sk-xx","temperature": 1.0 }] }

prompts,data_info,guide= load_data_and_prompts(dataset_card_path = current_directory +'/Titan-Analysis/dataset/demo_dataset_card.json',
                                         agent_prompts_path = '/kaggle/working/Titan-Analysis/agent_zoo/agent_prompts.json',
                                         guide_path = current_directory +'/Titan-Analysis/rag_zoo/data_analysis_guide.json')

ana = Titan(guide = guide,datacard=data_info,prompts=prompts )
ana.task_input()
result = ana.analysis(path,llm_config=llm_config_deep,max_round_num)
```
   
## 🔐 Copyright and License
> #### This project follows the MIT License Agreement
