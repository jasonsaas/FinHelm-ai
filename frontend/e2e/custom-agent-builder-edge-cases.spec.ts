import { test, expect } from '@playwright/test';
import { Page } from '@playwright/test';

// Edge case test data
const EDGE_CASE_DATA = {
  // Boundary values
  minName: 'Ab',           // Just below minimum length
  maxName: 'A'.repeat(100), // Maximum reasonable length
  emptyName: '',
  whitespaceOnlyName: '   ',
  
  minDescription: 'Short',  // Just below minimum
  maxDescription: 'A'.repeat(2000), // Very long description
  emptyDescription: '',
  whitespaceOnlyDescription: '   \n\t   ',
  
  // Numeric boundaries
  minConfidence: -1,
  maxConfidence: 101,
  zeroConfidence: 0,
  maxValidConfidence: 100,
  floatConfidence: 92.73456,
  
  // Invalid URLs
  invalidUrls: [
    'not-a-url',
    'http://',
    'https://',
    'ftp://example.com',
    'javascript:alert("xss")',
    'data:text/html,<script>alert(1)</script>',
    '',
    '   ',
    'http://localhost:3000', // Localhost might be blocked
  ],
  
  // Valid edge case URLs
  validEdgeUrls: [
    'https://example.com/path/with/many/segments/that/are/very/long',
    'https://subdomain.domain.co.uk:8080/path?query=value&other=param',
    'https://api-staging-v2.finhelm-ai.com/webhooks/anomaly-alerts?token=abc123',
  ],
  
  // Special characters and encoding
  specialChars: {
    name: 'Agent™️ with émojis 🤖 and spéciàl chars',
    description: 'Description with "quotes", <tags>, & special chars: ñáéíóú çüö 中文 العربية 🚀💡',
    webhook: 'https://example.com/webhook?param=value%20with%20spaces&emoji=🎯'
  },
  
  // SQL Injection attempts
  sqlInjection: {
    name: "'; DROP TABLE agents; --",
    description: "1' OR '1'='1; UPDATE agents SET active=false; --",
    webhook: "https://example.com'; DELETE FROM logs; --"
  },
  
  // XSS attempts
  xssAttempts: {
    name: '<script>alert("XSS")</script>',
    description: 'javascript:alert("XSS")',
    webhook: 'javascript:void(document.body.innerHTML="<h1>XSS</h1>")'
  },
  
  // Large batch sizes
  extremeBatchSizes: [-1, 0, 1, 999999999, 'abc', ''],
  
  // Browser-specific edge cases
  veryLongStrings: {
    name: 'A'.repeat(10000),
    description: 'B'.repeat(50000),
    webhook: 'https://example.com/' + 'c'.repeat(2000)
  }
};

class EdgeCaseTestPage {
  constructor(private page: Page) {}

  async navigateToBuilder() {
    await this.page.goto('/custom-agent-builder');
    await this.page.waitForSelector('[data-testid="custom-agent-builder"]');
  }

  async fillMinimalValidForm() {
    await this.page.fill('[data-testid="agent-name-input"]', 'Valid Agent');
    await this.page.fill('[data-testid="description-textarea"]', 'Valid description that meets minimum requirements');
  }

  async getValidationError(field: string): Promise<string | null> {
    const errorSelector = `[data-testid="${field}-error"]`;
    const errorElement = this.page.locator(errorSelector);
    
    try {
      await errorElement.waitFor({ state: 'visible', timeout: 1000 });
      return await errorElement.textContent();
    } catch {
      return null;
    }
  }

  async isFormValid(): Promise<boolean> {
    const deployButton = this.page.locator('[data-testid="deploy-button"]');
    return !(await deployButton.getAttribute('disabled'));
  }

  async clearForm() {
    await this.page.fill('[data-testid="agent-name-input"]', '');
    await this.page.fill('[data-testid="description-textarea"]', '');
    await this.page.fill('[data-testid="webhook-url-input"]', '');
    await this.page.fill('[data-testid="confidence-threshold-input"]', '92.7');
    await this.page.uncheck('[data-testid="grok-enabled-checkbox"]');
  }

  async simulateBrowserRefresh() {
    await this.page.reload();
    await this.page.waitForSelector('[data-testid="custom-agent-builder"]');
  }

  async simulateNetworkDisconnection() {
    await this.page.context().setOffline(true);
  }

