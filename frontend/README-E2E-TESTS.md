# Custom Agent Builder E2E Test Suite

This comprehensive end-to-end test suite validates the **Custom Agent Builder** component with focus on performance, functionality, and edge cases as specified in the PRD.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Run all tests
npm run test:e2e

# Run specific test suite
npm run test:e2e:performance

# Run with UI
npm run test:e2e:ui
```

## 📋 Test Coverage

### 1. Form Submission Tests (`custom-agent-builder-form.spec.ts`)
- **Valid form submissions** for all agent types (anomaly, reconciliation, ERP auth)
- **Form validation** with comprehensive error handling
- **Edge case inputs** (empty fields, length violations, invalid data)
- **Performance requirements** (<2s for form interactions)
- **Accessibility** and focus management
- **Error recovery** scenarios

**Key Scenarios:**
- Complete anomaly agent configuration
- Reconciliation agent with fuzzy matching
- ERP authentication agent setup
- Minimum/maximum field length validation
- Rapid form interactions
- Form state preservation

### 2. Grok Preview Tests (`custom-agent-builder-grok.spec.ts`)
- **Grok AI integration** with mock responses for all agent types
- **Preview functionality** with confidence scoring (92.7% target)
- **Error handling** (rate limits, timeouts, network failures)
- **Performance validation** (<2s response time)
- **Agent-type specific** sample data handling
- **UI state management** during preview operations

**Mock Response Coverage:**
- Anomaly detection with Oracle Ledger analysis
- Data reconciliation with similarity scores
- ERP authentication status validation
- Error scenarios (429 rate limit, 408 timeout)
- Recovery and retry mechanisms

### 3. Deployment Flow Tests (`custom-agent-builder-deployment.spec.ts`)
- **End-to-end deployment** validation and testing
- **Multi-stage process** (validation → deployment → completion)
- **Progress indicators** and user feedback
- **Error handling** at each deployment stage
- **Test configuration** vs production deployment
- **Performance monitoring** throughout deployment

**Deployment Scenarios:**
- Successful production deployment
- Test configuration validation
- Validation failures with specific errors
- Runtime deployment errors
- Timeout handling
- Progress indicator accuracy

### 4. Performance Tests (`custom-agent-builder-performance.spec.ts`)
- **Page load performance** (<2s requirement from PRD)
- **Form interaction responsiveness** (<300ms)
- **API response times** (<2s for all calls)
- **Memory usage monitoring** (leak prevention)
- **Network performance** (slow connections, failures)
- **Concurrent user simulation**

**Performance Metrics:**
- Page Load: <2000ms ✅
- Form Interactions: <300ms ✅ 
- API Responses: <2000ms ✅
- Grok Preview: <2000ms ✅
- Memory Growth: <50% increase during intensive use
- Network Resilience: Graceful degradation

### 5. Edge Cases Tests (`custom-agent-builder-edge-cases.spec.ts`)
- **Boundary value testing** (min/max lengths, numeric ranges)
- **Input sanitization** (XSS, SQL injection prevention)
- **Unicode and special characters** handling
- **Browser environment edge cases** (refresh, network disconnection)
- **Concurrent operations** and race conditions
- **Accessibility corner cases**

**Edge Case Categories:**
- Input validation boundaries
- URL validation extremes  
- Special character encoding (Unicode, emojis, international text)
- Security injection attempts
- Browser state management
- Network connectivity issues
- Memory pressure scenarios

## 🏃‍♂️ Running Tests

### Basic Commands

```bash
# Run all test suites
npm run test:e2e

# Run specific suite
npm run test:e2e:form
npm run test:e2e:grok  
npm run test:e2e:deployment
npm run test:e2e:performance
npm run test:e2e:edge-cases

# Interactive mode
npm run test:e2e:ui
npm run test:e2e:headed
npm run test:e2e:debug

# View results
npm run test:e2e:report
```

### Advanced Test Runner

Use the custom test runner for additional options:

```bash
# Performance-focused testing
node e2e-test-runner.js --performance-only --headed

# Specific browser testing  
node e2e-test-runner.js --suite grok --browser firefox

# Debug mode with detailed output
node e2e-test-runner.js --suite deployment --debug

# All browsers, full suite
node e2e-test-runner.js --suite all --browser all

