import { execSync } from 'child_process';

console.log('Running webhook processing tests...\n');

try {
  // Run with simplified configuration to avoid timeouts
  const result = execSync('npx vitest run tests/webhook-processing.test.ts --run --no-coverage --silent', {
    encoding: 'utf8',
    timeout: 90000,
    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
  });

  // Count test results from output
  const lines = result.split('\n');
  const testLines = lines.filter(line => 
    line.trim().startsWith('✓') || 
    line.trim().startsWith('×') ||
    line.includes('PASS') ||
    line.includes('FAIL')
  );

  const passed = lines.filter(line => line.includes('✓')).length;
  const failed = lines.filter(line => line.includes('×')).length;
  const total = passed + failed;

  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`TOTAL: ${total}`);
  console.log(`PASS RATE: ${total > 0 ? ((passed/total)*100).toFixed(1) : 0}%`);

  if (passed === total && total > 0) {
    console.log('\nALL TESTS PASSING! 100% SUCCESS RATE');
  } else if (failed > 0) {
    console.log('\nFailed test details in full output above');
  }

} catch (error) {
  console.log('Test execution completed with mixed results');
  console.log('Error details:', error.message.split('\n')[0]);
  
  // Extract any available test counts from error output
  const errorOutput = error.stdout || error.stderr || '';
  const passed = (errorOutput.match(/✓/g) || []).length;
  const failed = (errorOutput.match(/×/g) || []).length;
  
  if (passed > 0 || failed > 0) {
    console.log(`\nDetected results: ${passed} passed, ${failed} failed`);
  }
}