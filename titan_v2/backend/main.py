from fastapi import FastAPI, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
import os
import asyncio
import shutil
import queue
import sys
import io
import json
import subprocess
from pathlib import Path
from dotenv import load_dotenv

# 创建FastAPI应用
app = FastAPI(title="Titan V Backend", version="1.0.0")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 工作区目录
WORKSPACE_DIR = Path(__file__).parent / "work_dataset"
WORKSPACE_DIR.mkdir(exist_ok=True)

# 提供静态文件服务
app.mount("/workspace", StaticFiles(directory=WORKSPACE_DIR), name="workspace")

# 数据模型
class ChatRequest(BaseModel):
    message: str
    filename: Optional[str] = None

class AgentMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[datetime] = None

class AgentState(BaseModel):
    name: str
    status: str
    memory: str

class AgentResponse(BaseModel):
    messages: List[AgentMessage]
    files: List[str]
    agentStates: List[AgentState]

class EnvConfig(BaseModel):
    DEEPSEEK_API_KEY: str
    MODEL_TYPE: str
    API_URL: str
    CAMEL_TASK: str



class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            
    async def send_message(self, message: str):
        """向所有连接的客户端发送消息"""
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"[WebSocket] 发送消息失败: {e}")
                self.disconnect(connection)

class CamelChatRunner:
    def __init__(self):
        self.camel_chat_path = Path(__file__).parent
        self.is_running = False
        self.current_process = None
        self.output_queue = queue.Queue()
        self.websocket_manager = WebSocketManager()
        
    def get_camel_agents(self) -> List[AgentState]:
        """获取Camel agents状态"""
        try:
            # 使用agent_manager获取最新状态，确保实时更新
            from utils.agent_manager import get_agent_states_for_backend
            
            agent_states = get_agent_states_for_backend()
            return [
                AgentState(
                    name=agent["name"],
                    status=agent["status"],
                    memory=agent["memory"]
                )
                for agent in agent_states
            ]
                
        except Exception as e:
            print(f"Error getting agent states: {e}")
            return []

    async def process_request(self, message: str, file_path: Optional[str] = None) -> AgentResponse:
        """处理聊天请求"""
        try:
            print(f"[INFO] 收到用户消息: {message}")
            
            # 检查是否是启动分析的消息
            if message.strip() == "开始分析":
                print("[INFO] 检测到'开始分析'指令，启动titan agent...")
                # 运行titan分析
                result = await self.run_camel_analysis()
            else:
                # 普通聊天消息
                print("[INFO] 处理普通聊天消息...")
                result = AgentResponse(
                    messages=[
                        AgentMessage(
                            role="agent",
                            content=f"收到您的消息: {message}。如需启动分析，请输入'开始分析'。",
                            timestamp=datetime.now()
                        )
                    ],
                    files=[],
                    agentStates=self.get_camel_agents()
                )
            
            return result
            
        except Exception as e:
            print(f"[ERROR] 处理请求时出错: {e}")
            
            # 返回错误响应
            return AgentResponse(
                messages=[
                    AgentMessage(
                        role="agent",
                        content=f"处理请求时出错: {str(e)}",
                        timestamp=datetime.now()
                    )
                ],
                files=[],
                agentStates=self.get_camel_agents()
            )

    async def run_camel_analysis(self) -> AgentResponse:
        """运行Camel分析"""
        try:
            print("[INFO] 开始运行Camel分析...")
            
            # 获取titan.py的路径
            titan_path = Path(__file__).parent / "titan.py"
            
            if not titan_path.exists():
                print(f"[ERROR] titan.py文件不存在: {titan_path}")
                raise FileNotFoundError(f"titan.py文件不存在: {titan_path}")
            
            print(f"[INFO] 启动titan agent: {titan_path}")
            
            # 设置环境变量
            env = os.environ.copy()
            env['PYTHONUNBUFFERED'] = '1'
            
            # 使用venv中的Python解释器
            venv_python = Path(__file__).parent.parent / "venv" / "bin" / "python"
            if not venv_python.exists():
                # 尝试Windows路径
                venv_python = Path(__file__).parent.parent / "venv" / "Scripts" / "python.exe"
            
            if not venv_python.exists():
                print(f"[WARNING] 虚拟环境Python解释器不存在: {venv_python}")
                print("[INFO] 使用系统Python解释器...")
                python_executable = sys.executable
            else:
                print(f"[INFO] 使用虚拟环境Python: {venv_python}")
                python_executable = str(venv_python)
            
            # 使用异步方式运行titan.py，实时读取输出
            async def run_titan_streaming():
                try:
                    process = await asyncio.create_subprocess_exec(
                        python_executable,
                        str(titan_path),
                        env=env,
                        cwd=str(Path(__file__).parent),
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )
                    
                    self.current_process = process
                    
                    # 实时读取stdout
                    while True:
                        line = await process.stdout.readline()
                        if not line:
                            break
                        
                        output_line = line.decode('utf-8').rstrip()
                        print(f"[TITAN OUTPUT] {output_line}")  # 在API中打印
                        
                        # 通过WebSocket发送给前端
                        await self.websocket_manager.send_message(output_line)
                    
                    # 实时读取stderr
                    while True:
                        line = await process.stderr.readline()
                        if not line:
                            break
                        
                        error_line = line.decode('utf-8').rstrip()
                        print(f"[TITAN ERROR] {error_line}")  # 在API中打印错误
                        await self.websocket_manager.send_message(f"[ERROR] {error_line}")
                    
                    await process.wait()
                    
                    if process.returncode == 0:
                        completion_msg = "[SYSTEM] Task Finished"
                        print(f"[INFO] {completion_msg}")
                        await self.websocket_manager.send_message(completion_msg)
                    else:
                        error_msg = f"[SYSTEM] titan agent运行失败，返回码: {process.returncode}"
                        print(f"[ERROR] {error_msg}")
                        await self.websocket_manager.send_message(error_msg)
                        
                except Exception as e:
                    error_msg = f"运行titan agent时出错: {e}"
                    print(f"[ERROR] {error_msg}")
                    await self.websocket_manager.send_message(error_msg)
                finally:
                    self.current_process = None
            
            # 启动后台任务
            asyncio.create_task(run_titan_streaming())
            
            # 立即返回响应，titan将在后台运行
            return AgentResponse(
                messages=[
                    AgentMessage(
                        role="agent",
                        content="[SYSTEM] Titan has started and is outputting in real-time...",
                        timestamp=datetime.now()
                    )
                ],
                files=[],
                agentStates=self.get_camel_agents()
            )
            
        except Exception as e:
            print(f"[ERROR] Camel分析失败: {e}")
            raise e


