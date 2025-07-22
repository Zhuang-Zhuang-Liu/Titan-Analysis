
## 🤖 Intro
 
> ## <span style="color:darkblue; font-size:30px; font-weight:bold; font-style:italic;">Titan-Analysis</span>
> #### <span style="color:darkblue; font-size:20px; font-weight:bold; font-style:italic;">(〃’▽’〃) Let Agent be DataAnalyst</span>
> #### <a href="https://github.com/Zhuang-Zhuang-Liu/Titan-Analysis">🔗 Version 1.3</a>
> #### 📚 https://github.com/Zhuang-Zhuang-Liu/Titan-Analysis
> #### 🤝 DeepSeek-Chat-V2 & AutoGen
> #### 📢 Zhuang-Zhuang-Liu

## 🚀 Quick Start

### Method 1: Command Line Usage
```bash
# Clone the project
git clone https://github.com/Zhuang-Zhuang-Liu/Titan-Analysis.git
cd Titan-Analysis

# Install dependencies
pip install -r requirements.txt

# Run analysis (API key required)
python main.py --api-key "your-api-key" --output-path "output" --max-rounds 5
```

### Method 2: Python Code Usage
```python
import sys
import os

# Add project path
current_directory = os.getcwd()
sys.path.append(current_directory + '/Titan-Analysis')

from agent_zoo.GroupChat import Titan, agent_create, show_chat_history, load_data_and_prompts

# Configure LLM
llm_config = {
    "config_list": [{
        "model": "deepseek-chat",
        "base_url": 'https://api.deepseek.com/v1',
        "api_key": "your-api-key",
        "temperature": 1.0
    }]
}

# Load data and prompts
prompts, data_info, da_guide_dict, indicator_guide = load_data_and_prompts(
    dataset_card_path=current_directory + '/Titan-Analysis/dataset/',
    agent_prompts_path=current_directory + '/Titan-Analysis/agent_zoo/agent_prompts.json',
    da_guide_path=current_directory + '/Titan-Analysis/rag_zoo/data_analysis_guide_dict.json',
    indicator_guide_path=current_directory + '/Titan-Analysis/rag_zoo/indicator_guide11.json'
)

# Create analyzer and run
analyzer = Titan(
    da_guide_dict=da_guide_dict,
    indicator_guide=indicator_guide,
    datacard=data_info,
    prompts=prompts,
    llm_config=llm_config
)

analyzer.task_input()
analyzer.analysis(path='test', llm_config=llm_config, max_round_num=27)
```

  
## ✨ Work Flow
<h1 align="left">
<img src="https://github.com/Zhuang-Zhuang-Liu/Titan-Analysis/blob/main/picture/WorkFlow_CN_2408.png" width="800" alt="WorkFlow_CN_2408">
</h1>


## 🥪 Demo Case
<h1 align="left">
<img src="https://github.com/Zhuang-Zhuang-Liu/Titan-Analysis/blob/main/picture/demo_work_flow.gif" width="800" alt="WorkFlow_CN_2408">
</h1>


## 🔐 Copyright and License
> #### This project follows the MIT License Agreement
