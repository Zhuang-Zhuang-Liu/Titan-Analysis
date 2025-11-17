const { spawn, execSync } = require('child_process');
const path = require('path');

console.log('🚀 启动 Titan V 开发环境...');
console.log('================================');

// 清理端口占用的函数
function cleanupPort(port) {
  try {
    const pids = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim();
    if (pids) {
      pids.split('\n').forEach(pid => {
        if (pid) {
          try {
            process.kill(parseInt(pid), 'SIGKILL');
            console.log(`✅ 已清理端口 ${port} 的进程 ${pid}`);
          } catch (e) {
            console.log(`⚠️  无法终止进程 ${pid}: ${e.message}`);
          }
        }
      });
    }
  } catch (e) {
    // 端口未被占用，忽略错误
  }
}

// 清理3000、3001、8000和8001端口
cleanupPort(3000);
cleanupPort(3001);
cleanupPort(8000);
cleanupPort(8001);

// 等待端口清理完成
setTimeout(() => {
  console.log('🎨 立即启动 React 前端 (端口3000)...');
  const frontendProcess = spawn('npm', ['run', 'start:only'], {
    cwd: __dirname,
    stdio: 'inherit'
  });

  // 前端启动后立即启动后端服务
  setTimeout(() => {
    console.log('🎯 启动 Python 后端服务 (端口8000)...');
    const backendProcess = spawn('bash', ['./start_backend.sh'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: 'inherit'
    });

    // 后端启动后启动server.js
    setTimeout(() => {
      console.log('📡 启动 Node.js 服务器 (端口3001)...');
      const serverProcess = spawn('node', ['server.js'], {
        cwd: __dirname,
        stdio: 'inherit'
      });

      // 监听进程退出
      backendProcess.on('exit', (code) => {
        console.log(`Python 后端退出，代码: ${code}`);
        process.exit(code);
      });

      serverProcess.on('exit', (code) => {
        console.log(`Node.js 服务器退出，代码: ${code}`);
        process.exit(code);
      });

      // 优雅关闭
      process.on('SIGINT', () => {
        console.log('🛑 正在关闭所有服务...');
        backendProcess.kill('SIGTERM');
        serverProcess.kill('SIGTERM');
        frontendProcess.kill('SIGTERM');
        setTimeout(() => {
          process.exit(0);
        }, 2000);
      });

    }, 3000);
  }, 1000);

  console.log('✅ 开发环境启动完成！');
  console.log('📱 前端: http://localhost:3000');
  console.log('🔧 API服务器: http://localhost:3001');
  console.log('🎯 后端: http://localhost:8000');
}, 1000);