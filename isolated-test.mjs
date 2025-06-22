import { spawn } from 'child_process';

// Run only the failing error handling tests
const testProcess = spawn('npx', [
  'vitest', 
  'run', 
  'tests/webhook-processing.test.ts',
  '--run',
  '--no-coverage',
  '--reporter=verbose',
  '--testNamePattern=Error Handling and Resilience'
], {
  stdio: 'pipe',
  timeout: 30000
});

let output = '';
let passCount = 0;
let failCount = 0;

testProcess.stdout.on('data', (data) => {
  const chunk = data.toString();
  output += chunk;
  console.log(chunk);
  
  if (chunk.includes('✓')) {
    passCount++;
  }
  
  if (chunk.includes('×')) {
    failCount++;
  }
});

testProcess.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

testProcess.on('close', (code) => {
  console.log(`\nIsolated Test Results:`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Exit code: ${code}`);
});

setTimeout(() => {
  testProcess.kill();
  console.log('\nTimeout - killing process');
}, 25000);