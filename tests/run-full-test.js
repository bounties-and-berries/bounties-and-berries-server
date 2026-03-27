const { exec, spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Server and Running Comprehensive API Test');
console.log('=' .repeat(60));

// Start the server
const serverProcess = spawn('node', ['server.js'], {
  cwd: process.cwd(),
  stdio: 'pipe'
});

let serverReady = false;

serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('📊 Server:', output.trim());
  
  if (output.includes('Server is running')) {
    serverReady = true;
    console.log('\n✅ Server is ready! Starting API tests...\n');
    
    // Wait a moment for server to fully initialize
    setTimeout(() => {
      // Run the comprehensive test
      const testProcess = spawn('node', ['comprehensive-api-test.js'], {
        cwd: process.cwd(),
        stdio: 'inherit'
      });
      
      testProcess.on('close', (code) => {
        console.log(`\n🏁 Test completed with code: ${code}`);
        console.log('\n🔧 Shutting down server...');
        serverProcess.kill('SIGTERM');
        process.exit(code);
      });
      
      testProcess.on('error', (error) => {
        console.error('❌ Test error:', error);
        serverProcess.kill('SIGTERM');
        process.exit(1);
      });
      
    }, 2000);
  }
});

serverProcess.stderr.on('data', (data) => {
  console.error('❌ Server Error:', data.toString().trim());
});

serverProcess.on('close', (code) => {
  console.log(`\n📊 Server process exited with code: ${code}`);
  if (!serverReady) {
    console.log('❌ Server failed to start properly');
    process.exit(1);
  }
});

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Received interrupt signal');
  serverProcess.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received terminate signal');
  serverProcess.kill('SIGTERM');
  process.exit(0);
});