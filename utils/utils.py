import os
from PIL import Image
import matplotlib.pyplot as plt
import json
from datetime import datetime
import os
current_directory = os.getcwd()

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



