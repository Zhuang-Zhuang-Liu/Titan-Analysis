import os
from PIL import Image
import matplotlib.pyplot as plt

# utils
def show_images_in_directory(directory):
    directory = os.path.join(directory, '') if not directory.endswith('/') else directory  # 确保传入的路径字符串以斜杠结尾
    for filename in os.listdir(directory):  # 遍历目录下的所有文件
        if filename.endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')): # 检查文件是否为图片
            img_path = os.path.join(directory, filename)
            img = Image.open(img_path)
            plt.figure(figsize=(5, 7))  # 可选：设置图像显示窗口的大小
            plt.imshow(img)
            plt.axis('off')  # 不显示坐标轴
            plt.title(filename)  # 显示图片文件名作为标题
            plt.show()
            
               
def folder_clean(folder_path):
    if os.path.isdir(folder_path):
        for file in os.listdir(folder_path):
            file_path = os.path.join(folder_path, file)
            if os.path.isfile(file_path):
                os.remove(file_path)
        print('***folder clean ready***')
    else:     
        print('***folder not exist***')


import numpy as np 
import pandas as pd
import random
import datetime

## io data
def generate_random_data():
    user_id = [random.randint(100000, 999999) for _ in range(200)]
    sex = [random.choice([0, 1]) for _ in range(200)]
    age = [random.randint(18, 80) for _ in range(200)]
    city_type = [random.randint(1, 5) for _ in range(200)]  # 添加城市类型
    cust_type = [random.choice(['A', 'B', 'C']) for _ in range(200)]
    open_date = [datetime.datetime(2023, 1, 1) + datetime.timedelta(days=random.randint(0, 360)) for _ in range(200)]
    cust_amt = [a * random.randint(1, 5) * 200 for a in age]
    for i in range(200):
        if cust_type[i] == 'A':
            cust_amt[i] *= 1.2
    cost_sales = [random.randint(city_type[i] * 100, city_type[i] * 200) for i in range(200)]  # 与城市类型成正相关
    biz_date = [datetime.datetime(2024, 1, 1) + datetime.timedelta(days=random.randint(0, 180)) for _ in range(200)]
    # 新增 5 列商品属性
    item_platform = [random.choice(['platform1', 'platform2', 'platform3']) for _ in range(200)]
    item_type = [random.choice(['type1', 'type2', 'type3']) for _ in range(200)]
    is_discounted = [random.choice([True, False]) for _ in range(200)]
    item_price = [random.randint(50, 500) for _ in range(200)]
    item_rating = [random.randint(1, 5) for _ in range(200)]
    # 创建 DataFrame 并修改列名
    data = pd.DataFrame({'cust_id': user_id, 'cust_sex': sex, 'cust_age': age, 'cust_revenue_type': cust_type,
                         'cust_open_date': open_date, 'cust_city_type': city_type,
                         'item_item_platform': item_platform, 'item_type': item_type, 
                         'item_is_discounted': is_discounted, 'item_price': item_price, 'item_rating': item_rating,
                          'order_amt': cust_amt, 'order_cost': cost_sales,
                          'biz_date': [d.strftime("%Y-%m-%d") for d in biz_date],
                        })
    data.to_csv('/kaggle/working/Agent_DA_dateset.csv', index=False)
    return data



def data_info_put(dataset_card_path = "/kaggle/working/Titan-Analysis/dataset/demo_dataset_card.json",show_data_info=False):    
    # read demo dataset card
    with open(dataset_card_path, 'r') as file:
        dataset_card = json.load(file)

    # input
    print('请输入需要分析的数据集地址，如需使用默认数据集，请输入“默认”')
    input_data_path = input()
    if len(input_data_path) >= 20:
        data_path = input_data_path
        print("""请输入数据集的数据描述,格式为
              {表名={xx表},
               表主键={cust_id,biz_date}
               字段描述={AA：数据类型为XX，数据格式为XX，业务含义是XX,
                        BB：数据类型为XX，数据格式为XX，业务含义是XX,
                        ...}
               }""")
        data_describe = input()
    else:
        data_describe = dataset_card['data_describe']
        data_path = dataset_card['data_path']

    # data_info
    data_info = """\n{数据格式示例}={\n""" + pd.read_csv(data_path).head(3).to_string() \
                    +  """}\n\n{数据地址}="""+ data_path \
                    +  """}\n\n{数据描述}="""+ data_describe 
    
    if len(pd.read_csv(data_path).head(3).to_string()) < 20:
        print("Warning: Current data reading may be incorrect")
    if show_data_info is True:
        print(data_info)
    
    return data_info

import json
from datetime import datetime
import os
current_directory = os.getcwd()

import json
import os

def manage_guide_json(guide_zoo_path, action, guide_name='demo_da_guide', show_guide=False):
    """
    Manage user data guide records within a JSON structure by adding, removing, getting, or showing records.
    """
    # load
    with open(guide_zoo_path, 'r', encoding='utf-8') as file:
        json_data = json.load(file)
    # get
    if action == "get":
        if  guide_name in json_data:
                file_path_name = os.path.join(os.getcwd(),'Titan-Analysis/virtual_desktop/da_guide.txt')
                with open(file_path_name, 'w', encoding='utf-8') as file:
                    file.write(json_data[guide_name])
                print(f"Text has been saved to {file_path_name}")
                
                if show_guide:
                    print('***** Guide loaded *****\n', record["data_guide"], '\n*********************')
                return file_path_name
        else:
            print("Record not found.")
