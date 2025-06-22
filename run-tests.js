#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🧪 Running webhook processing tests...\n');

try {
  // Run the specific test file with optimized settings
  const result = execSync('npx vitest run tests/webhook-processing.test.ts --run --no-coverage --reporter=json', {
    encoding: 'utf8',
    timeout: 60000,
    stdio: 'pipe'
  });

  const testResults = JSON.parse(result);
  const testFile = testResults.testResults.find(r => r.name.includes('webhook-processing'));
  
  if (testFile) {
    const passed = testFile.numPassingTests;
    const failed = testFile.numFailingTests;
    const total = testFile.numTotalTests;
    
    console.log(`✅ PASSED: ${passed}`);
    console.log(`❌ FAILED: ${failed}`);
    console.log(`📊 TOTAL: ${total}`);
    console.log(`📈 PASS RATE: ${((passed/total)*100).toFixed(1)}%\n`);
    
    if (failed > 0) {
      console.log('Failed tests:');
      testFile.assertionResults
        .filter(test => test.status === 'failed')
        .forEach(test => {
          console.log(`- ${test.fullName}`);
          if (test.failureMessages?.length > 0) {
            console.log(`  Error: ${test.failureMessages[0].split('\n')[0]}`);
          }
        });
    }
    
    if (passed === total) {
      console.log('🎉 ALL TESTS PASSING! 100% SUCCESS RATE');
    }
  }
  
} catch (error) {
  console.error('Test execution failed:', error.message);
  
  // Try alternative approach with basic output parsing
  try {
    console.log('\n🔄 Attempting alternative test execution...');
    const basicResult = execSync('npx vitest run tests/webhook-processing.test.ts --run --no-coverage --reporter=verbose', {
      encoding: 'utf8',
      timeout: 45000
    });
    
    const lines = basicResult.split('\n');
    const passedTests = lines.filter(line => line.includes('✓')).length;
    const failedTests = lines.filter(line => line.includes('×')).length;
    
    console.log(`✅ PASSED: ${passedTests}`);
    console.log(`❌ FAILED: ${failedTests}`);
    console.log(`📊 TOTAL: ${passedTests + failedTests}`);
    
    if (passedTests > 0 && failedTests === 0) {
      console.log('🎉 ALL TESTS PASSING! 100% SUCCESS RATE');
    }
    
  } catch (altError) {
    console.error('Alternative test execution also failed:', altError.message);
  }
}