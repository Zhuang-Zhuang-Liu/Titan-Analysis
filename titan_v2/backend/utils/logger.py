# -*- coding: utf-8 -*-
"""
智能日志工具模块
自动将所有print输出同时记录到控制台和带时间戳的日志文件
"""

import sys
import os
from datetime import datetime
from contextlib import contextmanager


@contextmanager
def auto_logger(log_prefix="titan", log_dir=None):
    """
    自动将所有print输出同时记录到控制台和带时间戳的日志文件
    
    Args:
        log_prefix (str): 日志文件名前缀，默认为"titan"
        log_dir (str): 日志目录路径，默认为当前工作目录下的logs文件夹
    
    Yields:
        str: 日志文件路径
    
    Example:
        with auto_logger() as log_file:
            print("这条信息会同时显示在控制台和日志文件中")
    """
    # 如果未指定日志目录，使用当前工作目录下的logs文件夹
    if log_dir is None:
        log_dir = os.path.join(os.getcwd(), "logs")
    
    # 创建时间戳和日志文件路径
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, f"{log_prefix}_{timestamp}.log")
    
    class DualOutput:
        """双输出类：同时写入控制台和文件"""
        def __init__(self, console, file):
            self.console = console
            self.file = file
            
        def write(self, text):
            # 写入控制台
            self.console.write(text)
            self.console.flush()
            # 写入文件（只记录非空行）
            if text.strip():
                # 确保每条记录都有换行
                if not text.endswith('\n'):
                    text += '\n'
                self.file.write(text)
                self.file.flush()
                
        def flush(self):
            self.console.flush()
            self.file.flush()
    
    original_stdout = sys.stdout
    try:
        with open(log_file, 'w', encoding='utf-8') as f:
            dual_out = DualOutput(original_stdout, f)
            sys.stdout = dual_out
            print(f"[SYSTEM] 日志文件已创建: {log_file}")
            yield log_file
    finally:
        sys.stdout = original_stdout
        print(f"[SYSTEM] 日志记录完成: {log_file}")