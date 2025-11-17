export interface AgentMessage {
  role: "user" | "agent";
  content: string;
  timestamp?: Date | string;
}

export interface AgentState {
  name: string;
  status: "idle" | "thinking" | "speaking" | "working" | "waiting";
  memory: string;
}

export interface AgentResponse {
  messages: AgentMessage[];
  files: string[];
  agentStates: AgentState[];
  workbenchOutput: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// 上传文件到工作区
export async function uploadFile(file: File): Promise<{ filename: string; path: string; size: number }> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`文件上传失败: ${response.statusText}`);
  }
  
  return response.json();
}

// 发送消息给Agent（包含文件上传）
export async function sendAgentMessage(input: string, file?: File): Promise<AgentResponse> {
  let filename = undefined;
  
  // 如果有文件，先上传
  if (file) {
    const uploadResult = await uploadFile(file);
    filename = uploadResult.filename;
  }
  
  // 发送消息到聊天接口
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: input,
      filename: filename,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`请求失败: ${response.statusText}`);
  }
  
  return response.json();
}

// 终止当前分析
export async function terminateAnalysis(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/terminate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`终止分析失败: ${response.statusText}`);
  }
}

// 获取实时agent状态
export async function getAgentStates(): Promise<AgentState[]> {
  const response = await fetch(`${API_BASE_URL}/api/agent-states`);
  
  if (!response.ok) {
    throw new Error(`获取agent状态失败: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.agentStates;
}



// 保留mock函数用于测试
export async function mockAgentResponse(input: string, file?: File): Promise<AgentResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        messages: [
          { role: "agent", content: "Hello, I'm the data analysis agent. I've received your request.", timestamp: new Date() },
          { role: "agent", content: "Generating data cleaning code for you...", timestamp: new Date() }
        ],
        files: ["/workspace/data_cleaned.csv", "/workspace/clean_code.py"],
        agentStates: [
          { name: "清洗Agent", status: "working" as const, memory: "用户上传了名为xx.csv的文件，我计划进行缺失值填充和异常值检测" },
          { name: "可视化Agent", status: "idle" as const, memory: "暂无任务" }
        ],
        workbenchOutput: `\`\`\`python\nimport pandas as pd\n\n# 读取数据\ndf = pd.read_csv('data.csv')\n\n# 数据清洗\ndf = df.dropna()\ndf = df[df['value'] > 0]\n\n# 保存清洗后的数据\ndf.to_csv('data_cleaned.csv')\n\n\`\`\`\n执行成功，结果已保存至 data_cleaned.csv`
      });
    }, 1000);
  });
}