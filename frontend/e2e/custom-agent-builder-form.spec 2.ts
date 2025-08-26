import { test, expect } from '@playwright/test';
import { Page } from '@playwright/test';

// Test data constants
const VALID_AGENT_CONFIG = {
  name: 'Test Anomaly Agent',
  type: 'anomaly',
  description: 'A test agent for detecting financial anomalies in transaction data',
  confidenceThreshold: 92.7,
  batchSize: 1000,
  analysisType: 'comprehensive',
  notificationThreshold: 85.0,
  webhookUrl: 'https://webhook.site/test-endpoint',
};

const EDGE_CASE_DATA = {
  longName: 'A'.repeat(100),
  shortName: 'AB',
  longDescription: 'This is a very long description that exceeds normal limits and should be tested for proper handling and validation to ensure the form behaves correctly when users input excessive amounts of text that might break the UI or validation logic.',
  shortDescription: 'Short',
  invalidWebhook: 'not-a-valid-url',
  extremeThreshold: 150,
  negativeThreshold: -10,
};

class CustomAgentBuilderPage {
  constructor(private page: Page) {}

  async navigateToBuilder() {
    await this.page.goto('/custom-agent-builder');
    await this.page.waitForSelector('[data-testid="custom-agent-builder"]');
  }

  async fillBasicConfig(config: typeof VALID_AGENT_CONFIG) {
    await this.page.fill('[data-testid="agent-name-input"]', config.name);
    await this.page.selectOption('[data-testid="agent-type-select"]', config.type);
    await this.page.fill('[data-testid="description-textarea"]', config.description);
  }

  async fillAdvancedSettings(config: typeof VALID_AGENT_CONFIG) {
    await this.page.fill('[data-testid="confidence-threshold-input"]', config.confidenceThreshold.toString());
    await this.page.fill('[data-testid="batch-size-input"]', config.batchSize.toString());
    await this.page.selectOption('[data-testid="analysis-type-select"]', config.analysisType);
  }

  async configureNotifications(config: typeof VALID_AGENT_CONFIG) {
    await this.page.fill('[data-testid="notification-threshold-input"]', config.notificationThreshold.toString());
    if (config.webhookUrl) {
      await this.page.fill('[data-testid="webhook-url-input"]', config.webhookUrl);
    }
  }

  async enableGrok() {
    await this.page.check('[data-testid="grok-enabled-checkbox"]');
  }

  async enableTestMode() {
    await this.page.check('[data-testid="test-mode-checkbox"]');
  }

  async submitForm() {
    await this.page.click('[data-testid="deploy-button"]');
  }

  async testConfiguration() {
    await this.page.click('[data-testid="test-config-button"]');
  }

  async waitForDeploymentStatus(expectedStatus: 'deploying' | 'deployed' | 'failed', timeout = 10000) {
    await this.page.waitForSelector('[data-testid="deployment-status"]', { timeout });
    
    if (expectedStatus === 'deploying') {
      await expect(this.page.locator('[data-testid="deployment-spinner"]')).toBeVisible();
    }
  }

  async getValidationError(field: string): Promise<string | null> {
    const errorSelector = `[data-testid="${field}-error"]`;
    const errorElement = this.page.locator(errorSelector);
    
    if (await errorElement.isVisible()) {
      return await errorElement.textContent();
    }
    return null;
  }

  async isFormValid(): Promise<boolean> {
    const deployButton = this.page.locator('[data-testid="deploy-button"]');
    return !(await deployButton.getAttribute('disabled'));
  }
}

