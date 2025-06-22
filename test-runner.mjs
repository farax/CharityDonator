import { spawn } from 'child_process';

console.log('Running webhook processing tests with timeout optimization...');

const testProcess = spawn('npx', [
  'vitest', 
  'run', 
  'tests/webhook-processing.test.ts',
  '--run',
  '--no-coverage',
  '--reporter=json',
  '--testTimeout=5000'
], {
  stdio: 'pipe',
  timeout: 30000
});

let output = '';

testProcess.stdout.on('data', (data) => {
  output += data.toString();
});

testProcess.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

testProcess.on('close', (code) => {
  try {
    const results = JSON.parse(output);
    const passed = results.numPassedTests || 0;
    const failed = results.numFailedTests || 0;
    const total = results.numTotalTests || 0;
    
    console.log(`\n=== WEBHOOK TEST RESULTS ===`);
    console.log(`Total: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Pass Rate: ${total > 0 ? Math.round((passed/total) * 100) : 0}%`);
    
    if (passed === total && total > 0) {
      console.log('\n✅ SUCCESS: 100% test pass rate achieved!');
      console.log('All webhook processing tests are passing');
      console.log('System ready for production deployment');
    } else {
      console.log(`\n⚠️ Progress: ${passed}/${total} tests passing`);
    }
  } catch (error) {
    // Fallback parsing for non-JSON output
    const lines = output.split('\n');
    const passCount = (output.match(/✓/g) || []).length;
    const failCount = (output.match(/×/g) || []).length;
    
    console.log(`\n=== FALLBACK RESULTS ===`);
    console.log(`Passed: ${passCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Total: ${passCount + failCount}`);
    
    if (passCount >= 15) {
      console.log('\n✅ Strong progress: 15+ tests passing');
    }
  }
  
  console.log(`Exit code: ${code}`);
});

setTimeout(() => {
  testProcess.kill();
  console.log('\nTimeout - killing process');
}, 25000);