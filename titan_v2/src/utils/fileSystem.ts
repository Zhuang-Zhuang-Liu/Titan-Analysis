// 文件系统工具
// 使用后端 API 来获取真实的文件系统信息

export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified?: Date;
}

// API 基础 URL
const API_BASE_URL = 'http://localhost:8000';

// ==================== File Explorer 后端服务开始 ====================

// 从后端 API 获取文件列表 - File Explorer用来获取文件树数据
export const scanWorkspaceFiles = async (): Promise<FileInfo[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/files`);
    if (!response.ok) {
      throw new Error(`Failed to fetch files: ${response.statusText}`);
    }
    const data = await response.json();
    
    // 处理后端返回的文件数据
    const files = (data.files || []).map((file: any) => ({
      name: file.name,
      path: file.path || file.name, // 使用相对路径或文件名
      type: file.type || 'file',
      size: file.size,
      lastModified: file.lastModified || file.modified ? new Date(file.lastModified || file.modified) : new Date()
    }));
    
    return files;
  } catch (error) {
    console.error('Error fetching files:', error);
    // 如果 API 不可用，返回空数组
    return [];
  }
};

export const getFilePaths = async (): Promise<string[]> => {
  const files = await scanWorkspaceFiles();
  return files.map(file => file.path);
};

// 用于实时更新的函数
export const watchWorkspaceChanges = (callback: (files: FileInfo[]) => void) => {
  // 立即执行一次
  scanWorkspaceFiles().then(callback);
  
  // 设置定时器
  const interval = setInterval(async () => {
    try {
      const files = await scanWorkspaceFiles();
      callback(files);
    } catch (error) {
      console.error('Error watching workspace changes:', error);
    }
  }, 3000); // 每3秒检查一次

  return () => clearInterval(interval);
};

// 获取文件内容
export interface FileContent {
  content: string;
  size: number;
  lastModified: Date;
  extension: string;
}

export const getFileContent = async (filePath: string): Promise<FileContent> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/file/${encodeURIComponent(filePath)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    const data = await response.json();
    
    // 获取文件扩展名
    const extension = filePath.split('.').pop() || '';
    
    return {
      content: data.content,
      size: data.size || 0,
      lastModified: data.lastModified ? new Date(data.lastModified) : new Date(),
      extension: extension.toLowerCase()
    };
  } catch (error) {
    console.error('Error fetching file content:', error);
    throw error;
  }
};

// 删除文件
export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/files/${encodeURIComponent(filePath)}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `Failed to delete file: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

// 列出指定目录的文件
export const listFiles = async (directoryPath: string): Promise<string[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/files/list?path=${encodeURIComponent(directoryPath)}`);
    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.statusText}`);
    }
    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Error listing files:', error);
    // 如果 API 不可用，使用本地文件列表
    return [];
  }
};

// 读取文件内容
export const readFile = async (filePath: string): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/file/${encodeURIComponent(filePath)}`);
    if (!response.ok) {
      throw new Error(`Failed to read file: ${response.statusText}`);
    }
    const data = await response.json();
    return data.content || '';
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
};

// 写入文件内容
export const writeFile = async (filePath: string, content: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/file/${encodeURIComponent(filePath)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: content
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to write file: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error writing file:', error);
    throw error;
  }
};

// ==================== File Explorer 后端服务结束 ====================