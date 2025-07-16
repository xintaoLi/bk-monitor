// ====================
// scripts/regression-record.js
// ====================

const { AutomatedRegressionTestSystem } = require('../regression-system/vue_regression_system');
const config = require('../regression.config');

async function recordMockData() {
  console.log('📹 开始录制Mock数据...');

  try {
    const system = new AutomatedRegressionTestSystem(config);

    // 1. 启动开发服务器
    // const { spawn } = require('child_process');
    // const server = spawn('npm', ['run', 'serve'], {
    //   stdio: 'inherit',
    //   detached: true,
    // });

    // 等待服务器启动
    // await waitForServer(config.project.url);
    console.log('✅ 开发服务器已启动');

    // 2. 录制Mock数据
    const mockData = await system.mockGenerator.startRecording(config.project.url);

    // 3. 保存Mock数据
    const fs = require('fs');
    fs.writeFileSync(`${config.mock.outputPath}/mock-data.json`, JSON.stringify(mockData, null, 2));

    console.log(`✅ Mock数据录制完成，共${Object.keys(mockData).length}个API`);

    // 4. 关闭服务器
    // process.kill(-server.pid);
  } catch (error) {
    console.error('❌ Mock数据录制失败:', error.message);
    process.exit(1);
  }
}

async function waitForServer(url, timeout = 60000) {
  const http = require('http');
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, res => {
        resolve();
      });

      req.on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error('服务器启动超时'));
        } else {
          setTimeout(check, 1000);
        }
      });
    };

    check();
  });
}

if (require.main === module) {
  recordMockData().catch(console.error);
}
