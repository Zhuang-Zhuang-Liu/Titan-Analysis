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

# Knowledge Insert
def generate_guide():
    guide =  """【数据分析指南】
            对比分析={步骤：- 明确对比的维度和指标。- 选择合适的对比对象。- 进行数据对比
                    注意点：- 确保对比的基础具有一致性。- 选择有意义的对比维度。
                    易错点：- 忽略了重要的影响因素导致对比不准确。}
            分布分析={步骤： - 选择要分析的指标。- 确定分组区间或类别。- 统计各区间或类别的数据数量或比例。
                    注意点：- 分组要合理，能体现数据特点。- 考虑数据的分布形态。
                    易错点：- 分组不合理使分析结果失去意义。}
            统计分析={步骤：- 选择合适的统计方法。 - 进行数据处理和计算。- 解释统计结果。
                    注意点： - 了解各种统计方法的适用场景。- 数据的质量影响统计结果的可靠性。
                    易错点：- 错误运用统计方法得出错误结论。}   
            异动分析={示例任务：为什么23年1月的销售成本这么高 ，
                     示例步骤：①统计每个月的销售成本，
                              ②观察23年1月的销售成本与其他月份是否存在显著（大于10%）差异（如果不存在，则不需要进行后续分析）
                              ③观察23年之前的几个月的销售成本是否存在者变化趋势(比如持续上升或持续下降)
                              ④分析一下销售成本与用户特征（性别、年龄等）的相关性，看看是不是因为23年1月的用户分布与其他月份存在差异，导致了销售成本的异动
                    }
            表信息查询={注意点：不涉及统计、分析、计算的任务，统一归为这一类}
            """
    with open('data_analysis_guide.txt', 'w') as f:
        f.write(guide)


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


def data_info_put(show_data_info,data_path):  
    # sample_data_describe
    data_describe = """{表名：每日销售订单信息表
                        表主键：cust_id、biz_date
                        字段描述={
                            cust_id：数据类型为整数，数据格式为 6 位整数，业务含义是用户ID
                            cust_sex：数据类型为整数（0 或 1），数据格式为单个整数，业务含义表示客户性别，0代表女，1代表男
                            cust_age：数据类型为整数，数据格式为 18 到 80 之间的整数，业务含义是客户年龄
                            cust_revenue_type：数据类型为字符串，数据格式为 'A'、'B'、'C' 之一，代表客户类型，A代表高收入，B代表中收入，C代表低收入
                            cust_open_date：数据类型为字符串，数据格式为类似 '2023-MM-DD' 的日期格式，指开户日期
                            cust_city_type：数据类型为整数，数据格式为 1 到 5 之间的整数，业务含义是城市等级，1~5代表一线城市~五线城市
                            item_item_platform：数据类型为字符串，数据格式为 'platform1'、'platform2'、'platform3'之一，代表商品所属平台
                            item_type：数据类型为字符串，数据格式为 'type1'、'type2'、'type3'之一，代表商品类型
                            item_is_discounted：数据类型为布尔型，数据格式为 True 或 False，代表商品是否打折
                            item_price：数据类型为整数，数据格式为 50 到 500 之间的整数，代表商品价格
                            item_rating：数据类型为整数，数据格式为 1 到 5 之间的整数，代表商品评分
                            order_amt：数据类型为整数，数据格式为一个整数值，业务含义是订单金额
                            order_cost：数据类型为整数，数据格式为整数值，业务含义是订单成本
                            biz_date：数据类型为字符串，数据格式为 '2024-MM-DD'，表示业务日期}
                    }
    """

    # data_path
    # print('请输入需要分析的数据集地址，如需使用默认数据集，请输入“默认”')
    input_data_path = data_path
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
        print('[数据集已加载]')
    else:
        print('[默认数据集已加载]')
        data_path = '/kaggle/working/Agent_DA_dateset.csv'
        data_describe = data_describe

    # data_info
    data_info = """\n{数据格式示例}={\n""" + pd.read_csv(data_path).head(3).to_string() \
                    +  """}\n\n{数据地址}="""+ data_path \
                    +  """}\n\n{数据描述}="""+ data_describe 
    print(data_info)
    if show_data_info is True:
        print(data_info)
    print('***data_info ready***')
    
    return data_info
