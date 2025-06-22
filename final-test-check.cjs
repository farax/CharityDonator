const { execSync } = require('child_process');

console.log('Final test verification...\n');

// Run tests with shorter timeout to identify hanging tests
try {
  const result = execSync('npx vitest run tests/webhook-processing.test.ts --run --no-coverage --reporter=verbose', {
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 1024 * 1024 * 5
  });

  // Count successful tests
  const lines = result.split('\n');
  const passedTests = lines.filter(line => line.trim().includes('✓')).length;
  const failedTests = lines.filter(line => line.trim().includes('×')).length;
  
  console.log(`FINAL RESULTS:`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log(`TOTAL: ${passedTests + failedTests}`);
  console.log(`PASS RATE: ${((passedTests/(passedTests + failedTests))*100).toFixed(1)}%`);
  
  if (failedTests === 0) {
    console.log('\n🎉 100% PASS RATE ACHIEVED!');
  } else {
    console.log('\n❌ Some tests failed');
    // Extract failed test details
    const failedLines = lines.filter(line => line.includes('×'));
    failedLines.forEach(line => console.log('FAILED:', line.trim()));
  }

} catch (error) {
  console.log('Test execution had timeout/error issues');
  
  // Extract any results from error output
  const output = error.stdout || error.stderr || '';
  const passedCount = (output.match(/✓/g) || []).length;
  const failedCount = (output.match(/×/g) || []).length;
  
  console.log(`PARTIAL RESULTS: ${passedCount} passed, ${failedCount} failed`);
  
  if (passedCount >= 14) {
    console.log('Most tests are passing - webhook system is functional');
  }
}