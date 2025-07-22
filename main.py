import sys
import os
import argparse

sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from agent_zoo.GroupChat import Titan, load_data_and_prompts


def main():
    parser = argparse.ArgumentParser(description='Titan-Analysis-V1.4')
    parser.add_argument('--api-key', type=str, help='API')
    parser.add_argument('--output-path', type=str, default='agent_space/v1.4', help='output path')
    parser.add_argument('--max-rounds', type=int, default=3, help='max rounds')
    
    args = parser.parse_args()
    
    current_directory = os.path.abspath(os.path.dirname(__file__))
    
    # LLM config
    api_key = args.api_key 
    llm_config = {
        "config_list": [{
            "model": "deepseek-chat",
            "base_url": 'https://api.deepseek.com/v1',
            "api_key": api_key
        }]
    }
    
    # load data and prompts
    prompts, data_info, da_guide_dict, indicator_guide = load_data_and_prompts(
        dataset_card_path=os.path.join(current_directory, 'dataset'),
        agent_prompts_path=os.path.join(current_directory, 'agent_zoo', 'agent_prompts.json'),
        da_guide_path=os.path.join(current_directory, 'rag_zoo', 'data_analysis_guide_dict.json'),
        indicator_guide_path=os.path.join(current_directory, 'rag_zoo', 'indicator_guide11.json')
    )
    
    # ensure output directory exists
    os.makedirs(args.output_path, exist_ok=True)
    
    # create analyzer and run
    analyzer = Titan(
        da_guide_dict=da_guide_dict,
        indicator_guide=indicator_guide,
        datacard=data_info,
        prompts=prompts,
        llm_config=llm_config
    )
    
    analyzer.task_input()
    analyzer.analysis(path=args.output_path, llm_config=llm_config, max_round_num=args.max_rounds)


if __name__ == "__main__":
    main() 