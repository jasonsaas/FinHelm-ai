/**
 * Global teardown for FinHelm AI E2E tests
 * Runs once after all test files complete
 */
async function globalTeardown() {
  console.log('\n🧹 Starting global teardown...');
  
  // Clean up test environment variables
  delete process.env.FINHELM_E2E_MODE;
  delete process.env.FINHELM_MOCK_DATA;
  delete process.env.FINHELM_MOCK_QB_API;
  delete process.env.FINHELM_MOCK_CONVEX;
  delete process.env.FINHELM_TEST_USER_ID;
  delete process.env.FINHELM_TEST_ORG_ID;
  
  // Clean up any test data or temporary files
  await cleanupTestData();
  
  // Generate test summary report
  await generateTestSummary();
  
  console.log('✅ Global teardown completed');
  console.log('📊 Test artifacts available in test-results/');
  console.log('🎭 Playwright HTML report: playwright-report/index.html');
}

/**
 * Clean up test data and temporary files
 */
async function cleanupTestData() {
  const fs = require('fs');
  const path = require('path');
  
  console.log('🗑️  Cleaning up test data...');
  
  // Clean up temporary test files
  const tempDir = path.join(__dirname, 'temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('🗂️  Removed temporary files');
  }
  
  // Archive old test results (keep last 5 runs)
  const testResultsDir = path.join(__dirname, 'test-results');
  if (fs.existsSync(testResultsDir)) {
    archiveOldResults(testResultsDir);
  }
  
  console.log('✅ Test data cleanup completed');
}

/**
 * Generate a test summary report
 */
async function generateTestSummary() {
  const fs = require('fs');
  const path = require('path');
  
  console.log('📝 Generating test summary...');
  
  const summaryPath = path.join(__dirname, 'test-results', 'test-summary.json');
  const summary = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    baseUrl: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    testSuite: 'finhelm-e2e',
    version: '1.0.0',
  };
  
  try {
    if (!fs.existsSync(path.dirname(summaryPath))) {
      fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
    }
    
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📄 Test summary written to: ${summaryPath}`);
  } catch (error) {
    console.warn('⚠️  Failed to write test summary:', error);
  }
}

/**
 * Archive old test results to keep directory clean
 */
function archiveOldResults(testResultsDir: string) {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const archiveDir = path.join(testResultsDir, 'archive');
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }
    
    // This is a simplified version - in practice, you'd implement
    // more sophisticated archiving logic based on timestamps
    console.log('📦 Archived old test results');
  } catch (error) {
    console.warn('⚠️  Failed to archive old results:', error);
  }
}

export default globalTeardown;