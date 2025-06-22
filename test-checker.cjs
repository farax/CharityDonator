const { spawn } = require('child_process');

console.log('Testing webhook processing with optimized timeout handling...');

const testProcess = spawn('npx', [
  'vitest', 
  'run', 
  'tests/webhook-processing.test.ts',
  '--run',
  '--no-coverage',
  '--reporter=basic',
  '--testTimeout=10000'
], {
  stdio: 'pipe',
  timeout: 45000
});

let testOutput = '';
let passCount = 0;
let failCount = 0;

testProcess.stdout.on('data', (data) => {
  const output = data.toString();
  testOutput += output;
  
  // Count passes and failures
  const passMatches = output.match(/✓/g);
  const failMatches = output.match(/×/g);
  
  if (passMatches) passCount += passMatches.length;
  if (failMatches) failCount += failMatches.length;
  
  // Show progress
  if (passMatches || failMatches) {
    console.log(`Current: ${passCount} passed, ${failCount} failed`);
  }
});

testProcess.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

testProcess.on('close', (code) => {
  console.log(`\n=== FINAL RESULTS ===`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total: ${passCount + failCount}`);
  console.log(`Pass Rate: ${passCount + failCount > 0 ? Math.round((passCount/(passCount + failCount)) * 100) : 0}%`);
  
  if (passCount === 17 && failCount === 0) {
    console.log('\n🎉 SUCCESS: 100% pass rate achieved!');
    console.log('All 17 webhook processing tests are passing');
    console.log('System ready for production deployment');
  } else if (passCount >= 15) {
    console.log(`\n⚠️ Close to target: ${passCount}/17 tests passing`);
    console.log('Analyzing remaining failures...');
    
    // Look for specific error patterns
    const errorLines = testOutput.split('\n').filter(line => 
      line.includes('Error') || 
      line.includes('failed') || 
      line.includes('timeout') ||
      line.includes('Expected')
    );
    
    if (errorLines.length > 0) {
      console.log('\nError details:');
      errorLines.slice(0, 5).forEach(line => console.log(`  ${line.trim()}`));
    }
  } else {
    console.log(`\n❌ More work needed: Only ${passCount}/17 tests passing`);
  }
  
  console.log(`Exit code: ${code}`);
});

// Kill process after timeout
setTimeout(() => {
  testProcess.kill();
  console.log('\nTimeout reached - Process killed');
  console.log(`Partial results: ${passCount} passed, ${failCount} failed`);
}, 40000);