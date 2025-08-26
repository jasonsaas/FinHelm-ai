import { test, expect } from '@playwright/test';
import { Page } from '@playwright/test';

// Performance thresholds as per PRD requirements
const PERFORMANCE_THRESHOLDS = {
  PAGE_LOAD_MAX_MS: 2000,           // <2s for page load
  FORM_INTERACTION_MAX_MS: 300,    // <300ms for form interactions
  API_RESPONSE_MAX_MS: 2000,       // <2s for API responses
  GROK_PREVIEW_MAX_MS: 2000,       // <2s for Grok preview
  DEPLOYMENT_FEEDBACK_MAX_MS: 1000, // <1s for deployment feedback
  FORM_VALIDATION_MAX_MS: 500,     // <500ms for form validation
};

// Performance measurement utilities
class PerformanceMeasure {
  private startTimes = new Map<string, number>();

  start(operation: string): void {
    this.startTimes.set(operation, Date.now());
  }

  end(operation: string): number {
    const startTime = this.startTimes.get(operation);
    if (!startTime) {
      throw new Error(`No start time recorded for operation: ${operation}`);
    }
    const duration = Date.now() - startTime;
    this.startTimes.delete(operation);
    return duration;
  }

  async measurePageLoad(page: Page, url: string): Promise<number> {
    const startTime = Date.now();
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }

  async measureDOMContentLoaded(page: Page, url: string): Promise<number> {
    const startTime = Date.now();
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    return Date.now() - startTime;
  }

  async measureUserInteraction(page: Page, action: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    await action();
    return Date.now() - startTime;
  }

  async measureAPICall(page: Page, apiPattern: string, triggerAction: () => Promise<void>): Promise<number> {
    return new Promise(async (resolve) => {
      const startTime = Date.now();
      
      // Listen for API response
      page.once('response', (response) => {
        if (response.url().includes(apiPattern)) {
          const duration = Date.now() - startTime;
          resolve(duration);
        }
      });

      await triggerAction();
    });
  }
}

class PerformanceTestPage {
  constructor(private page: Page, private perfMeasure: PerformanceMeasure) {}

  async fillFormQuickly() {
    // Optimized form filling for performance tests
    await Promise.all([
      this.page.fill('[data-testid="agent-name-input"]', 'Performance Test Agent'),
      this.page.selectOption('[data-testid="agent-type-select"]', 'anomaly'),
      this.page.fill('[data-testid="description-textarea"]', 'Agent for performance testing with optimized configuration')
    ]);
  }

  async triggerValidation(): Promise<void> {
    // Trigger form validation by filling a required field
    await this.page.fill('[data-testid="agent-name-input"]', 'Valid Agent Name');
  }

  async simulateTypingSpeed(selector: string, text: string, wpm: number = 40): Promise<number> {
    // Simulate realistic typing speed (40 WPM = ~200 chars/min = ~3.3 chars/sec)
    const charsPerMs = (wpm * 5) / 60000; // 5 chars per word average
    const startTime = Date.now();
    
    for (let i = 0; i < text.length; i++) {
      await this.page.type(selector, text[i]);
      await this.page.waitForTimeout(1 / charsPerMs);
    }
    
    return Date.now() - startTime;
  }
}

