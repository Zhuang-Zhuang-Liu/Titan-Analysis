import subprocess
import os
import json
from pathlib import Path
from datetime import datetime
import locale

def get_installed_packages():
    """获取当前Python环境已安装的包列表"""
    try:
        result = subprocess.run(['pip', 'list'], capture_output=True, text=True)
        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')[2:]  # 跳过标题行
            packages = []
            for line in lines:
                if line.strip():
                    parts = line.split()
                    if len(parts) >= 2:
                        packages.append(parts[0])
            return packages
        else:
            return ["无法获取包列表"]
    except Exception as e:
        return [f"获取包列表时出错: {str(e)}"]


def get_dataset_info(path):
    """获取dataset文件夹的文件信息"""
    if path is None:
        path = os.path.join(os.path.dirname(__file__), '..', 'work_dataset')
    dataset_path = Path(path).resolve()  # 使用resolve()获取规范化的绝对路径
    if not dataset_path.exists():
        return "> 目标文件夹不存在"
    
    files_info = []
    for file_path in dataset_path.iterdir():
        if file_path.is_file():
            file_size = file_path.stat().st_size
            # 统一使用MB单位
            size_str = f"{file_size/(1024*1024):.2f} MB"
            
            # 计算相对于dataset目录的相对路径
            try:
                relative_path = file_path.relative_to(dataset_path)
            except ValueError:
                # 如果无法计算相对路径，使用文件名
                relative_path = file_path.name
            
            files_info.append({
                "大小": size_str,
                "相对路径": str(relative_path)
            })
    
    return files_info


def get_current_datetime_info():
    """获取当前日期时间信息"""
    try:
        # 获取当前日期时间
        now = datetime.now()
        
        # 设置中文地区显示（如果系统支持）
        try:
            locale.setlocale(locale.LC_TIME, 'zh_CN.UTF-8')
        except:
            try:
                locale.setlocale(locale.LC_TIME, 'en_US.UTF-8')
            except:
                pass  # 使用默认地区设置
        
        # 格式化日期时间
        date_str = now.strftime("%Y年%m月%d日")  # 中文格式
        time_str = now.strftime("%H:%M:%S")
        weekday = now.strftime("%A")
        
        # 获取地区信息（简化处理，可以根据需要扩展）
        # 这里使用系统环境变量或默认值
        country = os.environ.get('COUNTRY', '中国')  # 默认中国，可通过环境变量设置
        
        return {
            'date': date_str,
            'time': time_str,
            'weekday': weekday,
            'country': country,
            'datetime': now
        }
    except Exception as e:
        # 如果出错，返回默认信息
        return {
            'date': "未知日期",
            'time': "未知时间", 
            'weekday': "未知星期",
            'country': "未知地区",
            'datetime': datetime.now()
        }


def create_status_bar(packages=None):
    """创建状态栏信息
    Args:
        packages: 可选的包列表。如果为None，则自动获取已安装的包；如果提供列表，则使用指定的包列表
    """
    if packages is None:
        packages = get_installed_packages()
    elif not isinstance(packages, list):
        packages = [str(packages)]
    
    # 获取日期时间信息
    datetime_info = get_current_datetime_info()
    
    dataset_info = get_dataset_info(None)
    
    # 格式化包列表显示 - 完整显示所有包，不限制每行数量
    packages_display = []
    if packages:
        # 显示所有包，每行最多显示15个包以提高可读性
        for i in range(0, len(packages), 15):
            row_packages = packages[i:i+15]
            packages_display.append(', '.join(row_packages))
    while len(packages_display) < 1:
        packages_display.append('')

    packages_section = ""
    for i in range(len(packages_display)):
        packages_section += f"  {packages_display[i]}\n"
    
    # 获取规范化的work_dataset路径用于显示
    dataset_display_path = Path(os.path.join(os.path.dirname(__file__), '..', 'work_dataset')).resolve()
    
    status_bar = f"""                             
================================================================================
� 状态栏丨时间信息丨{datetime_info['date']} {datetime_info['weekday']} {datetime_info['time']} | 地区: {datetime_info['country']}
================================================================================
�📦 状态栏丨Python环境丨Installed Python Packages                                                          
--------------------------------------------------------------------------------
{packages_section.rstrip()}
================================================================================
📁 状态栏丨文件夹目录丨{dataset_display_path} 
--------------------------------------------------------------------------------
"""
    
    if isinstance(dataset_info, list):
        if not dataset_info:
            status_bar += "  📁 文件夹为空\n"
        else:
            for file_info in dataset_info:
                size = file_info['大小']
                relative_path = file_info['相对路径']
                status_bar += f"  📄 {size:<10} | {relative_path}\n"
    else:
        status_bar += f"  {dataset_info}\n"
    
    status_bar += """================================================================================
"""
    
    return status_bar

if __name__ == "__main__":
    print("=== 自动获取包列表 ===")
    print(create_status_bar())
    
    print("\n=== 手动指定包列表 ===")
    manual_packages = ["numpy", "pandas", "matplotlib", "scikit-learn", "tensorflow", "torch"]
    print(create_status_bar(packages=manual_packages))
