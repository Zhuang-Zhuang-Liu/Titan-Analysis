> # <span style="color:darkblue; font-size:30px; font-weight:bold; font-style:italic;">Titan-Analysis</span>
> 
> ## <span style="color:darkblue; font-size:24px; font-weight:bold; font-style:italic;">(〃’▽’〃) Let Agent be DataAnalyst</span>
> #### Version: V.1.1 
> #### Git: https://github.com/Zhuang-Zhuang-Liu/Titan-Analysis/tree/main
> #### Power_By: DeepSeek-Chat-V2 & AutoGen
> #### Author: Zhuang-Zhuang-Liu
> #### Update_Date: 20240623


**Demo**：
```python
# llm api
api_zz_deep,url_deep,model_deep = 'sk-xx','https://api.deepseek.com/v1',"deepseek-chat"
llm_config_deep = {"config_list": [{ "model": model_deep,"base_url": url_deep,"api_key": api_zz_deep,"temperature": 1.0 ,"cache_seed":1  }] }  


# load guide to desktop for rag
manage_guide_json(guide_zoo_path=current_directory +'/Titan-Analysis/rag_zoo/data_analysis_guide.json',
                  action='get', guide_name='demo_da_guide', show_guide=False)


# load agent prompt
prompt_path = current_directory+'/Titan-Analysis/agent_zoo/agent_prompts.json'
with open(prompt_path, "r") as file: agent_prompts = json.load(file)


# load data and task
dataset_card_path = current_directory +'/Titan-Analysis/dataset/demo_dataset_card.json'
data_info = data_info_put(dataset_card_path = dataset_card_path,show_data_info=False)
task_info = task_load()


# analysis
titan_analysis(path="coding",
               llm_config = llm_config_deep,
               agent_prompts = agent_prompts,
               guide_path = current_directory + '/Titan-Analysis/virtual_desktop/da_guide.txt', # str
               task_info = task_info, 
               data_info = data_info,
               max_round_num = 27
              )
```

   
**Copyright and License**
This project follows the MIT License Agreement

