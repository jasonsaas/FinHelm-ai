import { test, expect } from '@playwright/test';
import { Page } from '@playwright/test';

// Mock Grok API responses for testing
const MOCK_GROK_RESPONSES = {
  anomaly: {
    success: {
      confidence: 94.2,
      anomalies: [
        {
          id: 'anom_001',
          type: 'statistical_outlier',
          severity: 'high',
          description: 'Transaction amount $10,000 exceeds 3-sigma threshold',
          drivers: ['amount_deviation', 'frequency_pattern'],
          subledger: 'accounts_payable',
          explanation: 'This transaction represents a 400% increase from the historical average for this vendor category.',
          confidence: 96.5,
          metadata: {
            historical_avg: 2500,
            current_amount: 10000,
            z_score: 4.2,
            vendor_category: 'office_supplies'
          }
        }
      ],
      analysis: {
        total_transactions: 1000,
        anomalies_detected: 12,
        confidence_distribution: {
          'high_confidence': 8,
          'medium_confidence': 3,
          'low_confidence': 1
        },
        processing_time_ms: 1847
      }
    },
    error: {
      error: 'Grok API rate limit exceeded',
      message: 'Too many requests. Please try again in 60 seconds.',
      retry_after: 60
    },
    timeout: {
      error: 'Analysis timeout',
      message: 'Grok analysis took longer than expected',
      partial_results: true
    }
  },
  reconciliation: {
    success: {
      confidence: 92.8,
      matches: [
        {
          source_id: 'src_001',
          target_id: 'tgt_001',
          match_confidence: 98.5,
          similarity_scores: {
            name: 95.2,
            amount: 100.0,
            date: 88.7,
            reference: 92.1
          },
          explanation: 'High confidence match based on exact amount and strong name similarity using Levenshtein distance.'
        }
      ],
      analysis: {
        total_records: 500,
        matched_records: 487,
        match_rate: 97.4,
        fuzzy_matches: 23,
        exact_matches: 464
      }
    }
  },
  erpAuth: {
    success: {
      confidence: 99.1,
      oauth_status: {
        sage_intacct: 'connected',
        quickbooks: 'fallback_ready',
        token_validity: 'valid',
        refresh_needed: false
      },
      analysis: {
        auth_flow_health: 'excellent',
        token_expiry: '2024-08-30T10:30:00Z',
        last_refresh: '2024-08-25T09:15:00Z',
        api_endpoints_tested: 12,
        success_rate: 100.0
      }
    }
  }
};

class GrokPreviewPage {
  constructor(private page: Page) {}

  async navigateToBuilder() {
    await this.page.goto('/custom-agent-builder');
    await this.page.waitForSelector('[data-testid="custom-agent-builder"]');
  }

  async enableGrok() {
    await this.page.check('[data-testid="grok-enabled-checkbox"]');
    await expect(this.page.locator('[data-testid="grok-enabled-checkbox"]')).toBeChecked();
  }

  async disableGrok() {
    await this.page.uncheck('[data-testid="grok-enabled-checkbox"]');
    await expect(this.page.locator('[data-testid="grok-enabled-checkbox"]')).not.toBeChecked();
  }

  async selectAgentType(type: 'anomaly' | 'reconciliation' | 'erp-auth' | 'custom') {
    await this.page.selectOption('[data-testid="agent-type-select"]', type);
  }

  async triggerGrokPreview() {
    await this.page.click('[data-testid="grok-preview-button"]');
  }

  async waitForGrokPreviewLoading() {
    await expect(this.page.locator('[data-testid="grok-preview-loading"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="grok-preview-button"]')).toContainText('Generating...');
    await expect(this.page.locator('[data-testid="grok-preview-button"]')).toBeDisabled();
  }

  async waitForGrokPreviewResult() {
    await expect(this.page.locator('[data-testid="grok-preview-result"]')).toBeVisible({ timeout: 10000 });
  }

  async waitForGrokPreviewError() {
    await expect(this.page.locator('[data-testid="grok-preview-error"]')).toBeVisible({ timeout: 10000 });
  }

  async getGrokPreviewResult(): Promise<any> {
    const resultElement = this.page.locator('[data-testid="grok-preview-result"] pre');
    const resultText = await resultElement.textContent();
    return resultText ? JSON.parse(resultText) : null;
  }

  async getGrokPreviewError(): Promise<string | null> {
    const errorElement = this.page.locator('[data-testid="grok-preview-error"] p');
    return await errorElement.textContent();
  }

