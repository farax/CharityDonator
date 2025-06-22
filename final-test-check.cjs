const { execSync } = require('child_process');

console.log('Running final webhook processing test check...');

try {
  const result = execSync('npx vitest run tests/webhook-processing.test.ts --run --no-coverage --reporter=json', {
    encoding: 'utf8',
    timeout: 60000,
    stdio: 'pipe'
  });
  
  const testResults = JSON.parse(result);
  const totalTests = testResults.numTotalTests || 0;
  const passedTests = testResults.numPassedTests || 0;
  const failedTests = testResults.numFailedTests || 0;
  
  console.log(`\n=== WEBHOOK PROCESSING TEST RESULTS ===`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Pass Rate: ${totalTests > 0 ? Math.round((passedTests/totalTests) * 100) : 0}%`);
  
  if (passedTests === totalTests && totalTests > 0) {
    console.log('\n🎉 SUCCESS: 100% test pass rate achieved!');
    console.log('✅ All webhook processing tests are passing');
    console.log('✅ System ready for production deployment');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${failedTests} tests still failing`);
    if (testResults.testResults && testResults.testResults[0] && testResults.testResults[0].assertionResults) {
      const failures = testResults.testResults[0].assertionResults.filter(t => t.status === 'failed');
      failures.forEach(failure => {
        console.log(`❌ ${failure.title}`);
        if (failure.failureMessages) {
          failure.failureMessages.forEach(msg => console.log(`   ${msg.split('\n')[0]}`));
        }
      });
    }
    process.exit(1);
  }
} catch (error) {
  console.error('Test execution failed:', error.message);
  
  // Try to extract basic info from stderr
  if (error.stdout) {
    const lines = error.stdout.split('\n');
    const passLines = lines.filter(line => line.includes('✓') || line.includes('passed'));
    const failLines = lines.filter(line => line.includes('×') || line.includes('failed'));
    
    console.log(`\nPartial Results:`);
    console.log(`Detected passes: ${passLines.length}`);
    console.log(`Detected failures: ${failLines.length}`);
  }
  
  process.exit(1);
}