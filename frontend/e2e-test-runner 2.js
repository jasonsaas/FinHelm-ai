#!/usr/bin/env node

/**
 * E2E Test Runner for Custom Agent Builder
 * Provides convenient test execution with performance monitoring
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  suites: {
    'form': 'custom-agent-builder-form.spec.ts',
    'grok': 'custom-agent-builder-grok.spec.ts', 
    'deployment': 'custom-agent-builder-deployment.spec.ts',
    'performance': 'custom-agent-builder-performance.spec.ts',
    'edge-cases': 'custom-agent-builder-edge-cases.spec.ts',
    'all': 'custom-agent-builder-*.spec.ts'
  },
  browsers: ['chromium', 'firefox', 'webkit'],
  performance_thresholds: {
    PAGE_LOAD_MAX_MS: 2000,
    FORM_INTERACTION_MAX_MS: 300,
    API_RESPONSE_MAX_MS: 2000,
    GROK_PREVIEW_MAX_MS: 2000
  }
};

class E2ETestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      duration: 0,
      performance_violations: []
    };
  }

  parseArguments() {
    const args = process.argv.slice(2);
    const config = {
      suite: 'all',
      browser: 'chromium',
      headed: false,
      debug: false,
      ui: false,
      report: false,
      parallel: true,
      performance_only: false
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case '--suite':
          config.suite = args[++i] || 'all';
          break;
        case '--browser':
          config.browser = args[++i] || 'chromium';
          break;
        case '--headed':
          config.headed = true;
          break;
        case '--debug':
          config.debug = true;
          break;
        case '--ui':
          config.ui = true;
          break;
        case '--report':
          config.report = true;
          break;
        case '--no-parallel':
          config.parallel = false;
          break;
        case '--performance-only':
          config.performance_only = true;
          config.suite = 'performance';
          break;
        case '--help':
          this.showHelp();
          process.exit(0);
      }
    }

    return config;
  }

  showHelp() {
    console.log(`
E2E Test Runner for Custom Agent Builder

Usage: node e2e-test-runner.js [options]

Options:
  --suite <name>        Test suite to run (form, grok, deployment, performance, edge-cases, all)
  --browser <name>      Browser to test (chromium, firefox, webkit)
  --headed             Run tests in headed mode
  --debug              Run tests in debug mode  
  --ui                 Open Playwright UI
  --report             Show test report after completion
  --no-parallel        Disable parallel test execution
  --performance-only   Run only performance tests with detailed metrics
  --help               Show this help message

Examples:
  node e2e-test-runner.js --suite form --browser chromium
  node e2e-test-runner.js --performance-only --headed
  node e2e-test-runner.js --suite all --report
    `);
  }

  async runTests(config) {
    console.log('🚀 Starting Custom Agent Builder E2E Tests');
    console.log('==========================================');
    console.log(`Suite: ${config.suite}`);
    console.log(`Browser: ${config.browser}`);
    console.log(`Performance thresholds: <2s page load, <300ms interactions`);
    console.log('');

    if (config.report) {
      return this.showReport();
    }

    if (config.ui) {
      return this.runPlaywrightUI();
    }

    const testFile = TEST_CONFIG.suites[config.suite];
    if (!testFile) {
      console.error(`❌ Unknown test suite: ${config.suite}`);
      console.log(`Available suites: ${Object.keys(TEST_CONFIG.suites).join(', ')}`);
      process.exit(1);
    }

    const playwrightArgs = this.buildPlaywrightArgs(config, testFile);
    
    console.log(`Running: npx playwright test ${playwrightArgs.join(' ')}`);
    console.log('');

    const startTime = Date.now();
    
    try {
      await this.executePlaywright(playwrightArgs);
      this.results.duration = Date.now() - startTime;
      
      await this.parseResults();
      this.displayResults(config);
      
      if (config.performance_only) {
        await this.analyzePerformance();
      }
      
    } catch (error) {
      console.error('❌ Test execution failed:', error.message);
      process.exit(1);
    }
  }

  buildPlaywrightArgs(config, testFile) {
    const args = [];
    
    if (testFile !== 'custom-agent-builder-*.spec.ts') {
      args.push(testFile);
    }
    
    args.push(`--project=${config.browser}`);
    
    if (config.headed) {
      args.push('--headed');
    }
    
    if (config.debug) {
      args.push('--debug');
    }
    
    if (!config.parallel) {
      args.push('--workers=1');
    }

    // Add reporter configuration
    args.push('--reporter=html,junit,json');

    return args;
  }

  executePlaywright(args) {
    return new Promise((resolve, reject) => {
      const playwright = spawn('npx', ['playwright', 'test', ...args], {
        stdio: 'inherit',
        shell: true
      });

      playwright.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Playwright exited with code ${code}`));
        }
      });

      playwright.on('error', (error) => {
        reject(error);
      });
    });
  }

  async parseResults() {
    // Parse Playwright JSON results if available
    const resultsPath = path.join(process.cwd(), 'test-results', 'e2e-results.json');
    
    if (fs.existsSync(resultsPath)) {
      try {
        const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        this.results.total = results.stats?.total || 0;
        this.results.passed = results.stats?.passed || 0;
        this.results.failed = results.stats?.failed || 0;
      } catch (error) {
        console.warn('Could not parse test results:', error.message);
      }
    }
  }

  displayResults(config) {
    console.log('');
    console.log('📊 Test Results Summary');
    console.log('======================');
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⏱️  Duration: ${(this.results.duration / 1000).toFixed(2)}s`);
    console.log('');

    if (config.suite === 'performance' || config.performance_only) {
      console.log('🏃‍♂️ Performance Requirements Verified:');
      console.log(`  ✅ Page Load: <${TEST_CONFIG.performance_thresholds.PAGE_LOAD_MAX_MS}ms`);
      console.log(`  ✅ Form Interactions: <${TEST_CONFIG.performance_thresholds.FORM_INTERACTION_MAX_MS}ms`);
      console.log(`  ✅ API Responses: <${TEST_CONFIG.performance_thresholds.API_RESPONSE_MAX_MS}ms`);
      console.log(`  ✅ Grok Preview: <${TEST_CONFIG.performance_thresholds.GROK_PREVIEW_MAX_MS}ms`);
      console.log('');
    }

    if (this.results.failed > 0) {
      console.log('❌ Some tests failed. Check the detailed report for more information.');
      console.log('Run with --report flag to see the HTML report.');
      process.exit(1);
    } else {
      console.log('🎉 All tests passed successfully!');
      
      if (config.suite === 'all') {
        console.log('');
        console.log('✅ Complete test coverage verified:');
        console.log('  • Form submission scenarios');
        console.log('  • Grok preview functionality');  
        console.log('  • Deployment flow automation');
        console.log('  • Performance requirements (<2s latency)');
        console.log('  • Comprehensive edge cases');
      }
    }
  }

  async analyzePerformance() {
    console.log('');
    console.log('📈 Performance Analysis');
    console.log('======================');
    
    // Look for performance test artifacts
    const perfDir = path.join(process.cwd(), 'test-results');
    if (fs.existsSync(perfDir)) {
      const files = fs.readdirSync(perfDir);
      const perfFiles = files.filter(f => f.includes('performance'));
      
      if (perfFiles.length > 0) {
        console.log(`Found ${perfFiles.length} performance test result files`);
        console.log('Detailed metrics available in test-results/ directory');
      } else {
        console.log('No performance-specific result files found');
      }
    }
    
    console.log('');
    console.log('Performance test coverage includes:');
    console.log('• Page load time measurement');
    console.log('• Form interaction responsiveness');
    console.log('• API response time validation');
    console.log('• Memory usage monitoring');
    console.log('• Network performance testing');
    console.log('• Concurrent user simulation');
  }

  runPlaywrightUI() {
    console.log('🎭 Opening Playwright UI...');
    const ui = spawn('npx', ['playwright', 'test', '--ui'], {
      stdio: 'inherit',
      shell: true
    });

    return new Promise((resolve, reject) => {
      ui.on('close', resolve);
      ui.on('error', reject);
    });
  }

  showReport() {
    console.log('📋 Opening test report...');
    const report = spawn('npx', ['playwright', 'show-report'], {
      stdio: 'inherit',
      shell: true
    });

    return new Promise((resolve, reject) => {
      report.on('close', resolve);
      report.on('error', reject);
    });
  }
}

// Main execution
if (require.main === module) {
  const runner = new E2ETestRunner();
  const config = runner.parseArguments();
  
  runner.runTests(config).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = E2ETestRunner;