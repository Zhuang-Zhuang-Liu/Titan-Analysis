const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { spawn, exec } = require('child_process');

const app = express();
const PORT = 3001;

let backendProcess = null;

app.use(cors());
app.use(express.json());



// 启动后端服务的 API
app.post('/api/start-backend', (req, res) => {
  if (backendProcess) {
    return res.json({ success: true, message: 'Backend is already running' });
  }

  try {
    console.log('🔄 Checking and killing processes on port 8001...');
    
    // 先检查并kill占用端口的进程
    exec('lsof -ti:8001', (error, stdout, stderr) => {
      if (stdout.trim()) {
        const pids = stdout.trim().split('\n');
        console.log(`Found processes on port 8001: ${pids.join(', ')}`);
        
        // 杀掉所有占用端口的进程
        pids.forEach(pid => {
          try {
            process.kill(parseInt(pid), 'SIGTERM');
            console.log(`Killed process ${pid}`);
          } catch (killError) {
            console.error(`Failed to kill process ${pid}:`, killError);
          }
        });
        
        // 等待进程完全退出
        setTimeout(() => {
          startBackend(res);
        }, 1000);
      } else {
        console.log('Port 8000 is free, starting backend...');
        startBackend(res);
      }
    });

  } catch (error) {
    console.error('Error checking/killing port processes:', error);
    startBackend(res); // 如果检查端口失败，继续启动
  }
});

function startBackend(res) {
  try {
    console.log('🚀 Starting Python backend...');
    
    // 使用当前目录的虚拟环境Python
    const venvPython = path.join(__dirname, 'venv', 'bin', 'python3');
    const fallbackPython = 'python3';
    
    // 检查虚拟环境是否存在
    const pythonExecutable = fs.existsSync(venvPython) ? venvPython : fallbackPython;
    const pythonDir = path.dirname(pythonExecutable);
    
    console.log(`Using Python: ${pythonExecutable}`);
    
    backendProcess = spawn(pythonExecutable, ['main.py'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: 'inherit',
      env: { 
        ...process.env, 
        PYTHONPATH: path.join(__dirname, 'backend'),
        PATH: `${pythonDir}:${process.env.PATH}`
      }
    });

    backendProcess.on('error', (error) => {
      console.error('Failed to start backend:', error);
      backendProcess = null;
    });

    backendProcess.on('exit', (code) => {
      console.log(`Backend process exited with code ${code}`);
      backendProcess = null;
    });

    // 等待一小段时间确保进程启动
    setTimeout(() => {
      res.json({ success: true, message: 'Backend started successfully' });
    }, 1000);

  } catch (error) {
    console.error('Error starting backend:', error);
    res.status(500).json({ error: 'Failed to start backend' });
  }
}

// 停止后端服务的 API
app.post('/api/stop-backend', (req, res) => {
  if (!backendProcess) {
    return res.json({ success: true, message: 'Backend is not running' });
  }

  try {
    console.log('🛑 Stopping Python backend...');
    
    // 优雅地终止进程
    backendProcess.kill('SIGTERM');
    
    // 如果进程在5秒内没有退出，强制终止
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        backendProcess.kill('SIGKILL');
      }
      backendProcess = null;
    }, 5000);

    res.json({ success: true, message: 'Backend stopped successfully' });
  } catch (error) {
    console.error('Error stopping backend:', error);
    res.status(500).json({ error: 'Failed to stop backend' });
  }
});

// 检查后端状态的 API
app.get('/api/backend-status', (req, res) => {
  res.json({ running: !!backendProcess });
});

// 获取Python环境信息的 API
app.get('/api/python-env', (req, res) => {
  try {
    // 使用当前目录的虚拟环境
    const venvPython = path.join(__dirname, 'venv', 'bin', 'python3');
    const fallbackPython = 'python3';
    
    // 首先尝试使用虚拟环境的Python
    const pythonExecutable = fs.existsSync(venvPython) ? venvPython : fallbackPython;
    
    exec(`${pythonExecutable} -c "import sys; print(sys.executable); print(sys.version.split()[0])"`, (error, stdout, stderr) => {
      if (error) {
        console.error('Error getting Python environment:', error);
        // 尝试使用which python3作为备选
        exec('which python3', (whichError, whichStdout) => {
          if (!whichError && whichStdout.trim()) {
            exec(`${whichStdout.trim()} -c "import sys; print(sys.executable); print(sys.version.split()[0])"`, (fallbackError, fallbackStdout) => {
              if (!fallbackError) {
                const lines = fallbackStdout.trim().split('\n');
                const pythonPath = lines[0] || '未知';
                const pythonVersion = lines[1] || '未知';
                
                // 提取环境名称
                const pathParts = pythonPath.split('/');
                let envName = 'system';
                
                // 检查是否在虚拟环境中
                if (pythonPath.includes('venv') || pythonPath.includes('.venv')) {
                  envName = 'venv';
                } else {
                  // 寻找conda环境
                  const envsIndex = pathParts.findIndex(part => part === 'envs');
                  if (envsIndex !== -1 && envsIndex + 1 < pathParts.length) {
                    envName = pathParts[envsIndex + 1];
                  }
                }
                
                res.json({ 
                  pythonPath, 
                  pythonVersion,
                  envName
                });
              } else {
                res.json({ 
                  pythonPath: '未知', 
                  pythonVersion: '未知',
                  envName: '未知'
                });
              }
            });
          } else {
            res.json({ 
              pythonPath: '未知', 
              pythonVersion: '未知',
              envName: '未知'
            });
          }
        });
        return;
      }
      
      const lines = stdout.trim().split('\n');
      const pythonPath = lines[0] || '未知';
      const pythonVersion = lines[1] || '未知';
      
      // 提取环境名称
      const pathParts = pythonPath.split('/');
      let envName = 'system';
      
      // 检查是否在虚拟环境中
      if (pythonPath.includes('venv') || pythonPath.includes('.venv')) {
        envName = 'venv';
      } else {
        // 寻找conda环境
        const envsIndex = pathParts.findIndex(part => part === 'envs');
        if (envsIndex !== -1 && envsIndex + 1 < pathParts.length) {
          envName = pathParts[envsIndex + 1];
        }
      }
      
      res.json({ 
        pythonPath, 
        pythonVersion,
        envName
      });
    });
  } catch (error) {
    console.error('Error getting Python environment:', error);
    res.json({ 
      pythonPath: '未知', 
      pythonVersion: '未知',
      envName: '未知'
    });
  }
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'file-system-api' });
});

app.listen(PORT, () => {
  console.log(`File system API server running on port ${PORT}`);
});