  async isGrokSectionVisible(): Promise<boolean> {
    return await this.page.locator('[data-testid="grok-enabled-checkbox"]').isChecked();
  }

  async fillBasicForm() {
    await this.page.fill('[data-testid="agent-name-input"]', 'Test Grok Agent');
    await this.page.fill('[data-testid="description-textarea"]', 'Agent for testing Grok preview functionality');
  }
}

test.describe('Custom Agent Builder - Grok Preview', () => {
  let grokPage: GrokPreviewPage;

  test.beforeEach(async ({ page }) => {
    grokPage = new GrokPreviewPage(page);
    await grokPage.navigateToBuilder();
  });

  test.describe('Grok Preview UI', () => {
    test('should show Grok preview section only when enabled', async ({ page }) => {
      // Initially, Grok section should not be visible (checkbox unchecked by default in some states)
      await grokPage.enableGrok();
      
      // Grok preview section should now be visible
      await expect(page.locator('h2')).toContainText('Grok AI Preview');
      await expect(page.locator('[data-testid="grok-preview-button"]')).toBeVisible();
    });

    test('should hide Grok preview section when disabled', async ({ page }) => {
      // Enable first, then disable
      await grokPage.enableGrok();
      await grokPage.disableGrok();
      
      // Grok preview section should be hidden
      await expect(page.locator('[data-testid="grok-preview-button"]')).not.toBeVisible();
    });

    test('should maintain Grok state when switching agent types', async ({ page }) => {
      await grokPage.enableGrok();
      await grokPage.selectAgentType('anomaly');
      
      // Switch to different agent type
      await grokPage.selectAgentType('reconciliation');
      
      // Grok should still be enabled
      await expect(page.locator('[data-testid="grok-enabled-checkbox"]')).toBeChecked();
      await expect(page.locator('[data-testid="grok-preview-button"]')).toBeVisible();
    });
  });

  test.describe('Grok Preview Functionality - Anomaly Agent', () => {
    test.beforeEach(async ({ page }) => {
      await grokPage.fillBasicForm();
      await grokPage.selectAgentType('anomaly');
      await grokPage.enableGrok();
    });

    test('should successfully generate anomaly detection preview', async ({ page }) => {
      // Mock successful Grok API response
      await page.route('**/api/agentActions/previewGrokAnalysis', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_GROK_RESPONSES.anomaly.success)
        });
      });

      const startTime = Date.now();
      
      await grokPage.triggerGrokPreview();
      await grokPage.waitForGrokPreviewLoading();
      await grokPage.waitForGrokPreviewResult();
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // Meet <2s requirement

      // Verify the preview result structure
      const result = await grokPage.getGrokPreviewResult();
      expect(result.confidence).toBe(94.2);
      expect(result.anomalies).toHaveLength(1);
      expect(result.anomalies[0].drivers).toContain('amount_deviation');
      expect(result.analysis.processing_time_ms).toBeLessThan(2000);
    });

    test('should show detailed anomaly explanation', async ({ page }) => {
      await page.route('**/api/agentActions/previewGrokAnalysis', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_GROK_RESPONSES.anomaly.success)
        });
      });

      await grokPage.triggerGrokPreview();
      await grokPage.waitForGrokPreviewResult();

      // Check for detailed anomaly information in the preview
      const resultElement = page.locator('[data-testid="grok-preview-result"]');
      await expect(resultElement).toContainText('statistical_outlier');
      await expect(resultElement).toContainText('accounts_payable');
      await expect(resultElement).toContainText('3-sigma threshold');
    });

    test('should handle confidence threshold configuration in preview', async ({ page }) => {
      // Set custom confidence threshold
      await page.fill('[data-testid="confidence-threshold-input"]', '95.0');
      
      await page.route('**/api/agentActions/previewGrokAnalysis', async (route) => {
        const request = await route.request();
        const postData = request.postData();
        const requestBody = postData ? JSON.parse(postData) : {};
        
        // Verify confidence threshold is passed correctly
        expect(requestBody.confidenceThreshold).toBe(95.0);
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_GROK_RESPONSES.anomaly.success)
        });
      });

      await grokPage.triggerGrokPreview();
      await grokPage.waitForGrokPreviewResult();
    });
  });

  test.describe('Grok Preview Functionality - Reconciliation Agent', () => {
    test.beforeEach(async ({ page }) => {
      await grokPage.fillBasicForm();
      await grokPage.selectAgentType('reconciliation');
      await grokPage.enableGrok();
    });

    test('should generate reconciliation preview with fuzzy matching results', async ({ page }) => {
      await page.route('**/api/agentActions/previewGrokAnalysis', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_GROK_RESPONSES.reconciliation.success)
        });
      });

      await grokPage.triggerGrokPreview();
      await grokPage.waitForGrokPreviewResult();

      // Verify reconciliation-specific data
      const result = await grokPage.getGrokPreviewResult();
      expect(result.confidence).toBe(92.8);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].similarity_scores.amount).toBe(100.0);
      expect(result.analysis.match_rate).toBe(97.4);
    });

    test('should show similarity scores breakdown', async ({ page }) => {
      await page.route('**/api/agentActions/previewGrokAnalysis', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_GROK_RESPONSES.reconciliation.success)
        });
      });

      await grokPage.triggerGrokPreview();
      await grokPage.waitForGrokPreviewResult();

      const resultElement = page.locator('[data-testid="grok-preview-result"]');
      await expect(resultElement).toContainText('similarity_scores');
      await expect(resultElement).toContainText('Levenshtein distance');
    });
  });

  test.describe('Grok Preview Functionality - ERP Auth Agent', () => {
    test.beforeEach(async ({ page }) => {
      await grokPage.fillBasicForm();
      await grokPage.selectAgentType('erp-auth');
      await grokPage.enableGrok();
    });

    test('should generate ERP authentication status preview', async ({ page }) => {
      await page.route('**/api/agentActions/previewGrokAnalysis', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_GROK_RESPONSES.erpAuth.success)
        });
      });

      await grokPage.triggerGrokPreview();
      await grokPage.waitForGrokPreviewResult();

      const result = await grokPage.getGrokPreviewResult();
      expect(result.confidence).toBe(99.1);
      expect(result.oauth_status.sage_intacct).toBe('connected');
      expect(result.oauth_status.quickbooks).toBe('fallback_ready');
      expect(result.analysis.success_rate).toBe(100.0);
    });

    test('should show OAuth token status information', async ({ page }) => {
      await page.route('**/api/agentActions/previewGrokAnalysis', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_GROK_RESPONSES.erpAuth.success)
        });
      });

      await grokPage.triggerGrokPreview();
      await grokPage.waitForGrokPreviewResult();

      const resultElement = page.locator('[data-testid="grok-preview-result"]');
      await expect(resultElement).toContainText('token_validity');
      await expect(resultElement).toContainText('sage_intacct');
      await expect(resultElement).toContainText('quickbooks');
    });
  });

  test.describe('Grok Preview Error Handling', () => {
    test.beforeEach(async ({ page }) => {
      await grokPage.fillBasicForm();
      await grokPage.selectAgentType('anomaly');
      await grokPage.enableGrok();
    });

    test('should handle Grok API rate limiting gracefully', async ({ page }) => {
      await page.route('**/api/agentActions/previewGrokAnalysis', async (route) => {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_GROK_RESPONSES.anomaly.error)
        });
      });

      await grokPage.triggerGrokPreview();
      await grokPage.waitForGrokPreviewError();

      const errorMessage = await grokPage.getGrokPreviewError();
      expect(errorMessage).toContain('rate limit exceeded');
      expect(errorMessage).toContain('60 seconds');
    });

    test('should handle Grok API timeout errors', async ({ page }) => {
      await page.route('**/api/agentActions/previewGrokAnalysis', async (route) => {
        await route.fulfill({
          status: 408,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_GROK_RESPONSES.anomaly.timeout)
        });
      });

      await grokPage.triggerGrokPreview();
      await grokPage.waitForGrokPreviewError();

      const errorMessage = await grokPage.getGrokPreviewError();
      expect(errorMessage).toContain('Analysis timeout');
    });

    test('should handle network connectivity issues', async ({ page }) => {
      await page.route('**/api/agentActions/previewGrokAnalysis', async (route) => {
        await route.abort('failed');
      });

      await grokPage.triggerGrokPreview();
      await grokPage.waitForGrokPreviewError();

      const errorMessage = await grokPage.getGrokPreviewError();
      expect(errorMessage).toContain('Preview failed');
    });

    test('should recover from errors and allow retry', async ({ page }) => {
      let requestCount = 0;
      
      await page.route('**/api/agentActions/previewGrokAnalysis', async (route) => {
        requestCount++;
        if (requestCount === 1) {
          // First request fails
          await route.abort('failed');
        } else {
          // Second request succeeds
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_GROK_RESPONSES.anomaly.success)
          });
        }
      });

      // First attempt fails
      await grokPage.triggerGrokPreview();
      await grokPage.waitForGrokPreviewError();

      // Retry should succeed
      await grokPage.triggerGrokPreview();
      await grokPage.waitForGrokPreviewResult();

      expect(requestCount).toBe(2);
    });
  });

  test.describe('Grok Preview Performance', () => {
    test('should complete preview within 2 seconds', async ({ page }) => {
      await grokPage.fillBasicForm();
      await grokPage.selectAgentType('anomaly');
      await grokPage.enableGrok();

      await page.route('**/api/agentActions/previewGrokAnalysis', async (route) => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_GROK_RESPONSES.anomaly.success)
        });
      });

      const startTime = Date.now();
      await grokPage.triggerGrokPreview();
      await grokPage.waitForGrokPreviewResult();
      
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(2000);
    });

    test('should handle multiple rapid preview requests', async ({ page }) => {
      await grokPage.fillBasicForm();
      await grokPage.selectAgentType('anomaly');
      await grokPage.enableGrok();

      let requestCount = 0;
      await page.route('**/api/agentActions/previewGrokAnalysis', async (route) => {
        requestCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_GROK_RESPONSES.anomaly.success)
        });
      });

      // Trigger multiple rapid requests
      await grokPage.triggerGrokPreview();
      await page.waitForTimeout(100);
      await grokPage.triggerGrokPreview();
      await page.waitForTimeout(100);
      await grokPage.triggerGrokPreview();

      // Wait for completion
      await grokPage.waitForGrokPreviewResult();

      // Should handle gracefully (implementation may vary - either queue or ignore additional requests)
      expect(requestCount).toBeGreaterThan(0);
    });

    test('should show appropriate loading indicators during preview', async ({ page }) => {
      await grokPage.fillBasicForm();
      await grokPage.selectAgentType('anomaly');
      await grokPage.enableGrok();

      await page.route('**/api/agentActions/previewGrokAnalysis', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_GROK_RESPONSES.anomaly.success)
        });
      });

      await grokPage.triggerGrokPreview();
      
      // Verify loading state
      await grokPage.waitForGrokPreviewLoading();
      
      // Verify loading completes
      await grokPage.waitForGrokPreviewResult();
      
      // Loading indicator should be gone
      await expect(page.locator('[data-testid="grok-preview-loading"]')).not.toBeVisible();
    });
  });

  test.describe('Grok Preview Integration', () => {
    test('should pass correct sample data for each agent type', async ({ page }) => {
      const agentTypes: Array<'anomaly' | 'reconciliation' | 'erp-auth'> = ['anomaly', 'reconciliation', 'erp-auth'];
      
      for (const agentType of agentTypes) {
        await grokPage.fillBasicForm();
        await grokPage.selectAgentType(agentType);
        await grokPage.enableGrok();

        await page.route('**/api/agentActions/previewGrokAnalysis', async (route) => {
          const request = await route.request();
          const postData = request.postData();
          const requestBody = postData ? JSON.parse(postData) : {};
          
          expect(requestBody.agentType).toBe(agentType);
          expect(requestBody.sampleData).toBeDefined();
          
          // Verify agent-specific sample data structure
          if (agentType === 'anomaly') {
            expect(requestBody.sampleData.transactions).toBeDefined();
          } else if (agentType === 'reconciliation') {
            expect(requestBody.sampleData.sourceData).toBeDefined();
            expect(requestBody.sampleData.targetData).toBeDefined();
          }

          const mockResponse = MOCK_GROK_RESPONSES[agentType].success;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockResponse)
          });
        });

        await grokPage.triggerGrokPreview();
        await grokPage.waitForGrokPreviewResult();
        
        // Clear for next iteration
        await page.reload();
        grokPage = new GrokPreviewPage(page);
      }
    });

    test('should display formatted Grok results appropriately', async ({ page }) => {
      await grokPage.fillBasicForm();
      await grokPage.selectAgentType('anomaly');
      await grokPage.enableGrok();

      await page.route('**/api/agentActions/previewGrokAnalysis', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_GROK_RESPONSES.anomaly.success)
        });
      });

      await grokPage.triggerGrokPreview();
      await grokPage.waitForGrokPreviewResult();

      // Check that JSON is properly formatted
      const preElement = page.locator('[data-testid="grok-preview-result"] pre');
      const preText = await preElement.textContent();
      
      // Should be valid JSON
      expect(() => JSON.parse(preText || '')).not.toThrow();
      
      // Should be pretty-printed (contain newlines and indentation)
      expect(preText).toContain('\n');
      expect(preText).toContain('  '); // Indentation
    });
  });
});