  async simulateNetworkReconnection() {
    await this.page.context().setOffline(false);
  }

  async simulateSlowConnection() {
    await this.page.context().route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });
  }
}

test.describe('Custom Agent Builder - Edge Cases', () => {
  let edgeTestPage: EdgeCaseTestPage;

  test.beforeEach(async ({ page }) => {
    edgeTestPage = new EdgeCaseTestPage(page);
    await edgeTestPage.navigateToBuilder();
  });

  test.describe('Input Validation Edge Cases', () => {
    test('should handle minimum length violations', async ({ page }) => {
      await page.fill('[data-testid="agent-name-input"]', EDGE_CASE_DATA.minName);
      await page.fill('[data-testid="description-textarea"]', EDGE_CASE_DATA.minDescription);
      
      await page.waitForTimeout(200); // Allow validation
      
      const nameError = await edgeTestPage.getValidationError('agent-name');
      const descError = await edgeTestPage.getValidationError('description');
      
      expect(nameError).toContain('at least 3 characters');
      expect(descError).toContain('at least 10 characters');
      expect(await edgeTestPage.isFormValid()).toBeFalsy();
    });

    test('should handle empty and whitespace-only inputs', async ({ page }) => {
      // Test empty inputs
      await page.fill('[data-testid="agent-name-input"]', EDGE_CASE_DATA.emptyName);
      await page.fill('[data-testid="description-textarea"]', EDGE_CASE_DATA.emptyDescription);
      
      await page.waitForTimeout(200);
      
      expect(await edgeTestPage.getValidationError('agent-name')).toContain('required');
      expect(await edgeTestPage.getValidationError('description')).toContain('required');
      
      // Test whitespace-only inputs
      await page.fill('[data-testid="agent-name-input"]', EDGE_CASE_DATA.whitespaceOnlyName);
      await page.fill('[data-testid="description-textarea"]', EDGE_CASE_DATA.whitespaceOnlyDescription);
      
      await page.waitForTimeout(200);
      
      // Should still be invalid
      expect(await edgeTestPage.isFormValid()).toBeFalsy();
    });

    test('should handle extremely long inputs gracefully', async ({ page }) => {
      await page.fill('[data-testid="agent-name-input"]', EDGE_CASE_DATA.veryLongStrings.name);
      await page.fill('[data-testid="description-textarea"]', EDGE_CASE_DATA.veryLongStrings.description);
      
      // Should not crash the browser or UI
      await expect(page.locator('[data-testid="agent-name-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="description-textarea"]')).toBeVisible();
      
      // Input should be truncated or handled appropriately
      const nameValue = await page.locator('[data-testid="agent-name-input"]').inputValue();
      const descValue = await page.locator('[data-testid="description-textarea"]').inputValue();
      
      // Should not be empty (some handling should occur)
      expect(nameValue.length).toBeGreaterThan(0);
      expect(descValue.length).toBeGreaterThan(0);
    });

    test('should validate confidence threshold boundaries', async ({ page }) => {
      await edgeTestPage.fillMinimalValidForm();
      
      // Test negative value
      await page.fill('[data-testid="confidence-threshold-input"]', EDGE_CASE_DATA.minConfidence.toString());
      await page.waitForTimeout(200);
      expect(await edgeTestPage.getValidationError('confidence-threshold')).toContain('between 0 and 100');
      
      // Test over 100
      await page.fill('[data-testid="confidence-threshold-input"]', EDGE_CASE_DATA.maxConfidence.toString());
      await page.waitForTimeout(200);
      expect(await edgeTestPage.getValidationError('confidence-threshold')).toContain('between 0 and 100');
      
      // Test zero (should be valid)
      await page.fill('[data-testid="confidence-threshold-input"]', EDGE_CASE_DATA.zeroConfidence.toString());
      await page.waitForTimeout(200);
      expect(await edgeTestPage.getValidationError('confidence-threshold')).toBeNull();
      
      // Test maximum valid value
      await page.fill('[data-testid="confidence-threshold-input"]', EDGE_CASE_DATA.maxValidConfidence.toString());
      await page.waitForTimeout(200);
      expect(await edgeTestPage.getValidationError('confidence-threshold')).toBeNull();
      
      // Test float precision
      await page.fill('[data-testid="confidence-threshold-input"]', EDGE_CASE_DATA.floatConfidence.toString());
      await page.waitForTimeout(200);
      expect(await edgeTestPage.getValidationError('confidence-threshold')).toBeNull();
    });

    test('should validate batch size edge cases', async ({ page }) => {
      await edgeTestPage.fillMinimalValidForm();
      
      for (const batchSize of EDGE_CASE_DATA.extremeBatchSizes) {
        await page.fill('[data-testid="batch-size-input"]', batchSize.toString());
        await page.waitForTimeout(100);
        
        // Very large or invalid values should be handled gracefully
        const inputValue = await page.locator('[data-testid="batch-size-input"]').inputValue();
        
        if (typeof batchSize === 'number' && batchSize > 0) {
          expect(inputValue).toBe(batchSize.toString());
        } else {
          // Invalid inputs should be rejected or corrected
          expect(inputValue).not.toBe(batchSize.toString());
        }
      }
    });
  });

  test.describe('URL Validation Edge Cases', () => {
    test.beforeEach(async ({ page }) => {
      await edgeTestPage.fillMinimalValidForm();
    });

    test('should reject invalid URL formats', async ({ page }) => {
      for (const invalidUrl of EDGE_CASE_DATA.invalidUrls) {
        await page.fill('[data-testid="webhook-url-input"]', invalidUrl);
        await page.waitForTimeout(200);
        
        if (invalidUrl.trim() !== '') {
          const error = await edgeTestPage.getValidationError('webhook');
          expect(error).toContain('Invalid webhook URL');
        }
        
        // Clear for next test
        await page.fill('[data-testid="webhook-url-input"]', '');
      }
    });

    test('should accept valid edge case URLs', async ({ page }) => {
      for (const validUrl of EDGE_CASE_DATA.validEdgeUrls) {
        await page.fill('[data-testid="webhook-url-input"]', validUrl);
        await page.waitForTimeout(200);
        
        const error = await edgeTestPage.getValidationError('webhook');
        expect(error).toBeNull();
      }
    });

    test('should handle extremely long URLs', async ({ page }) => {
      await page.fill('[data-testid="webhook-url-input"]', EDGE_CASE_DATA.veryLongStrings.webhook);
      
      // Should not crash
      await expect(page.locator('[data-testid="webhook-url-input"]')).toBeVisible();
      
      // Might be truncated or handled appropriately
      const inputValue = await page.locator('[data-testid="webhook-url-input"]').inputValue();
      expect(inputValue.length).toBeGreaterThan(0);
    });
  });

  test.describe('Special Character and Encoding Edge Cases', () => {
    test('should handle Unicode and special characters', async ({ page }) => {
      await page.fill('[data-testid="agent-name-input"]', EDGE_CASE_DATA.specialChars.name);
      await page.fill('[data-testid="description-textarea"]', EDGE_CASE_DATA.specialChars.description);
      await page.fill('[data-testid="webhook-url-input"]', EDGE_CASE_DATA.specialChars.webhook);
      
      // Should not crash or break the UI
      await expect(page.locator('[data-testid="custom-agent-builder"]')).toBeVisible();
      
      // Values should be preserved correctly
      const nameValue = await page.locator('[data-testid="agent-name-input"]').inputValue();
      const descValue = await page.locator('[data-testid="description-textarea"]').inputValue();
      
      expect(nameValue).toContain('™️');
      expect(nameValue).toContain('🤖');
      expect(descValue).toContain('中文');
      expect(descValue).toContain('🚀');
    });

    test('should sanitize potentially dangerous inputs', async ({ page }) => {
      // Test SQL injection attempts
      await page.fill('[data-testid="agent-name-input"]', EDGE_CASE_DATA.sqlInjection.name);
      await page.fill('[data-testid="description-textarea"]', EDGE_CASE_DATA.sqlInjection.description);
      
      // Should not execute any malicious code
      await expect(page.locator('[data-testid="custom-agent-builder"]')).toBeVisible();
      
      // Values should be sanitized or rejected
      const nameValue = await page.locator('[data-testid="agent-name-input"]').inputValue();
      const descValue = await page.locator('[data-testid="description-textarea"]').inputValue();
      
      // Should not contain the exact malicious strings
      expect(nameValue).not.toContain('DROP TABLE');
      expect(descValue).not.toContain("1'='1");
    });

    test('should prevent XSS attacks', async ({ page }) => {
      await page.fill('[data-testid="agent-name-input"]', EDGE_CASE_DATA.xssAttempts.name);
      await page.fill('[data-testid="description-textarea"]', EDGE_CASE_DATA.xssAttempts.description);
      
      // Should not execute any scripts
      await expect(page.locator('[data-testid="custom-agent-builder"]')).toBeVisible();
      
      // No alert dialogs should appear
      let alertFired = false;
      page.on('dialog', async (dialog) => {
        alertFired = true;
        await dialog.accept();
      });
      
      await page.waitForTimeout(1000);
      expect(alertFired).toBeFalsy();
      
      // Script tags should be escaped or removed
      const nameValue = await page.locator('[data-testid="agent-name-input"]').inputValue();
      expect(nameValue).not.toContain('<script>');
    });
  });

  test.describe('Browser and Environment Edge Cases', () => {
    test('should handle page refresh gracefully', async ({ page }) => {
      // Fill form
      await edgeTestPage.fillMinimalValidForm();
      await page.check('[data-testid="grok-enabled-checkbox"]');
      
      // Refresh page
      await edgeTestPage.simulateBrowserRefresh();
      
      // Form should be reset to initial state
      const nameValue = await page.locator('[data-testid="agent-name-input"]').inputValue();
      const isGrokEnabled = await page.locator('[data-testid="grok-enabled-checkbox"]').isChecked();
      
      expect(nameValue).toBe('');
      expect(isGrokEnabled).toBeFalsy();
    });

    test('should handle network disconnection', async ({ page }) => {
      await edgeTestPage.fillMinimalValidForm();
      
      // Simulate network disconnection
      await edgeTestPage.simulateNetworkDisconnection();
      
      // Try to deploy
      await page.click('[data-testid="deploy-button"]');
      
      // Should handle gracefully (might show error or stay in loading state)
      await page.waitForTimeout(2000);
      
      // UI should still be responsive
      await expect(page.locator('[data-testid="custom-agent-builder"]')).toBeVisible();
      
      // Reconnect
      await edgeTestPage.simulateNetworkReconnection();
    });

    test('should handle rapid form interactions', async ({ page }) => {
      // Simulate very rapid user interactions
      for (let i = 0; i < 20; i++) {
        await page.fill('[data-testid="agent-name-input"]', `Agent ${i}`);
        await page.selectOption('[data-testid="agent-type-select"]', i % 2 === 0 ? 'anomaly' : 'reconciliation');
        
        if (i % 3 === 0) {
          await page.check('[data-testid="grok-enabled-checkbox"]');
        } else {
          await page.uncheck('[data-testid="grok-enabled-checkbox"]');
        }
        
        // No delay - rapid interactions
      }
      
      // Should not crash or become unresponsive
      await expect(page.locator('[data-testid="custom-agent-builder"]')).toBeVisible();
      
      // Final form state should be consistent
      const finalName = await page.locator('[data-testid="agent-name-input"]').inputValue();
      expect(finalName).toContain('Agent');
    });

    test('should handle concurrent API requests', async ({ page }) => {
      await edgeTestPage.fillMinimalValidForm();
      await page.check('[data-testid="grok-enabled-checkbox"]');
      
      // Mock API to add delay
      let requestCount = 0;
      await page.route('**/api/agentActions/**', async (route) => {
        requestCount++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, id: requestCount })
        });
      });
      
      // Trigger multiple rapid requests
      await Promise.all([
        page.click('[data-testid="grok-preview-button"]'),
        page.click('[data-testid="test-config-button"]'),
        // Note: deploy button might be disabled after first click
      ]);
      
      // Should handle concurrent requests gracefully
      await page.waitForTimeout(3000);
      
      // UI should still be functional
      await expect(page.locator('[data-testid="custom-agent-builder"]')).toBeVisible();
    });

    test('should handle browser tab switching', async ({ page, context }) => {
      await edgeTestPage.fillMinimalValidForm();
      
      // Open another tab
      const secondTab = await context.newPage();
      await secondTab.goto('/custom-agent-builder');
      
      // Fill form in second tab
      await secondTab.fill('[data-testid="agent-name-input"]', 'Second Tab Agent');
      
      // Switch back to first tab
      await page.bringToFront();
      
      // Original form should be unchanged
      const originalName = await page.locator('[data-testid="agent-name-input"]').inputValue();
      expect(originalName).toBe('Valid Agent');
      expect(originalName).not.toBe('Second Tab Agent');
      
      await secondTab.close();
    });

    test('should handle memory pressure', async ({ page }) => {
      // Create many DOM elements to simulate memory pressure
      await page.evaluate(() => {
        const elements = [];
        for (let i = 0; i < 1000; i++) {
          const div = document.createElement('div');
          div.innerHTML = `<span>Element ${i}</span>`.repeat(10);
          elements.push(div);
        }
        // Don't add to DOM to avoid visual impact, just keep in memory
        (window as any).testElements = elements;
      });
      
      await edgeTestPage.fillMinimalValidForm();
      
      // Form should still function normally
      await page.check('[data-testid="grok-enabled-checkbox"]');
      expect(await edgeTestPage.isFormValid()).toBeTruthy();
      
      // Clean up
      await page.evaluate(() => {
        delete (window as any).testElements;
      });
    });
  });

  test.describe('State Management Edge Cases', () => {
    test('should handle invalid state transitions', async ({ page }) => {
      // Mock API to return different states
      let callCount = 0;
      await page.route('**/api/agentActions/**', async (route) => {
        callCount++;
        
        if (callCount === 1) {
          // First call succeeds
          await route.fulfill({
            status: 200,
            body: JSON.stringify({ status: 'valid' })
          });
        } else {
          // Subsequent calls fail
          await route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Service unavailable' })
          });
        }
      });
      
      await edgeTestPage.fillMinimalValidForm();
      
      // First operation succeeds
      await page.click('[data-testid="test-config-button"]');
      await page.waitForSelector('[data-testid="deployment-status"]');
      
      // Second operation fails
      await page.click('[data-testid="test-config-button"]');
      
      // Should handle state transition gracefully
      await page.waitForTimeout(1000);
      await expect(page.locator('[data-testid="custom-agent-builder"]')).toBeVisible();
    });

    test('should handle form state persistence edge cases', async ({ page }) => {
      // Fill form completely
      await page.fill('[data-testid="agent-name-input"]', 'Persistence Test Agent');
      await page.fill('[data-testid="description-textarea"]', 'Testing form state persistence');
      await page.fill('[data-testid="confidence-threshold-input"]', '95.5');
      await page.check('[data-testid="grok-enabled-checkbox"]');
      await page.selectOption('[data-testid="agent-type-select"]', 'reconciliation');
      
      // Navigate away and back (if using client-side routing)
      await page.evaluate(() => {
        window.history.pushState({}, '', '/other-page');
        window.history.back();
      });
      
      await page.waitForTimeout(500);
      
      // In a real SPA, form might preserve state, but in this case it will likely reset
      // The behavior depends on the routing implementation
      await expect(page.locator('[data-testid="custom-agent-builder"]')).toBeVisible();
    });
  });

  test.describe('Accessibility Edge Cases', () => {
    test('should handle keyboard navigation edge cases', async ({ page }) => {
      // Navigate using only keyboard
      await page.keyboard.press('Tab'); // Focus first input
      await page.keyboard.type('Keyboard Nav Agent');
      
      await page.keyboard.press('Tab'); // Move to select
      await page.keyboard.press('ArrowDown'); // Change selection
      
      await page.keyboard.press('Tab'); // Move to textarea
      await page.keyboard.type('Description via keyboard navigation');
      
      // Continue tabbing through all elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
      }
      
      // Should not get trapped or break navigation
      const activeElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeElement).toBeTruthy();
    });

    test('should handle screen reader simulation', async ({ page }) => {
      // Check ARIA attributes exist
      const nameInput = page.locator('[data-testid="agent-name-input"]');
      const nameLabel = page.locator('label[for="agent-name"]');
      
      await expect(nameLabel).toBeVisible();
      
      // Check required field indicators
      await expect(nameLabel).toContainText('*');
      
      // Ensure error messages are associated with inputs
      await page.fill('[data-testid="agent-name-input"]', 'AB');
      await page.waitForTimeout(200);
      
      const errorMessage = page.locator('[data-testid="agent-name-error"]');
      if (await errorMessage.isVisible()) {
        // Should have proper ARIA relationship
        await expect(errorMessage).toBeVisible();
      }
    });
  });
});