test.describe('Custom Agent Builder - Form Submission', () => {
  let builderPage: CustomAgentBuilderPage;

  test.beforeEach(async ({ page }) => {
    builderPage = new CustomAgentBuilderPage(page);
    await builderPage.navigateToBuilder();
  });

  test.describe('Valid Form Submissions', () => {
    test('should successfully submit a complete anomaly agent configuration', async ({ page }) => {
      const startTime = Date.now();
      
      // Fill out the form
      await builderPage.fillBasicConfig(VALID_AGENT_CONFIG);
      await builderPage.fillAdvancedSettings(VALID_AGENT_CONFIG);
      await builderPage.configureNotifications(VALID_AGENT_CONFIG);
      await builderPage.enableGrok();
      await builderPage.enableTestMode();

      // Verify form is valid
      expect(await builderPage.isFormValid()).toBeTruthy();

      // Submit form
      await builderPage.submitForm();

      // Check deployment starts
      await builderPage.waitForDeploymentStatus('deploying');
      
      // Verify performance requirement (<2s for form interaction)
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(2000);

      // Wait for completion (in a real app, this would succeed)
      await expect(page.locator('[data-testid="deployment-status"]')).toContainText('Validating configuration');
    });

    test('should handle reconciliation agent type correctly', async ({ page }) => {
      const reconciliationConfig = {
        ...VALID_AGENT_CONFIG,
        type: 'reconciliation',
        name: 'Data Reconciliation Agent',
        description: 'Agent for reconciling financial data between systems with fuzzy matching',
      };

      await builderPage.fillBasicConfig(reconciliationConfig);
      await page.check('[data-testid="test-mode-checkbox"]');
      
      // Verify form accepts reconciliation type
      await page.selectOption('[data-testid="agent-type-select"]', 'reconciliation');
      expect(await page.locator('[data-testid="agent-type-select"]').inputValue()).toBe('reconciliation');
      
      await builderPage.testConfiguration();
      await builderPage.waitForDeploymentStatus('deploying');
    });

    test('should handle ERP auth agent type', async ({ page }) => {
      const erpConfig = {
        ...VALID_AGENT_CONFIG,
        type: 'erp-auth',
        name: 'ERP Authentication Agent',
        description: 'Agent for managing OAuth2 authentication with Sage Intacct and QuickBooks',
      };

      await builderPage.fillBasicConfig(erpConfig);
      await builderPage.enableTestMode();
      
      expect(await builderPage.isFormValid()).toBeTruthy();
      await builderPage.submitForm();
      await builderPage.waitForDeploymentStatus('deploying');
    });
  });

  test.describe('Form Validation', () => {
    test('should show validation errors for empty required fields', async ({ page }) => {
      // Try to submit without filling required fields
      await builderPage.submitForm();
      
      // Check validation errors appear
      expect(await builderPage.getValidationError('agent-name')).toBe('Agent name is required');
      expect(await builderPage.getValidationError('description')).toBe('Description is required');
      
      // Form should not be valid
      expect(await builderPage.isFormValid()).toBeFalsy();
    });

    test('should validate minimum field lengths', async ({ page }) => {
      // Fill with data that's too short
      await page.fill('[data-testid="agent-name-input"]', EDGE_CASE_DATA.shortName);
      await page.fill('[data-testid="description-textarea"]', EDGE_CASE_DATA.shortDescription);
      
      await page.waitForTimeout(100); // Allow validation to run
      
      expect(await builderPage.getValidationError('agent-name')).toBe('Agent name must be at least 3 characters');
      expect(await builderPage.getValidationError('description')).toBe('Description must be at least 10 characters');
    });

    test('should validate confidence threshold ranges', async ({ page }) => {
      // Fill basic required fields first
      await builderPage.fillBasicConfig(VALID_AGENT_CONFIG);
      
      // Test extreme values
      await page.fill('[data-testid="confidence-threshold-input"]', EDGE_CASE_DATA.extremeThreshold.toString());
      await page.waitForTimeout(100);
      
      expect(await builderPage.getValidationError('confidence-threshold')).toBe('Confidence threshold must be between 0 and 100');
      
      // Test negative values
      await page.fill('[data-testid="confidence-threshold-input"]', EDGE_CASE_DATA.negativeThreshold.toString());
      await page.waitForTimeout(100);
      
      expect(await builderPage.getValidationError('confidence-threshold')).toBe('Confidence threshold must be between 0 and 100');
    });

    test('should validate webhook URL format', async ({ page }) => {
      await builderPage.fillBasicConfig(VALID_AGENT_CONFIG);
      
      // Enter invalid webhook URL
      await page.fill('[data-testid="webhook-url-input"]', EDGE_CASE_DATA.invalidWebhook);
      await page.waitForTimeout(100);
      
      expect(await builderPage.getValidationError('webhook')).toBe('Invalid webhook URL');
    });

    test('should validate notification threshold', async ({ page }) => {
      await builderPage.fillBasicConfig(VALID_AGENT_CONFIG);
      
      // Test extreme notification threshold
      await page.fill('[data-testid="notification-threshold-input"]', EDGE_CASE_DATA.extremeThreshold.toString());
      await page.waitForTimeout(100);
      
      expect(await builderPage.getValidationError('notification-threshold')).toBe('Notification threshold must be between 0 and 100');
    });
  });

  test.describe('Form Interaction Edge Cases', () => {
    test('should handle very long input values gracefully', async ({ page }) => {
      // Test with extremely long inputs
      await page.fill('[data-testid="agent-name-input"]', EDGE_CASE_DATA.longName);
      await page.fill('[data-testid="description-textarea"]', EDGE_CASE_DATA.longDescription);
      
      // Should not break the UI
      await expect(page.locator('[data-testid="agent-name-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="description-textarea"]')).toBeVisible();
      
      // Form should still validate the length appropriately
      const nameValue = await page.locator('[data-testid="agent-name-input"]').inputValue();
      expect(nameValue.length).toBe(100);
    });

    test('should preserve form state when switching agent types', async ({ page }) => {
      // Fill basic config
      await builderPage.fillBasicConfig(VALID_AGENT_CONFIG);
      
      // Switch agent type
      await page.selectOption('[data-testid="agent-type-select"]', 'reconciliation');
      
      // Verify other fields are preserved
      expect(await page.locator('[data-testid="agent-name-input"]').inputValue()).toBe(VALID_AGENT_CONFIG.name);
      expect(await page.locator('[data-testid="description-textarea"]').inputValue()).toBe(VALID_AGENT_CONFIG.description);
    });

    test('should handle rapid form submissions', async ({ page }) => {
      await builderPage.fillBasicConfig(VALID_AGENT_CONFIG);
      await builderPage.enableTestMode();
      
      // Try to submit multiple times rapidly
      await page.click('[data-testid="test-config-button"]');
      await page.click('[data-testid="test-config-button"]');
      await page.click('[data-testid="test-config-button"]');
      
      // Should only trigger one deployment
      await builderPage.waitForDeploymentStatus('deploying');
      const spinners = page.locator('[data-testid="deployment-spinner"]');
      expect(await spinners.count()).toBe(1);
    });

    test('should disable submit button during deployment', async ({ page }) => {
      await builderPage.fillBasicConfig(VALID_AGENT_CONFIG);
      await builderPage.enableTestMode();
      
      await builderPage.testConfiguration();
      await builderPage.waitForDeploymentStatus('deploying');
      
      // Both buttons should be disabled during deployment
      await expect(page.locator('[data-testid="deploy-button"]')).toBeDisabled();
      await expect(page.locator('[data-testid="test-config-button"]')).toBeDisabled();
    });

    test('should handle form reset after successful submission', async ({ page }) => {
      await builderPage.fillBasicConfig(VALID_AGENT_CONFIG);
      await builderPage.fillAdvancedSettings(VALID_AGENT_CONFIG);
      await builderPage.enableTestMode();
      
      await builderPage.testConfiguration();
      await builderPage.waitForDeploymentStatus('deploying');
      
      // Wait for any success/failure state
      await page.waitForTimeout(1000);
      
      // Form fields should still contain values (not reset in this implementation)
      expect(await page.locator('[data-testid="agent-name-input"]').inputValue()).toBe(VALID_AGENT_CONFIG.name);
    });
  });

  test.describe('Performance Requirements', () => {
    test('should load form within 2 seconds', async ({ page }) => {
      const startTime = Date.now();
      
      await builderPage.navigateToBuilder();
      
      // Verify all critical form elements are visible
      await expect(page.locator('[data-testid="agent-name-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-type-select"]')).toBeVisible();
      await expect(page.locator('[data-testid="description-textarea"]')).toBeVisible();
      await expect(page.locator('[data-testid="deploy-button"]')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);
    });

    test('should validate form fields quickly', async ({ page }) => {
      const startTime = Date.now();
      
      // Fill required fields
      await page.fill('[data-testid="agent-name-input"]', 'Test Agent');
      await page.fill('[data-testid="description-textarea"]', 'Test description for validation timing');
      
      // Wait for validation to complete
      await page.waitForTimeout(100);
      
      // Check that validation completed quickly
      const validationTime = Date.now() - startTime;
      expect(validationTime).toBeLessThan(1000);
      
      // Form should be valid now
      expect(await builderPage.isFormValid()).toBeTruthy();
    });

    test('should handle checkbox interactions quickly', async ({ page }) => {
      const startTime = Date.now();
      
      // Interact with multiple checkboxes
      await page.check('[data-testid="grok-enabled-checkbox"]');
      await page.check('[data-testid="oracle-integration-checkbox"]');
      await page.check('[data-testid="test-mode-checkbox"]');
      
      const interactionTime = Date.now() - startTime;
      expect(interactionTime).toBeLessThan(500);
      
      // Verify checkboxes are checked
      await expect(page.locator('[data-testid="grok-enabled-checkbox"]')).toBeChecked();
      await expect(page.locator('[data-testid="oracle-integration-checkbox"]')).toBeChecked();
      await expect(page.locator('[data-testid="test-mode-checkbox"]')).toBeChecked();
    });
  });

  test.describe('Accessibility and UX', () => {
    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check that form elements have proper labels
      await expect(page.locator('label[for="agent-name"]')).toBeVisible();
      await expect(page.locator('label[for="agent-type"]')).toBeVisible();
      await expect(page.locator('label[for="description"]')).toBeVisible();
      
      // Check that required fields are marked
      const nameLabel = page.locator('label[for="agent-name"]');
      await expect(nameLabel).toContainText('*');
    });

    test('should show loading states appropriately', async ({ page }) => {
      await builderPage.fillBasicConfig(VALID_AGENT_CONFIG);
      await builderPage.enableGrok();
      
      // Trigger Grok preview
      await page.click('[data-testid="grok-preview-button"]');
      
      // Should show loading state
      await expect(page.locator('[data-testid="grok-preview-loading"]')).toBeVisible();
      
      // Button should show loading text
      await expect(page.locator('[data-testid="grok-preview-button"]')).toContainText('Generating...');
      await expect(page.locator('[data-testid="grok-preview-button"]')).toBeDisabled();
    });

    test('should maintain focus management correctly', async ({ page }) => {
      // Fill first field
      await page.focus('[data-testid="agent-name-input"]');
      await page.keyboard.type('Test Agent');
      
      // Tab to next field
      await page.keyboard.press('Tab');
      
      // Should focus on agent type select
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toHaveAttribute('data-testid', 'agent-type-select');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      await builderPage.fillBasicConfig(VALID_AGENT_CONFIG);
      
      // Intercept and fail the deployment request
      await page.route('**/api/**', (route) => {
        route.abort('failed');
      });
      
      await builderPage.submitForm();
      
      // Should show error state
      await page.waitForSelector('[data-testid="deployment-status"]');
      const status = page.locator('[data-testid="deployment-status"]');
      await expect(status).toContainText('failed', { timeout: 10000 });
    });

    test('should recover from validation errors', async ({ page }) => {
      // Start with invalid data
      await page.fill('[data-testid="agent-name-input"]', 'AB');
      await page.fill('[data-testid="description-textarea"]', 'Short');
      
      // Should show errors
      await page.waitForTimeout(100);
      expect(await builderPage.getValidationError('agent-name')).toBeTruthy();
      expect(await builderPage.getValidationError('description')).toBeTruthy();
      
      // Fix the errors
      await page.fill('[data-testid="agent-name-input"]', 'Valid Agent Name');
      await page.fill('[data-testid="description-textarea"]', 'This is a valid description that meets the minimum length requirement');
      
      // Errors should clear
      await page.waitForTimeout(100);
      expect(await builderPage.getValidationError('agent-name')).toBeNull();
      expect(await builderPage.getValidationError('description')).toBeNull();
      
      // Form should become valid
      expect(await builderPage.isFormValid()).toBeTruthy();
    });
  });
});