#!/bin/bash

echo "🚀 启动Titan V Python后端服务"
echo "================================"

# 设置项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="$PROJECT_ROOT/venv"

# 检查虚拟环境是否存在
if [ ! -d "$VENV_DIR" ]; then
    echo "❌ 虚拟环境不存在，请先创建：python3 -m venv venv"
    exit 1
fi

# 激活虚拟环境
echo "🔧 激活虚拟环境..."
source "$VENV_DIR/bin/activate"

# 检查Python环境
echo "📍 使用Python: $(which python3)"

# 安装依赖
#echo "📦 安装依赖..."
#pip3 install -r requirements.txt



# 启动后端服务
echo "🎯 启动后端服务..."
echo "访问 http://localhost:8000 查看API文档"
echo "前端项目请访问 http://localhost:3000"
python3 main.py