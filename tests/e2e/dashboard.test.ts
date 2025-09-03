import { test, expect, Page, BrowserContext } from '@playwright/test';
import { chromium, firefox, webkit } from '@playwright/test';

// Mock data for testing
const mockDashboardData = {
  cashPosition: {
    current: 125000,
    change: 15000,
    changePercent: 13.6,
    lastUpdated: new Date().toISOString(),
  },
  thirteenWeekForecast: [
    { week: 1, projected: 130000, confidence: 95 },
    { week: 2, projected: 135000, confidence: 92 },
    { week: 3, projected: 128000, confidence: 89 },
    { week: 4, projected: 142000, confidence: 85 },
    { week: 5, projected: 138000, confidence: 82 },
    { week: 6, projected: 145000, confidence: 79 },
    { week: 7, projected: 140000, confidence: 76 },
    { week: 8, projected: 148000, confidence: 73 },
    { week: 9, projected: 152000, confidence: 70 },
    { week: 10, projected: 149000, confidence: 67 },
    { week: 11, projected: 155000, confidence: 64 },
    { week: 12, projected: 158000, confidence: 61 },
    { week: 13, projected: 162000, confidence: 58 },
  ],
  dsoMetrics: {
    current: 35,
    target: 30,
    trend: 'improving',
    change: -2,
  },
  dpoMetrics: {
    current: 28,
    target: 45,
    trend: 'stable',
    change: 0,
  },
  recentTransactions: [
    { id: '1', type: 'invoice', amount: 5500, customer: 'Acme Corp', date: '2024-01-15' },
    { id: '2', type: 'bill', amount: -2200, vendor: 'Office Supplies Inc', date: '2024-01-14' },
    { id: '3', type: 'payment', amount: 8000, customer: 'TechStart LLC', date: '2024-01-14' },
  ],
  aiInsights: [
    {
      type: 'cash_flow_alert',
      severity: 'medium',
      message: 'Cash flow projected to dip below $100K in week 8. Consider accelerating collections.',
      confidence: 78,
    },
    {
      type: 'dso_improvement',
      severity: 'low',
      message: 'DSO improved by 2 days this month. Current collection efficiency is above target.',
      confidence: 85,
    },
  ],
};

