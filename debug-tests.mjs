import { spawn } from 'child_process';

const testProcess = spawn('npx', ['vitest', 'run', 'tests/webhook-processing.test.ts', '--run', '--no-coverage', '--reporter=verbose'], {
  stdio: 'pipe',
  timeout: 60000
});

let output = '';
let testCount = 0;
let passCount = 0;
let failCount = 0;

testProcess.stdout.on('data', (data) => {
  const chunk = data.toString();
  output += chunk;
  
  if (chunk.includes('✓')) {
    passCount++;
    console.log(`PASS ${passCount}: ${chunk.split('✓')[1]?.trim()?.split('\n')[0]}`);
  }
  
  if (chunk.includes('×')) {
    failCount++;
    console.log(`FAIL ${failCount}: ${chunk.split('×')[1]?.trim()?.split('\n')[0]}`);
  }
});

testProcess.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

testProcess.on('close', (code) => {
  console.log(`\nTest Summary:`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total: ${passCount + failCount}`);
  console.log(`Exit code: ${code}`);
  
  if (failCount > 0) {
    console.log('\nLooking for error details...');
    const lines = output.split('\n');
    const errorLines = lines.filter(line => 
      line.includes('Error') || 
      line.includes('FAIL') || 
      line.includes('AssertionError') ||
      line.includes('Expected') ||
      line.includes('Received')
    );
    errorLines.slice(0, 10).forEach(line => console.log('ERROR:', line.trim()));
  }
});

setTimeout(() => {
  testProcess.kill();
  console.log('\nTimeout reached');
  console.log(`Partial results - Passed: ${passCount}, Failed: ${failCount}`);
}, 45000);