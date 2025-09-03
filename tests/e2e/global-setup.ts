import { FullConfig } from '@playwright/test';

/**
 * Global setup for FinHelm AI E2E tests
 * Runs once before all test files
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting FinHelm AI E2E Test Suite');
  console.log(`📊 Running ${config.projects.length} browser configurations`);
  console.log(`🌐 Base URL: ${config.use?.baseURL || 'http://localhost:3000'}`);
  console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Set up test environment variables
  process.env.FINHELM_E2E_MODE = 'true';
  process.env.FINHELM_MOCK_DATA = 'true';
  
  // Log configuration details
  if (config.use?.trace) {
    console.log('🔍 Trace collection enabled');
  }
  
  if (config.use?.video) {
    console.log('📹 Video recording enabled for failed tests');
  }
  
  if (config.use?.screenshot) {
    console.log('📸 Screenshot capture enabled for failed tests');
  }

  // Validate required environment variables
  const requiredEnvVars = [
    'NODE_ENV',
  ];

  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingEnvVars.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missingEnvVars.join(', ')}`);
    console.warn('Some tests may use default values');
  }

  // Create test data directory if it doesn't exist
  const fs = require('fs');
  const path = require('path');
  
  const testDataDir = path.join(__dirname, 'test-data');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
    console.log('📁 Created test-data directory');
  }

  // Set up test database/mock data if needed
  await setupTestData();
  
  console.log('✅ Global setup completed successfully\n');
}

/**
 * Set up test data and mock responses
 */
async function setupTestData() {
  // This function would typically:
  // 1. Set up test database with known data
  // 2. Configure mock API responses
  // 3. Create test user accounts
  // 4. Set up QuickBooks sandbox connections
  
  console.log('📋 Setting up test data and mock responses...');
  
  // For now, we'll just set environment flags
  process.env.FINHELM_MOCK_QB_API = 'true';
  process.env.FINHELM_MOCK_CONVEX = 'true';
  process.env.FINHELM_TEST_USER_ID = 'test-user-12345';
  process.env.FINHELM_TEST_ORG_ID = 'test-org-67890';
  
  console.log('✅ Test data setup completed');
}

export default globalSetup;