test.describe('FinHelm AI Dashboard E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async () => {
    // Use Chromium by default for consistency
    const browser = await chromium.launch();
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
  });

  test.beforeEach(async () => {
    page = await context.newPage();
    
    // Mock API responses
    await page.route('**/api/dashboard/metrics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDashboardData),
      });
    });

    await page.route('**/api/convex/**', async (route) => {
      const url = route.request().url();
      
      if (url.includes('getCashPosition')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockDashboardData.cashPosition),
        });
      } else if (url.includes('getThirteenWeekForecast')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockDashboardData.thirteenWeekForecast),
        });
      } else if (url.includes('getDSOMetrics')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockDashboardData.dsoMetrics),
        });
      } else if (url.includes('getDPOMetrics')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockDashboardData.dpoMetrics),
        });
      } else if (url.includes('getRecentTransactions')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockDashboardData.recentTransactions),
        });
      } else if (url.includes('getAIInsights')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockDashboardData.aiInsights),
        });
      } else {
        await route.continue();
      }
    });

    // Navigate to dashboard
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('Dashboard Loading Tests', () => {
    test('should load dashboard with all key components', async () => {
      // Wait for dashboard to load
      await page.waitForSelector('[data-testid="dashboard-container"]', { timeout: 10000 });

      // Check for main dashboard sections
      await expect(page.locator('[data-testid="cash-position-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="forecast-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="dso-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="dpo-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="recent-transactions"]')).toBeVisible();
      await expect(page.locator('[data-testid="ai-insights"]')).toBeVisible();
    });

    test('should display loading states before data arrives', async () => {
      // Create slow network conditions
      await page.route('**/api/dashboard/metrics', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockDashboardData),
        });
      });

      await page.goto('http://localhost:3000/dashboard');

      // Check for loading indicators
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      await expect(page.locator('[data-testid="skeleton-loader"]')).toBeVisible();

      // Wait for content to load
      await page.waitForSelector('[data-testid="cash-position-value"]', { timeout: 15000 });
      
      // Verify loading indicators disappear
      await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible();
    });

    test('should handle API failures gracefully', async () => {
      // Mock API failure
      await page.route('**/api/dashboard/metrics', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      await page.goto('http://localhost:3000/dashboard');

      // Check for error state
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-retry-button"]')).toBeVisible();
      
      // Test retry functionality
      await page.click('[data-testid="error-retry-button"]');
      // Should attempt to reload data
    });
  });

  test.describe('Metric Calculations Tests', () => {
    test('should display correct cash position metrics', async () => {
      await page.waitForSelector('[data-testid="cash-position-value"]');

      // Check cash position display
      const cashPositionValue = await page.textContent('[data-testid="cash-position-value"]');
      expect(cashPositionValue).toContain('$125,000');

      // Check percentage change
      const changePercent = await page.textContent('[data-testid="cash-change-percent"]');
      expect(changePercent).toContain('13.6%');
      expect(changePercent).toContain('↑'); // Should show up arrow for positive change

      // Check change amount
      const changeAmount = await page.textContent('[data-testid="cash-change-amount"]');
      expect(changeAmount).toContain('$15,000');
    });

    test('should display DSO metrics correctly', async () => {
      await page.waitForSelector('[data-testid="dso-current-value"]');

      const dsoValue = await page.textContent('[data-testid="dso-current-value"]');
      expect(dsoValue).toContain('35');

      const dsoTarget = await page.textContent('[data-testid="dso-target-value"]');
      expect(dsoTarget).toContain('30');

      // Check trend indicator
      const dsoTrend = await page.locator('[data-testid="dso-trend-indicator"]');
      await expect(dsoTrend).toHaveClass(/improving/);
    });

    test('should display DPO metrics correctly', async () => {
      await page.waitForSelector('[data-testid="dpo-current-value"]');

      const dpoValue = await page.textContent('[data-testid="dpo-current-value"]');
      expect(dpoValue).toContain('28');

      const dpoTarget = await page.textContent('[data-testid="dpo-target-value"]');
      expect(dpoTarget).toContain('45');

      // Check trend indicator
      const dpoTrend = await page.locator('[data-testid="dpo-trend-indicator"]');
      await expect(dpoTrend).toHaveClass(/stable/);
    });

    test('should calculate and display forecast metrics', async () => {
      await page.waitForSelector('[data-testid="forecast-chart"]');

      // Check that all 13 weeks are displayed
      const forecastPoints = await page.locator('[data-testid^="forecast-week-"]').count();
      expect(forecastPoints).toBe(13);

      // Check first and last week values
      const week1Value = await page.textContent('[data-testid="forecast-week-1-value"]');
      expect(week1Value).toContain('130,000');

      const week13Value = await page.textContent('[data-testid="forecast-week-13-value"]');
      expect(week13Value).toContain('162,000');

      // Check confidence levels
      const week1Confidence = await page.textContent('[data-testid="forecast-week-1-confidence"]');
      expect(week1Confidence).toContain('95%');
    });
  });

  test.describe('Real-time Updates Tests', () => {
    test('should update metrics when new data arrives', async () => {
      await page.waitForSelector('[data-testid="cash-position-value"]');

      // Initial value check
      let cashValue = await page.textContent('[data-testid="cash-position-value"]');
      expect(cashValue).toContain('$125,000');

      // Update mock data
      const updatedData = {
        ...mockDashboardData,
        cashPosition: {
          ...mockDashboardData.cashPosition,
          current: 135000,
          change: 25000,
          changePercent: 22.7,
        },
      };

      // Mock updated API response
      await page.route('**/api/dashboard/metrics', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedData),
        });
      });

      // Trigger refresh (simulate real-time update)
      await page.click('[data-testid="refresh-button"]');
      await page.waitForTimeout(1000);

      // Verify updated value
      cashValue = await page.textContent('[data-testid="cash-position-value"]');
      expect(cashValue).toContain('$135,000');

      const changePercent = await page.textContent('[data-testid="cash-change-percent"]');
      expect(changePercent).toContain('22.7%');
    });

    test('should show real-time transaction updates', async () => {
      await page.waitForSelector('[data-testid="recent-transactions"]');

      // Count initial transactions
      const initialCount = await page.locator('[data-testid^="transaction-"]').count();
      expect(initialCount).toBe(3);

      // Add new transaction to mock data
      const updatedTransactions = [
        { id: '4', type: 'invoice', amount: 7500, customer: 'New Client LLC', date: '2024-01-16' },
        ...mockDashboardData.recentTransactions,
      ];

      await page.route('**/api/convex/**/getRecentTransactions', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedTransactions),
        });
      });

      // Simulate real-time update
      await page.evaluate(() => {
        // Trigger a custom event that the app listens to for real-time updates
        window.dispatchEvent(new CustomEvent('finhelm-realtime-update', { 
          detail: { type: 'transactions' }
        }));
      });

      await page.waitForTimeout(1000);

      // Check for new transaction
      await expect(page.locator('[data-testid="transaction-4"]')).toBeVisible();
      const newTransactionAmount = await page.textContent('[data-testid="transaction-4-amount"]');
      expect(newTransactionAmount).toContain('$7,500');
    });

    test('should update AI insights in real-time', async () => {
      await page.waitForSelector('[data-testid="ai-insights"]');

      // Count initial insights
      const initialInsights = await page.locator('[data-testid^="insight-"]').count();
      expect(initialInsights).toBe(2);

      // Add new insight
      const updatedInsights = [
        {
          type: 'payment_delay',
          severity: 'high',
          message: 'Large payment of $50K is 5 days overdue from Acme Corp. Consider immediate follow-up.',
          confidence: 92,
        },
        ...mockDashboardData.aiInsights,
      ];

      await page.route('**/api/convex/**/getAIInsights', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedInsights),
        });
      });

      // Trigger AI insights update
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('finhelm-ai-update'));
      });

      await page.waitForTimeout(1000);

      // Check for new insight
      const newInsight = page.locator('[data-testid^="insight-"].severity-high').first();
      await expect(newInsight).toBeVisible();
      
      const insightText = await newInsight.textContent();
      expect(insightText).toContain('$50K is 5 days overdue');
    });
  });

  test.describe('Responsive Design Tests', () => {
    test('should adapt to mobile viewport', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 812 }); // iPhone X dimensions

      await page.goto('http://localhost:3000/dashboard');
      await page.waitForSelector('[data-testid="dashboard-container"]');

      // Check mobile layout
      const dashboardContainer = page.locator('[data-testid="dashboard-container"]');
      await expect(dashboardContainer).toHaveClass(/mobile-layout/);

      // Verify cards stack vertically
      const cashCard = page.locator('[data-testid="cash-position-card"]');
      const forecastCard = page.locator('[data-testid="forecast-chart-card"]');
      
      const cashBox = await cashCard.boundingBox();
      const forecastBox = await forecastCard.boundingBox();
      
      // In mobile, forecast card should be below cash card
      expect(forecastBox!.y).toBeGreaterThan(cashBox!.y + cashBox!.height);

      // Check that text remains readable
      const cashValue = page.locator('[data-testid="cash-position-value"]');
      const fontSize = await cashValue.evaluate((el) => 
        window.getComputedStyle(el).fontSize
      );
      expect(parseInt(fontSize)).toBeGreaterThanOrEqual(16); // Minimum readable size
    });

    test('should adapt to tablet viewport', async () => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad dimensions

      await page.goto('http://localhost:3000/dashboard');
      await page.waitForSelector('[data-testid="dashboard-container"]');

      // Check tablet layout
      const dashboardContainer = page.locator('[data-testid="dashboard-container"]');
      await expect(dashboardContainer).toHaveClass(/tablet-layout/);

      // Verify grid layout works on tablet
      const metricsRow = page.locator('[data-testid="metrics-row"]');
      await expect(metricsRow).toHaveCSS('display', /grid|flex/);
    });

    test('should handle landscape orientation', async () => {
      // Set landscape mobile viewport
      await page.setViewportSize({ width: 812, height: 375 });

      await page.goto('http://localhost:3000/dashboard');
      await page.waitForSelector('[data-testid="dashboard-container"]');

      // Check that forecast chart adjusts to landscape
      const forecastChart = page.locator('[data-testid="forecast-chart"]');
      const chartBox = await forecastChart.boundingBox();
      
      // In landscape, chart should utilize horizontal space better
      expect(chartBox!.width / chartBox!.height).toBeGreaterThan(2); // Wide aspect ratio
    });

    test('should maintain usability across different screen densities', async () => {
      // Test with high DPI (Retina display)
      await context.close();
      const browser = await chromium.launch();
      context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 2, // 2x density
      });

      page = await context.newPage();
      await setupMockRoutes(page);
      
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForSelector('[data-testid="dashboard-container"]');

      // Check that elements are crisp and properly sized
      const logo = page.locator('[data-testid="finhelm-logo"]');
      await expect(logo).toBeVisible();
      
      // Verify touch targets are large enough (minimum 44px)
      const refreshButton = page.locator('[data-testid="refresh-button"]');
      const buttonBox = await refreshButton.boundingBox();
      expect(buttonBox!.width).toBeGreaterThanOrEqual(44);
      expect(buttonBox!.height).toBeGreaterThanOrEqual(44);
    });
  });

  test.describe('Accessibility Tests', () => {
    test('should have proper ARIA labels and roles', async () => {
      await page.waitForSelector('[data-testid="dashboard-container"]');

      // Check main dashboard container
      const dashboard = page.locator('[data-testid="dashboard-container"]');
      await expect(dashboard).toHaveAttribute('role', 'main');
      await expect(dashboard).toHaveAttribute('aria-label', /dashboard/i);

      // Check cash position card
      const cashCard = page.locator('[data-testid="cash-position-card"]');
      await expect(cashCard).toHaveAttribute('role', 'region');
      await expect(cashCard).toHaveAttribute('aria-labelledby');

      // Check forecast chart
      const forecastChart = page.locator('[data-testid="forecast-chart"]');
      await expect(forecastChart).toHaveAttribute('role', 'img');
      await expect(forecastChart).toHaveAttribute('aria-label');
    });

    test('should be keyboard navigable', async () => {
      await page.waitForSelector('[data-testid="dashboard-container"]');

      // Start from first focusable element
      await page.keyboard.press('Tab');
      
      // Should focus on first interactive element (likely refresh button)
      let focusedElement = await page.locator(':focus');
      await expect(focusedElement).toHaveAttribute('data-testid', 'refresh-button');

      // Continue tabbing through dashboard
      await page.keyboard.press('Tab');
      focusedElement = await page.locator(':focus');
      
      // Should be able to reach all interactive elements
      const tabStops = [];
      for (let i = 0; i < 10; i++) {
        const elementTestId = await focusedElement.getAttribute('data-testid');
        if (elementTestId) tabStops.push(elementTestId);
        await page.keyboard.press('Tab');
        focusedElement = await page.locator(':focus');
      }

      // Verify key interactive elements are reachable
      expect(tabStops).toContain('refresh-button');
      expect(tabStops.some(id => id?.includes('insight'))).toBeTruthy();
    });

    test('should have sufficient color contrast', async () => {
      await page.waitForSelector('[data-testid="cash-position-value"]');

      // Check main cash position text
      const cashValue = page.locator('[data-testid="cash-position-value"]');
      const textColor = await cashValue.evaluate((el) => 
        window.getComputedStyle(el).color
      );
      const backgroundColor = await cashValue.evaluate((el) => 
        window.getComputedStyle(el).backgroundColor
      );

      // This is a simplified check - in a real implementation, you'd use a proper contrast ratio calculator
      expect(textColor).not.toBe(backgroundColor);
      
      // Check that status indicators have sufficient contrast
      const positiveChange = page.locator('[data-testid="cash-change-percent"].positive');
      if (await positiveChange.isVisible()) {
        const changeColor = await positiveChange.evaluate((el) => 
          window.getComputedStyle(el).color
        );
        // Green text should not be too light
        expect(changeColor).toMatch(/rgb\(\s*\d+,\s*\d+,\s*\d+\)/);
      }
    });
  });

  test.describe('Performance Tests', () => {
    test('should load dashboard within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForSelector('[data-testid="cash-position-value"]');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });

    test('should handle rapid data updates without performance degradation', async () => {
      await page.waitForSelector('[data-testid="dashboard-container"]');

      // Measure initial render performance
      const initialMetrics = await page.evaluate(() => {
        performance.mark('rapid-updates-start');
        return performance.getEntriesByType('navigation')[0];
      });

      // Simulate rapid updates
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => {
          window.dispatchEvent(new CustomEvent('finhelm-realtime-update', {
            detail: { type: 'cash_position', value: Math.random() * 100000 }
          }));
        });
        await page.waitForTimeout(100);
      }

      // Measure performance after rapid updates
      const finalMetrics = await page.evaluate(() => {
        performance.mark('rapid-updates-end');
        performance.measure('rapid-updates', 'rapid-updates-start', 'rapid-updates-end');
        return performance.getEntriesByName('rapid-updates')[0];
      });

      // Performance should not degrade significantly
      expect(finalMetrics.duration).toBeLessThan(1000); // Updates should complete within 1 second
    });
  });

  // Helper function to set up mock routes
  async function setupMockRoutes(page: Page) {
    await page.route('**/api/dashboard/metrics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDashboardData),
      });
    });

    // Add other route mocks as needed...
  }
});

// Cross-browser compatibility tests
test.describe('Cross-Browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`should work correctly in ${browserName}`, async () => {
      const browserType = browserName === 'chromium' ? chromium : 
                         browserName === 'firefox' ? firefox : webkit;
      
      const browser = await browserType.launch();
      const context = await browser.newContext();
      const page = await context.newPage();

      // Mock routes
      await page.route('**/api/dashboard/metrics', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockDashboardData),
        });
      });

      await page.goto('http://localhost:3000/dashboard');
      await page.waitForSelector('[data-testid="cash-position-value"]');

      // Basic functionality should work across all browsers
      const cashValue = await page.textContent('[data-testid="cash-position-value"]');
      expect(cashValue).toContain('$125,000');

      await browser.close();
    });
  });
});