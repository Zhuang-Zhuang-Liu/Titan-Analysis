> # <span style="color:darkblue; font-size:30px; font-weight:bold; font-style:italic;">Titan-Analysis</span>
> 
> ## <span style="color:darkblue; font-size:24px; font-weight:bold; font-style:italic;">(〃’▽’〃) Let Agent be DataAnalyst</span>
> #### Version: V.1.1 
> #### Git: https://github.com/Zhuang-Zhuang-Liu/Titan-Analysis/tree/main
> #### Power_By: DeepSeek-Chat-V2 & AutoGen
> #### Author: Zhuang-Zhuang-Liu
> #### Update_Date: 20240623

## 
**Description**：
This is an intelligent Agent project for data analysis, aiming to help users process and understand data more efficiently and accurately.
 
**Installation and Running**：
1. Environmental Requirements
    - Python Version: 3.8 and above
    - Dependent Libraries: pandas, numpy, matplotlib, etc. They can be installed by the following command:
        ```
        pip install -r requirements.txt
        ```
2. Clone the Project
        ```
        git clone https://github.com/Zhuang-Zhuang-Liu/Titan-Analysis.git
        ```
3. Running
    - Enter the project directory

**Project Structure**：
```
your_project/
├── dataset/
│   ├── sample_data.csv
│   └──...
├── agent_zoo/
│   ├── GroupChat.py
│   ├── agent_prompt.json
│   └──...
├── rag_zoo/
│   └──learn_by_case
│   └──learn_by_Knowledge
│   ├──data_analysis_guide.txt
├── utils/
│   ├── utils.py
├── requirements.txt
├── README.md
└── main.py
```

**Demo**：
```python
# llm api
api_zz_deep,url_deep,model_deep = 'sk-xx','https://api.deepseek.com/v1',"deepseek-chat"
llm_config_deep = {"config_list": [{ "model": model_deep,"base_url": url_deep,"api_key": api_zz_deep,"temperature": 0,"cache_seed":None  }] }  

# guide rag
guide_path = current_directory +'/Titan-Analysis/rag_zoo/data_analysis_guide.txt'

# agent prompt
prompt_path = current_directory+'/Titan-Analysis/agent_zoo/agent_prompts.json'
with open(prompt_path, "r") as file: agent_prompts = json.load(file)

# folder path
path="coding"
folder_clean(path)

# load data and task
task_info,data_info = titan_load()

# analysis
titan_analysis(path=path,llm_config = llm_config_deep, loaded_data=agent_prompts, 
               guide_path=guide_path,task_info=task_info,data_info=data_info)
```

**Contribution Guide**:
If you wish to contribute to this project, please follow the following steps:
1. Fork this repository
2. Create a new branch for your modifications
3. Submit your changes and create a Pull Request
4. We will review and merge your contribution
   
**Copyright and License**
This project follows the MIT License Agreement

**Contact Information**:
If you have any questions or suggestions, please contact us via the following methods:
Email: [your_email@example.com]