# 创建全局runner实例
runner = CamelChatRunner()

@app.post("/api/chat", response_model=AgentResponse)
async def chat_with_agent(request: ChatRequest):
    """与Agent聊天"""
    try:
        print(f"[API] 收到聊天请求: {request.message}")
        result = await runner.process_request(request.message, request.filename)
        
        return result
    except Exception as e:
        print(f"[ERROR] 聊天API错误: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/test_terminate")
async def test_terminate():
    """测试终止功能"""
    try:
        print("[API] 收到测试终止请求")
        print("[INFO] 正在执行终止操作")
        # 生成终止信号文件，使用与titan.py相同的绝对路径
        terminate_signal_file = os.path.join(os.path.dirname(__file__), 'terminate_signal.txt')
        with open(terminate_signal_file, 'w') as f:
            f.write('terminate')
        await asyncio.sleep(1)
        
        return {"message": "终止操作已完成"}
    except Exception as e:
        print(f"[ERROR] 终止操作失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """上传文件"""
    try:
        print(f"[API] 收到文件上传请求: {file.filename}")
        
        # 确保工作目录存在
        WORKSPACE_DIR.mkdir(exist_ok=True)
        
        # 保存文件
        file_path = WORKSPACE_DIR / file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        print(f"[SUCCESS] 文件已上传: {file_path}")
        
        return {"filename": file.filename, "status": "uploaded"}
    except Exception as e:
        print(f"[ERROR] 文件上传失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/files")
async def list_files():
    """列出工作目录中的文件"""
    try:
        print("[API] 收到文件列表请求")
        
        # 确保工作目录存在
        WORKSPACE_DIR.mkdir(exist_ok=True)
        
        files = []
        for file_path in WORKSPACE_DIR.glob("*"):
            if file_path.is_file():
                # 返回与前端期望一致的数据结构
                files.append({
                    "name": file_path.name,
                    "path": str(file_path.relative_to(WORKSPACE_DIR)),  # 相对路径
                    "type": "file",
                    "size": file_path.stat().st_size,
                    "modified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                    "lastModified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
                })
                
        print(f"[INFO] 找到 {len(files)} 个文件")
        return {"files": files}
    except Exception as e:
        print(f"[ERROR] 获取文件列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/files/list")
async def list_files_in_directory(path: str = "/"):
    """列出指定目录中的文件"""
    try:
        print(f"[API] 收到目录文件列表请求: {path}")
        
        # 解码URL编码的路径
        import urllib.parse
        decoded_path = urllib.parse.unquote(path)
        
        # 获取项目根目录
        project_root = Path(__file__).parent.parent
        
        # 构建完整路径
        target_path = project_root / decoded_path.lstrip("/")
        
        # 安全检查：确保路径在项目根目录内
        try:
            target_path.resolve().relative_to(project_root.resolve())
        except ValueError:
            print(f"[ERROR] 尝试访问项目根目录外的路径: {decoded_path}")
            raise HTTPException(status_code=403, detail="Access denied")
        
        if not target_path.exists():
            print(f"[ERROR] 目录不存在: {decoded_path}")
            raise HTTPException(status_code=404, detail="Directory not found")
            
        if not target_path.is_dir():
            print(f"[ERROR] 路径不是目录: {decoded_path}")
            raise HTTPException(status_code=400, detail="Path is not a directory")
        
        files = []
        try:
            for file_path in target_path.iterdir():
                if file_path.is_file():
                    files.append(file_path.name)
        except Exception as e:
            print(f"[WARNING] 读取目录内容失败: {e}")
            files = []
                
        print(f"[INFO] 目录 {decoded_path} 中找到 {len(files)} 个文件")
        return {"files": files}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] 获取目录文件列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/file/{filename:path}")
async def get_file_content(filename: str):
    """获取文件内容"""
    try:
        print(f"[API] 收到文件内容请求: {filename}")
        
        # 解码URL编码的文件名
        import urllib.parse
        decoded_filename = urllib.parse.unquote(filename)
        
        # 检查是否是绝对路径（从前端传来的相对路径）
        project_root = Path(__file__).parent.parent
        
        if decoded_filename.startswith("/"):
            # 绝对路径，相对于项目根目录
            file_path = project_root / decoded_filename.lstrip("/")
        else:
            # 相对路径，相对于工作目录（向后兼容）
            file_path = WORKSPACE_DIR / decoded_filename
        
        # 安全检查：确保文件路径在项目根目录内
        try:
            file_path.resolve().relative_to(project_root.resolve())
        except ValueError:
            print(f"[ERROR] 尝试访问项目根目录外的文件: {filename}")
            raise HTTPException(status_code=403, detail="Access denied")
        
        if not file_path.exists():
            print(f"[ERROR] 文件不存在: {filename}")
            raise HTTPException(status_code=404, detail="File not found")
            
        # 尝试以UTF-8读取，如果失败则尝试其他编码
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except UnicodeDecodeError:
            # 如果UTF-8失败，尝试其他编码
            try:
                with open(file_path, "r", encoding="gbk") as f:
                    content = f.read()
            except UnicodeDecodeError:
                with open(file_path, "r", encoding="latin-1") as f:
                    content = f.read()
            
        print(f"[SUCCESS] 文件内容已读取: {filename}")
        return {
            "filename": filename, 
            "content": content,
            "size": file_path.stat().st_size,
            "lastModified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] 读取文件失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/files/{filename:path}")
async def delete_file(filename: str):
    """删除文件"""
    try:
        print(f"[API] 收到文件删除请求: {filename}")
        
        # 解码URL编码的文件名
        import urllib.parse
        decoded_filename = urllib.parse.unquote(filename)
        
        file_path = WORKSPACE_DIR / decoded_filename
        
        # 安全检查：确保文件路径在工作目录内
        try:
            file_path.resolve().relative_to(WORKSPACE_DIR.resolve())
        except ValueError:
            print(f"[ERROR] 尝试删除工作目录外的文件: {filename}")
            raise HTTPException(status_code=403, detail="Access denied")
        
        if not file_path.exists():
            print(f"[ERROR] 文件不存在: {filename}")
            raise HTTPException(status_code=404, detail="File not found")
            
        file_path.unlink()
        print(f"[SUCCESS] 文件已删除: {filename}")
        
        return {"message": f"File {filename} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] 删除文件失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/file/{filename:path}")
async def update_file_content(filename: str, request: dict):
    """更新文件内容"""
    try:
        print(f"[API] 收到文件更新请求: {filename}")
        
        # 解码URL编码的文件名
        import urllib.parse
        decoded_filename = urllib.parse.unquote(filename)
        
        # 获取项目根目录
        project_root = Path(__file__).parent.parent
        
        if decoded_filename.startswith("/"):
            # 绝对路径，相对于项目根目录
            file_path = project_root / decoded_filename.lstrip("/")
        else:
            # 相对路径，相对于工作目录
            file_path = WORKSPACE_DIR / decoded_filename
        
        # 安全检查：确保文件路径在项目根目录内
        try:
            file_path.resolve().relative_to(project_root.resolve())
        except ValueError:
            print(f"[ERROR] 尝试访问项目根目录外的文件: {filename}")
            raise HTTPException(status_code=403, detail="Access denied")
        
        # 获取请求内容
        if "content" not in request:
            raise HTTPException(status_code=400, detail="缺少content字段")
        
        content = request["content"]
        
        # 确保目录存在
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 写入文件
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"[SUCCESS] 文件内容已更新: {filename}")
        return {
            "message": f"文件 {filename} 已更新",
            "filename": filename,
            "size": file_path.stat().st_size,
            "lastModified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] 更新文件失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/agent-states")
async def get_agent_states():
    """获取Agent状态"""
    try:
        print("[API] 收到Agent状态请求")
        states = runner.get_camel_agents()
        print(f"[INFO] 返回 {len(states)} 个Agent状态, 状态列表: {str(states)[:10]}")
        return {"agentStates": states}
    except Exception as e:
        print(f"[ERROR] 获取Agent状态失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/titan-output")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket端点，用于实时接收titan.py的输出"""
    await runner.websocket_manager.connect(websocket)
    try:
        while True:
            # 保持连接活跃
            await websocket.receive_text()
    except WebSocketDisconnect:
        runner.websocket_manager.disconnect(websocket)



@app.get("/")
async def root():
    """根路径"""
    return {"message": "Titan V Backend API"}



# .env文件管理工具函数
def read_env_file() -> Dict[str, str]:
    """读取.env文件内容"""
    env_path = Path(__file__).parent / ".env"
    config = {}
    
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    config[key.strip()] = value.strip()
    
    # 确保包含必要的配置项
    return {
        'DEEPSEEK_API_KEY': config.get('DEEPSEEK_API_KEY', ''),
        'MODEL_TYPE': config.get('MODEL_TYPE', 'deepseek-chat'),
        'API_URL': config.get('API_URL', 'https://api.deepseek.com/v1'),
        'CAMEL_TASK': config.get('CAMEL_TASK', '')
    }

def update_env_file(config: Dict[str, str]) -> bool:
    """更新.env文件内容"""
    env_path = Path(__file__).parent / ".env"
    
    try:
        # 读取现有内容，保留注释
        lines = []
        if env_path.exists():
            with open(env_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
        
        # 更新配置
        new_lines = []
        updated_keys = set()
        
        for line in lines:
            line = line.rstrip()
            if line and not line.startswith('#') and '=' in line:
                key = line.split('=', 1)[0].strip()
                if key in config:
                    new_lines.append(f"{key}={config[key]}")
                    updated_keys.add(key)
                else:
                    new_lines.append(line)
            else:
                new_lines.append(line)
        
        # 添加新配置项
        for key, value in config.items():
            if key not in updated_keys:
                new_lines.append(f"{key}={value}")
        
        # 写入文件
        with open(env_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(new_lines))
            f.write('\n')
        
        return True
    except Exception as e:
        print(f"[ERROR] 更新.env文件失败: {e}")
        return False

@app.get("/api/env")
async def get_env_config():
    """获取.env配置"""
    try:
        config = read_env_file()
        return {"config": config}
    except Exception as e:
        print(f"[ERROR] 获取.env配置失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/env")
async def update_env_config(config: EnvConfig):
    """更新.env配置"""
    try:
        config_dict = config.dict()
        if update_env_file(config_dict):
            # 重新加载环境变量
            load_dotenv(Path(__file__).parent / ".env", override=True)
            return {"message": "配置已更新", "config": config_dict}
        else:
            raise HTTPException(status_code=500, detail="更新配置文件失败")
    except Exception as e:
        print(f"[ERROR] 更新.env配置失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# prompts.json管理API
@app.get("/api/prompts")
async def get_prompts_config():
    """获取prompts.json配置"""
    try:
        prompts_path = Path(__file__).parent / "prompts.json"
        
        if not prompts_path.exists():
            raise HTTPException(status_code=404, detail="prompts.json文件不存在")
            
        with open(prompts_path, 'r', encoding='utf-8') as f:
            prompts_data = json.load(f)
            
        return {"prompts": prompts_data}
    except Exception as e:
        print(f"[ERROR] 获取prompts.json配置失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/prompts")
async def update_prompts_config(request: dict):
    """更新prompts.json配置"""
    try:
        prompts_path = Path(__file__).parent / "prompts.json"
        
        # 验证数据格式
        if "prompts" not in request:
            raise HTTPException(status_code=400, detail="请求格式错误")
            
        prompts_data = request["prompts"]
        
        # 备份原文件
        if prompts_path.exists():
            backup_path = prompts_path.with_suffix('.json.backup')
            shutil.copy2(prompts_path, backup_path)
            
        # 写入新配置
        with open(prompts_path, 'w', encoding='utf-8') as f:
            json.dump(prompts_data, f, ensure_ascii=False, indent=2)
            
        return {"message": "prompts配置已更新", "prompts": prompts_data}
    except Exception as e:
        print(f"[ERROR] 更新prompts.json配置失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 启动FastAPI服务器
if __name__ == "__main__":
    import uvicorn
    import sys
    
    # 从命令行参数获取端口，默认为8000
    port = 8000
    if len(sys.argv) > 1 and sys.argv[1] == "--port" and len(sys.argv) > 2:
        try:
            port = int(sys.argv[2])
        except ValueError:
            port = 8000
    
    print("🚀 启动Titan V后端服务器...")
    print(f"📡 访问 http://localhost:{port} 查看API文档")
    uvicorn.run(app, host="0.0.0.0", port=port)