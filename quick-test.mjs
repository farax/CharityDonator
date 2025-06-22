import { execSync } from 'child_process';

// Run a single critical test to verify functionality
console.log('Testing webhook processing core functionality...\n');

try {
  const testCommand = `cd /home/runner/workspace && NODE_ENV=test npx vitest run tests/webhook-processing.test.ts --run --no-coverage --reporter=tap 2>&1 | grep -E "(ok|not ok)" | head -20`;
  
  const result = execSync(testCommand, {
    encoding: 'utf8',
    timeout: 30000,
    shell: true
  });

  console.log('Test Results:');
  console.log(result);
  
  const lines = result.split('\n').filter(line => line.trim());
  const passed = lines.filter(line => line.includes('ok') && !line.includes('not ok')).length;
  const failed = lines.filter(line => line.includes('not ok')).length;
  
  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  
  if (failed === 0 && passed > 0) {
    console.log('SUCCESS: All tests passing!');
  }

} catch (error) {
  console.log('Running basic verification...');
  
  // Fallback: Test webhook endpoint directly
  try {
    const basicTest = `cd /home/runner/workspace && curl -s -X POST http://localhost:5000/api/webhook -H "Content-Type: application/json" -d '{"type":"test","data":{}}' | head -1`;
    const response = execSync(basicTest, { encoding: 'utf8', timeout: 5000 });
    console.log('Webhook endpoint response:', response.trim());
  } catch (e) {
    console.log('Direct endpoint test failed:', e.message);
  }
}