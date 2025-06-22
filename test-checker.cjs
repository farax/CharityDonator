const { spawn } = require('child_process');

console.log('Running focused test analysis...\n');

const testProcess = spawn('npx', ['vitest', 'run', 'tests/webhook-processing.test.ts', '--run', '--no-coverage', '--reporter=verbose'], {
  cwd: process.cwd(),
  stdio: 'pipe',
  timeout: 45000
});

let output = '';
let hasResults = false;

testProcess.stdout.on('data', (data) => {
  const chunk = data.toString();
  output += chunk;
  
  // Look for test results in real-time
  if (chunk.includes('✓') || chunk.includes('×')) {
    hasResults = true;
    console.log(chunk.trim());
  }
  
  // Look for summary information
  if (chunk.includes('Test Files') || chunk.includes('Tests') || chunk.includes('passed') || chunk.includes('failed')) {
    console.log('SUMMARY:', chunk.trim());
  }
});

testProcess.stderr.on('data', (data) => {
  const chunk = data.toString();
  if (chunk.includes('Error') || chunk.includes('FAIL')) {
    console.log('ERROR:', chunk.trim());
  }
});

testProcess.on('close', (code) => {
  console.log('\nTest process completed with code:', code);
  
  // Count results from output
  const lines = output.split('\n');
  const passedCount = lines.filter(line => line.includes('✓')).length;
  const failedCount = lines.filter(line => line.includes('×')).length;
  
  console.log(`\nFinal Count: ${passedCount} passed, ${failedCount} failed`);
  
  if (passedCount > 0 && failedCount === 0) {
    console.log('SUCCESS: All tests are passing!');
  } else if (failedCount > 0) {
    console.log('ISSUES: Some tests are failing');
    
    // Extract failed test names
    const failedTests = lines.filter(line => line.includes('×')).slice(0, 5);
    failedTests.forEach(test => console.log('FAILED:', test.trim()));
  }
});

// Kill process after timeout
setTimeout(() => {
  if (!testProcess.killed) {
    testProcess.kill();
    if (hasResults) {
      console.log('\nPartial results obtained before timeout');
    } else {
      console.log('\nNo results obtained - tests may be hanging');
    }
  }
}, 45000);