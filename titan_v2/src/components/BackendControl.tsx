import React, { useState, useEffect } from 'react';

interface BackendControlProps {
  className?: string;
}

const BackendControl: React.FC<BackendControlProps> = ({ className }) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [pythonEnv, setPythonEnv] = useState<{ envName: string; pythonVersion: string }>({ envName: '未知', pythonVersion: '未知' });

  // 检查后端状态
  const checkBackendStatus = async () => {
    try {
      // 尝试访问后端API端点
      await fetch('http://localhost:8000/api/files', {
        method: 'GET',
        mode: 'no-cors'
      });
      // 对于no-cors模式，只要请求不抛出网络错误就视为成功
      setIsRunning(true);
    } catch (error) {
      setIsRunning(false);
    }
  };

  // 获取Python环境信息
  const getPythonEnvironment = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/python-env');
      const data = await response.json();
      setPythonEnv({
        envName: data.envName || '未知',
        pythonVersion: data.pythonVersion || '未知'
      });
    } catch (error) {
      setPythonEnv({ envName: '未知', pythonVersion: '未知' });
    }
  };

  // 定期检查后端状态
  useEffect(() => {
    checkBackendStatus();
    getPythonEnvironment();
    const interval = setInterval(() => {
      checkBackendStatus();
      getPythonEnvironment();
    }, 5000);
    return () => clearInterval(interval);
  }, []);



  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-3 bg-black text-white dark:bg-white dark:text-black rounded-lg px-4 py-1.5 h-7 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-white dark:text-black leading-none">
               Python: {pythonEnv.envName} ({pythonEnv.pythonVersion})
             </span>
        </div>
        
        <div className="w-px h-3 bg-white/30 dark:bg-black/30" />
        
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full transition-colors ${
            isRunning ? 'bg-green-400 animate-pulse' : 'bg-red-400'
          }`} />
        </div>
        

      </div>
    </div>
  );
};

export default BackendControl;