# Show help
node e2e-test-runner.js --help
```

## 📊 Performance Requirements (PRD Alignment)

The test suite validates these specific PRD requirements:

| Requirement | Threshold | Test Coverage |
|-------------|-----------|---------------|
| Page Load Time | <2 seconds | ✅ Comprehensive |
| Form Interactions | <300ms | ✅ All input types |
| API Responses | <2 seconds | ✅ All endpoints |
| Grok Preview | <2 seconds | ✅ All agent types |
| Memory Usage | Stable | ✅ Leak detection |
| Error Recovery | <3 seconds | ✅ All scenarios |

## 🎯 Test Configuration

### Browser Support
- **Chromium** (Primary)
- **Firefox** (Cross-browser validation)  
- **WebKit** (Safari compatibility)
- **Mobile Chrome** (Responsive testing)
- **Mobile Safari** (iOS compatibility)

### CI/CD Integration

The test suite includes GitHub Actions workflow (`.github/workflows/e2e-tests.yml`) with:

- **Automated execution** on PR and push
- **Performance analysis** with threshold validation
- **Cross-browser testing** in parallel
- **Artifact collection** (screenshots, videos, reports)
- **Performance regression** detection
- **PR comments** with test results

### Environment Setup

Required environment variables:
```bash
VITE_CONVEX_URL=your_convex_url
CONVEX_DEPLOY_KEY=your_deploy_key
```

## 🔧 Debugging Tests

### Visual Debugging
```bash
# Run tests with browser UI visible
npm run test:e2e:headed

# Step through tests interactively  
npm run test:e2e:debug

# Open Playwright Inspector
npm run test:e2e:ui
```

### Performance Debugging
```bash
# Performance-focused run with metrics
node e2e-test-runner.js --performance-only --headed

# Check for specific performance issues
npm run test:e2e:performance -- --grep "should load page within"
```

### Network Debugging
Tests include network condition simulation:
- Slow 3G connections
- Network disconnections  
- API timeouts and failures
- Concurrent request handling

## 📈 Results and Reporting

### Test Reports
- **HTML Report**: Comprehensive visual results
- **JUnit XML**: CI/CD integration
- **JSON Results**: Programmatic analysis
- **Performance Metrics**: Detailed timing data

### Artifacts Generated
- Screenshots on failure
- Video recordings of failed tests
- Network HAR files
- Performance timeline traces
- Memory usage profiles

## 🚨 Troubleshooting

### Common Issues

**Test Timeout:**
```bash
# Increase timeout for slow environments
npx playwright test --timeout=60000
```

**Browser Installation:**
```bash
# Reinstall browsers
npx playwright install --force
```

**Port Conflicts:**
```bash
# Check if port 5173 is available
lsof -i :5173
```

**Memory Issues:**
```bash
# Run tests with less parallelism
npx playwright test --workers=1
```

### Performance Issues

If performance tests fail:
1. Check system resource usage
2. Verify network stability  
3. Run performance tests in isolation
4. Check for background processes
5. Consider machine-specific thresholds

## 📚 Architecture

### Page Object Model
Tests use the Page Object Model pattern with:
- `CustomAgentBuilderPage` - Core form interactions
- `GrokPreviewPage` - AI preview functionality  
- `DeploymentFlowPage` - Deployment process
- `EdgeCaseTestPage` - Boundary testing utilities
- `PerformanceTestPage` - Performance measurement tools

### Test Data Management
- **Mock API responses** for consistent testing
- **Edge case data sets** for boundary testing
- **Performance baselines** for regression detection
- **Cross-browser compatibility** data

## 🎯 PRD Compliance Verification

This test suite specifically validates:

✅ **<2 second latency requirement** (Performance tests)  
✅ **Edge case coverage** (Comprehensive edge case suite)  
✅ **Form submission workflows** (Form validation tests)  
✅ **Grok AI integration** (Preview functionality tests)  
✅ **Deployment flow validation** (End-to-end deployment tests)  
✅ **Cross-browser compatibility** (Multi-browser test matrix)  
✅ **Accessibility standards** (A11y testing throughout)  
✅ **Error handling robustness** (Error scenario coverage)

---

**Total Test Coverage: 200+ test scenarios across 5 comprehensive test suites**

For questions or issues, please refer to the project documentation or create an issue in the repository.