test.describe('Custom Agent Builder - Performance Testing', () => {
  let perfMeasure: PerformanceMeasure;
  let perfPage: PerformanceTestPage;

  test.beforeEach(async ({ page }) => {
    perfMeasure = new PerformanceMeasure();
    perfPage = new PerformanceTestPage(page, perfMeasure);
  });

  test.describe('Page Load Performance', () => {
    test('should load page within 2 seconds', async ({ page }) => {
      const loadTime = await perfMeasure.measurePageLoad(page, '/custom-agent-builder');
      
      // Verify page is fully loaded
      await expect(page.locator('[data-testid="custom-agent-builder"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-name-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="deploy-button"]')).toBeVisible();
      
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD_MAX_MS);
      console.log(`Page load time: ${loadTime}ms (threshold: ${PERFORMANCE_THRESHOLDS.PAGE_LOAD_MAX_MS}ms)`);
    });

    test('should reach DOM content loaded within 1 second', async ({ page }) => {
      const domLoadTime = await perfMeasure.measureDOMContentLoaded(page, '/custom-agent-builder');
      
      expect(domLoadTime).toBeLessThan(1000);
      console.log(`DOM content loaded time: ${domLoadTime}ms`);
    });

    test('should load critical form elements first', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/custom-agent-builder');
      
      // Critical elements should be available quickly
      await page.waitForSelector('[data-testid="agent-name-input"]');
      const criticalElementsTime = Date.now() - startTime;
      
      expect(criticalElementsTime).toBeLessThan(1500);
      console.log(`Critical elements load time: ${criticalElementsTime}ms`);
    });

    test('should handle concurrent page loads efficiently', async ({ context }) => {
      // Test multiple concurrent page loads
      const pages = await Promise.all([
        context.newPage(),
        context.newPage(),
        context.newPage()
      ]);

      const startTime = Date.now();
      const loadPromises = pages.map(p => p.goto('/custom-agent-builder'));
      
      await Promise.all(loadPromises);
      await Promise.all(pages.map(p => p.waitForSelector('[data-testid="custom-agent-builder"]')));
      
      const totalTime = Date.now() - startTime;
      
      // Should not degrade significantly with concurrent loads
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD_MAX_MS * 1.5);
      console.log(`Concurrent page loads time: ${totalTime}ms`);
      
      // Cleanup
      await Promise.all(pages.map(p => p.close()));
    });
  });

  test.describe('Form Interaction Performance', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/custom-agent-builder');
      await page.waitForSelector('[data-testid="custom-agent-builder"]');
    });

    test('should validate form inputs within 500ms', async ({ page }) => {
      const validationTime = await perfMeasure.measureUserInteraction(page, async () => {
        await perfPage.triggerValidation();
        // Wait for validation to complete (form becomes valid)
        await page.waitForFunction(() => {
          const deployButton = document.querySelector('[data-testid="deploy-button"]') as HTMLButtonElement;
          return !deployButton.disabled;
        }, { timeout: 1000 });
      });

      expect(validationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FORM_VALIDATION_MAX_MS);
      console.log(`Form validation time: ${validationTime}ms`);
    });

    test('should handle rapid input changes efficiently', async ({ page }) => {
      const startTime = Date.now();
      
      // Simulate rapid typing in name field
      const nameInput = page.locator('[data-testid="agent-name-input"]');
      await nameInput.fill('');
      
      // Type rapidly with frequent changes
      for (let i = 0; i < 10; i++) {
        await nameInput.fill(`Agent Name ${i}`);
        await page.waitForTimeout(50); // Rapid changes
      }
      
      const rapidInputTime = Date.now() - startTime;
      
      // Should handle rapid changes without performance degradation
      expect(rapidInputTime).toBeLessThan(2000);
      console.log(`Rapid input changes time: ${rapidInputTime}ms`);
    });

    test('should respond to checkbox toggles quickly', async ({ page }) => {
      const toggleTime = await perfMeasure.measureUserInteraction(page, async () => {
        await page.check('[data-testid="grok-enabled-checkbox"]');
        await page.waitForSelector('h2:has-text("Grok AI Preview")', { state: 'visible' });
      });

      expect(toggleTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FORM_INTERACTION_MAX_MS);
      console.log(`Checkbox toggle time: ${toggleTime}ms`);
    });

    test('should handle select dropdown changes efficiently', async ({ page }) => {
      const selectTime = await perfMeasure.measureUserInteraction(page, async () => {
        await page.selectOption('[data-testid="agent-type-select"]', 'reconciliation');
        // Wait for any UI updates related to agent type change
        await page.waitForTimeout(100);
      });

      expect(selectTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FORM_INTERACTION_MAX_MS);
      console.log(`Select dropdown time: ${selectTime}ms`);
    });

    test('should maintain performance with large text inputs', async ({ page }) => {
      const largeText = 'A'.repeat(1000); // 1000 character string
      
      const largeInputTime = await perfMeasure.measureUserInteraction(page, async () => {
        await page.fill('[data-testid="description-textarea"]', largeText);
        await page.waitForTimeout(100); // Allow for any processing
      });

      expect(largeInputTime).toBeLessThan(1000);
      console.log(`Large text input time: ${largeInputTime}ms`);
    });
  });

  test.describe('API Response Performance', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/custom-agent-builder');
      await perfPage.fillFormQuickly();
    });

    test('should receive Grok preview response within 2 seconds', async ({ page }) => {
      // Mock Grok API with realistic response time
      await page.route('**/api/agentActions/previewGrokAnalysis', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate processing
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            confidence: 94.2,
            analysis: { processing_time_ms: 800 }
          })
        });
      });

      await page.check('[data-testid="grok-enabled-checkbox"]');

      const apiResponseTime = await perfMeasure.measureAPICall(
        page,
        'previewGrokAnalysis',
        async () => {
          await page.click('[data-testid="grok-preview-button"]');
          await page.waitForSelector('[data-testid="grok-preview-result"]');
        }
      );

      expect(apiResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.GROK_PREVIEW_MAX_MS);
      console.log(`Grok preview API response time: ${apiResponseTime}ms`);
    });

    test('should handle deployment validation quickly', async ({ page }) => {
      await page.route('**/api/agentActions/validateAgentConfig', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 400));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'valid' })
        });
      });

      const validationTime = await perfMeasure.measureAPICall(
        page,
        'validateAgentConfig',
        async () => {
          await page.click('[data-testid="test-config-button"]');
          await page.waitForSelector('[data-testid="deployment-status"]');
        }
      );

      expect(validationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_MAX_MS);
      console.log(`Validation API response time: ${validationTime}ms`);
    });

    test('should provide immediate deployment feedback', async ({ page }) => {
      const feedbackTime = await perfMeasure.measureUserInteraction(page, async () => {
        await page.click('[data-testid="deploy-button"]');
        await page.waitForSelector('[data-testid="deployment-spinner"]');
      });

      expect(feedbackTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DEPLOYMENT_FEEDBACK_MAX_MS);
      console.log(`Deployment feedback time: ${feedbackTime}ms`);
    });

    test('should handle API timeout gracefully', async ({ page }) => {
      await page.route('**/api/agentActions/validateAgentConfig', async (route) => {
        // Simulate very slow API
        await new Promise(resolve => setTimeout(resolve, 5000));
        await route.fulfill({ status: 200, body: '{}' });
      });

      const startTime = Date.now();
      await page.click('[data-testid="test-config-button"]');
      
      // Should show loading state immediately
      await page.waitForSelector('[data-testid="deployment-spinner"]');
      const loadingTime = Date.now() - startTime;
      
      expect(loadingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DEPLOYMENT_FEEDBACK_MAX_MS);
      console.log(`Loading state response time: ${loadingTime}ms`);
    });
  });

  test.describe('Memory and Resource Performance', () => {
    test('should not leak memory with repeated interactions', async ({ page }) => {
      await page.goto('/custom-agent-builder');
      
      // Get initial memory usage
      const initialMetrics = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
      
      // Perform repeated interactions
      for (let i = 0; i < 50; i++) {
        await page.fill('[data-testid="agent-name-input"]', `Agent ${i}`);
        await page.selectOption('[data-testid="agent-type-select"]', i % 2 === 0 ? 'anomaly' : 'reconciliation');
        await page.fill('[data-testid="description-textarea"]', `Description ${i}`);
        
        if (i % 10 === 0) {
          await page.check('[data-testid="grok-enabled-checkbox"]');
          await page.uncheck('[data-testid="grok-enabled-checkbox"]');
        }
      }

      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });

      const finalMetrics = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
      
      if (initialMetrics && finalMetrics) {
        const memoryIncrease = finalMetrics - initialMetrics;
        const memoryIncreasePercent = (memoryIncrease / initialMetrics) * 100;
        
        // Memory should not increase by more than 50% after intensive interactions
        expect(memoryIncreasePercent).toBeLessThan(50);
        console.log(`Memory increase: ${memoryIncreasePercent.toFixed(2)}%`);
      }
    });

    test('should handle large forms efficiently', async ({ page }) => {
      await page.goto('/custom-agent-builder');
      
      // Create a form with maximum data
      const largeConfig = {
        name: 'A'.repeat(100),
        description: 'B'.repeat(500),
        webhook: 'https://very-long-webhook-url-that-exceeds-normal-length.example.com/webhook/endpoint/with/many/path/segments'
      };

      const startTime = Date.now();
      
      await page.fill('[data-testid="agent-name-input"]', largeConfig.name);
      await page.fill('[data-testid="description-textarea"]', largeConfig.description);
      await page.fill('[data-testid="webhook-url-input"]', largeConfig.webhook);
      
      // Enable all options
      await page.check('[data-testid="grok-enabled-checkbox"]');
      await page.check('[data-testid="oracle-integration-checkbox"]');
      await page.check('[data-testid="test-mode-checkbox"]');
      
      const formFillTime = Date.now() - startTime;
      
      expect(formFillTime).toBeLessThan(2000);
      console.log(`Large form fill time: ${formFillTime}ms`);
    });

    test('should render efficiently with multiple components', async ({ page }) => {
      await page.goto('/custom-agent-builder');
      
      const startTime = Date.now();
      
      // Enable all sections to maximize rendering
      await page.check('[data-testid="grok-enabled-checkbox"]');
      
      // Wait for all sections to be visible
      await expect(page.locator('h2:has-text("Grok AI Preview")')).toBeVisible();
      await expect(page.locator('h2:has-text("Basic Configuration")')).toBeVisible();
      await expect(page.locator('h2:has-text("Advanced Settings")')).toBeVisible();
      await expect(page.locator('h2:has-text("Notifications")')).toBeVisible();
      
      const renderTime = Date.now() - startTime;
      
      expect(renderTime).toBeLessThan(1000);
      console.log(`Multi-component render time: ${renderTime}ms`);
    });
  });

  test.describe('Network Performance', () => {
    test('should handle slow network connections', async ({ page, context }) => {
      // Simulate slow 3G connection
      await context.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Add network latency
        await route.continue();
      });

      const loadTime = await perfMeasure.measurePageLoad(page, '/custom-agent-builder');
      
      // Should still be usable on slow connections, though may exceed ideal time
      expect(loadTime).toBeLessThan(5000); // More lenient for slow network
      console.log(`Slow network load time: ${loadTime}ms`);
    });

    test('should optimize API request batching', async ({ page }) => {
      let requestCount = 0;
      
      await page.route('**/api/**', async (route) => {
        requestCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '{}'
        });
      });

      await page.goto('/custom-agent-builder');
      await perfPage.fillFormQuickly();
      
      // Should not make excessive API calls during normal form interaction
      expect(requestCount).toBeLessThan(5);
      console.log(`API requests during page interaction: ${requestCount}`);
    });

    test('should handle network failures gracefully', async ({ page }) => {
      await page.goto('/custom-agent-builder');
      await perfPage.fillFormQuickly();
      
      // Simulate network failure
      await page.route('**/api/**', (route) => route.abort('failed'));
      
      const startTime = Date.now();
      await page.click('[data-testid="test-config-button"]');
      
      // Should show error state quickly
      await page.waitForSelector('[data-testid="deployment-status"]', { timeout: 3000 });
      const errorTime = Date.now() - startTime;
      
      expect(errorTime).toBeLessThan(3000);
      console.log(`Network error handling time: ${errorTime}ms`);
    });
  });

  test.describe('Performance Regression Prevention', () => {
    test('should maintain baseline performance metrics', async ({ page }) => {
      const baselineMetrics = {
        pageLoad: PERFORMANCE_THRESHOLDS.PAGE_LOAD_MAX_MS,
        formInteraction: PERFORMANCE_THRESHOLDS.FORM_INTERACTION_MAX_MS,
        apiResponse: PERFORMANCE_THRESHOLDS.API_RESPONSE_MAX_MS
      };

      // Page load test
      const pageLoadTime = await perfMeasure.measurePageLoad(page, '/custom-agent-builder');
      
      // Form interaction test
      await perfPage.fillFormQuickly();
      const interactionTime = await perfMeasure.measureUserInteraction(page, async () => {
        await page.check('[data-testid="grok-enabled-checkbox"]');
        await page.waitForSelector('h2:has-text("Grok AI Preview")');
      });

      // API response test (mocked)
      await page.route('**/api/agentActions/previewGrokAnalysis', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        await route.fulfill({ status: 200, body: '{"confidence": 95}' });
      });

      const apiTime = await perfMeasure.measureAPICall(
        page,
        'previewGrokAnalysis',
        async () => {
          await page.click('[data-testid="grok-preview-button"]');
          await page.waitForSelector('[data-testid="grok-preview-result"]');
        }
      );

      // All metrics should be within baseline thresholds
      expect(pageLoadTime).toBeLessThan(baselineMetrics.pageLoad);
      expect(interactionTime).toBeLessThan(baselineMetrics.formInteraction);
      expect(apiTime).toBeLessThan(baselineMetrics.apiResponse);

      console.log('Performance Metrics:');
      console.log(`  Page Load: ${pageLoadTime}ms (baseline: ${baselineMetrics.pageLoad}ms)`);
      console.log(`  Form Interaction: ${interactionTime}ms (baseline: ${baselineMetrics.formInteraction}ms)`);
      console.log(`  API Response: ${apiTime}ms (baseline: ${baselineMetrics.apiResponse}ms)`);
    });

    test('should scale performance with form complexity', async ({ page }) => {
      const simpleFormTime = await perfMeasure.measureUserInteraction(page, async () => {
        await page.goto('/custom-agent-builder');
        await page.fill('[data-testid="agent-name-input"]', 'Simple Agent');
        await page.fill('[data-testid="description-textarea"]', 'Simple description');
      });

      const complexFormTime = await perfMeasure.measureUserInteraction(page, async () => {
        await page.reload();
        await perfPage.fillFormQuickly();
        await page.check('[data-testid="grok-enabled-checkbox"]');
        await page.check('[data-testid="oracle-integration-checkbox"]');
        await page.fill('[data-testid="webhook-url-input"]', 'https://example.com/webhook');
        await page.fill('[data-testid="confidence-threshold-input"]', '92.7');
        await page.fill('[data-testid="batch-size-input"]', '2000');
      });

      // Complex form should not be more than 3x slower than simple form
      const performanceRatio = complexFormTime / simpleFormTime;
      expect(performanceRatio).toBeLessThan(3);
      
      console.log(`Performance scaling ratio: ${performanceRatio.toFixed(2)}x`);
      console.log(`Simple form: ${simpleFormTime}ms, Complex form: ${complexFormTime}ms`);
    });
  });
});