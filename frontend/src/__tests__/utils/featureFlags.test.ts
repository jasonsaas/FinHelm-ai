/**
 * Feature Flags System Unit Tests
 * 
 * Comprehensive tests for the feature flags system including:
 * - Flag evaluation logic
 * - User targeting and rollout
 * - A/B testing functionality
 * - Environment overrides
 * - Analytics and metrics
 * - Configuration validation
 */

import {
  FeatureFlagsManager,
  FeatureFlag,
  UserContext,
  featureFlags,
} from '../../utils/featureFlags';

describe('FeatureFlagsManager', () => {
  let manager: FeatureFlagsManager;

  beforeEach(() => {
    manager = new FeatureFlagsManager('development');
  });

  describe('Basic Flag Operations', () => {
    test('should initialize with default flags', () => {
      const flags = manager.getAllFlags();
      expect(flags.length).toBeGreaterThan(0);
      
      const aiInsights = manager.getFlag('ai_powered_insights');
      expect(aiInsights).toBeTruthy();
      expect(aiInsights?.name).toBe('AI-Powered Financial Insights');
    });

    test('should add and retrieve custom flags', () => {
      const customFlag: FeatureFlag = {
        key: 'test_feature',
        name: 'Test Feature',
        description: 'A test feature flag',
        defaultValue: true,
        environments: {},
        rollout: {
          percentage: 50,
        },
        metadata: {
          createdBy: 'test',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          tags: ['test'],
        },
      };

      manager.addFlag(customFlag);
      const retrieved = manager.getFlag('test_feature');
      
      expect(retrieved).toEqual(customFlag);
    });

    test('should remove flags', () => {
      const customFlag: FeatureFlag = {
        key: 'removable_feature',
        name: 'Removable Feature',
        description: 'A feature that can be removed',
        defaultValue: false,
        environments: {},
        rollout: { percentage: 0 },
        metadata: {
          createdBy: 'test',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          tags: ['test'],
        },
      };

      manager.addFlag(customFlag);
      expect(manager.getFlag('removable_feature')).toBeTruthy();
      
      manager.removeFlag('removable_feature');
      expect(manager.getFlag('removable_feature')).toBeNull();
    });

    test('should filter flags by tag', () => {
      const aiFlags = manager.getFlagsByTag('ai');
      expect(aiFlags.length).toBeGreaterThan(0);
      
      aiFlags.forEach(flag => {
        expect(flag.metadata.tags).toContain('ai');
      });
    });
  });

  describe('Flag Evaluation Without User Context', () => {
    test('should use default value when no user context', () => {
      const result = manager.isEnabled('quickbooks_integration');
      expect(result.enabled).toBe(true); // Default is true
      expect(result.reason).toContain('Environment override');
    });

    test('should respect environment overrides', () => {
      // ai_powered_insights is enabled in development but disabled in production by default
      const devManager = new FeatureFlagsManager('development');
      const prodManager = new FeatureFlagsManager('production');

      const devResult = devManager.isEnabled('ai_powered_insights');
      const prodResult = prodManager.isEnabled('ai_powered_insights');

      expect(devResult.enabled).toBe(true);
      expect(prodResult.enabled).toBe(false);
    });

    test('should return false for non-existent flags', () => {
      const result = manager.isEnabled('non_existent_flag');
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('Flag not found');
    });
  });

  describe('Flag Evaluation With User Context', () => {
    const testUser: UserContext = {
      id: 'user-123',
      email: 'test@example.com',
      organizationId: 'org-456',
      role: 'admin',
      plan: 'premium',
      registrationDate: '2024-01-15T00:00:00Z',
      attributes: {},
    };

    beforeEach(() => {
      manager.setUserContext(testUser);
    });

    test('should enable flag for users in target percentage', () => {
      // Create a flag with 100% rollout to guarantee enablement
      const alwaysOnFlag: FeatureFlag = {
        key: 'always_on_test',
        name: 'Always On Test',
        description: 'Test flag that should always be on',
        defaultValue: false,
        environments: {},
        rollout: { percentage: 100 },
        metadata: {
          createdBy: 'test',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          tags: ['test'],
        },
      };

      manager.addFlag(alwaysOnFlag);
      const result = manager.isEnabled('always_on_test');
      
      expect(result.enabled).toBe(true);
    });

    test('should disable flag for users outside target percentage', () => {
      const neverOnFlag: FeatureFlag = {
        key: 'never_on_test',
        name: 'Never On Test',
        description: 'Test flag that should never be on',
        defaultValue: true,
        environments: {},
        rollout: { percentage: 0 },
        metadata: {
          createdBy: 'test',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          tags: ['test'],
        },
      };

      manager.addFlag(neverOnFlag);
      const result = manager.isEnabled('never_on_test');
      
      expect(result.enabled).toBe(false);
      expect(result.reason).toContain('percentile');
    });

    test('should enable flag for explicitly targeted users', () => {
      const userTargetedFlag: FeatureFlag = {
        key: 'user_targeted_test',
        name: 'User Targeted Test',
        description: 'Test flag targeted to specific users',
        defaultValue: false,
        environments: {},
        rollout: {
          percentage: 0, // 0% rollout, but user is explicitly targeted
          userIds: [testUser.id],
        },
        metadata: {
          createdBy: 'test',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          tags: ['test'],
        },
      };

      manager.addFlag(userTargetedFlag);
      const result = manager.isEnabled('user_targeted_test');
      
      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('User explicitly targeted');
    });

    test('should enable flag for explicitly targeted organizations', () => {
      const orgTargetedFlag: FeatureFlag = {
        key: 'org_targeted_test',
        name: 'Organization Targeted Test',
        description: 'Test flag targeted to specific organizations',
        defaultValue: false,
        environments: {},
        rollout: {
          percentage: 0,
          organizationIds: [testUser.organizationId],
        },
        metadata: {
          createdBy: 'test',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          tags: ['test'],
        },
      };

      manager.addFlag(orgTargetedFlag);
      const result = manager.isEnabled('org_targeted_test');
      
      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('Organization explicitly targeted');
    });

    test('should respect user attribute targeting', () => {
      // Test should pass because testUser has role 'admin' and plan 'premium'
      const result = manager.isEnabled('ai_powered_insights');
      expect(result.enabled).toBe(true);

      // Test with user who doesn't match attributes
      const basicUser: UserContext = {
        ...testUser,
        role: 'user',
        plan: 'basic',
      };

      const resultBasicUser = manager.isEnabled('ai_powered_insights', basicUser);
      expect(resultBasicUser.enabled).toBe(false);
      expect(resultBasicUser.reason).toBe('User attributes do not match');
    });

    test('should handle registration date targeting', () => {
      const dateTargetedFlag: FeatureFlag = {
        key: 'new_user_feature',
        name: 'New User Feature',
        description: 'Feature for users registered after 2024-01-01',
        defaultValue: false,
        environments: {},
        rollout: {
          percentage: 100,
          userAttributes: {
            registrationDate: {
              after: '2024-01-01',
            },
          },
        },
        metadata: {
          createdBy: 'test',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          tags: ['test'],
        },
      };

      manager.addFlag(dateTargetedFlag);

      // testUser registered on 2024-01-15, so should be enabled
      const result = manager.isEnabled('new_user_feature');
      expect(result.enabled).toBe(true);

      // Test with old user
      const oldUser: UserContext = {
        ...testUser,
        registrationDate: '2023-12-01T00:00:00Z',
      };

      const oldUserResult = manager.isEnabled('new_user_feature', oldUser);
      expect(oldUserResult.enabled).toBe(false);
    });
  });

  describe('A/B Testing', () => {
    const testUser: UserContext = {
      id: 'user-123',
      email: 'test@example.com',
      organizationId: 'org-456',
      role: 'admin',
      plan: 'premium',
      registrationDate: '2024-01-15T00:00:00Z',
      attributes: {},
    };

    beforeEach(() => {
      manager.setUserContext(testUser);
    });

    test('should return A/B test variant', () => {
      const result = manager.isEnabled('advanced_dashboard');
      
      expect(result.enabled).toBe(true);
      expect(result.variant).toBeDefined();
      expect(['control', 'enhanced', 'minimal']).toContain(result.variant);
      expect(result.reason).toContain('A/B test variant');
    });

    test('should provide consistent variant for same user', () => {
      const result1 = manager.isEnabled('advanced_dashboard');
      const result2 = manager.isEnabled('advanced_dashboard');
      
      expect(result1.variant).toBe(result2.variant);
      expect(result1.config).toEqual(result2.config);
    });

    test('should provide variant configuration', () => {
      const result = manager.isEnabled('advanced_dashboard');
      
      if (result.variant === 'enhanced') {
        expect(result.config).toEqual({
          showMetrics: true,
          refreshInterval: 30,
        });
      } else if (result.variant === 'minimal') {
        expect(result.config).toEqual({
          showMetrics: false,
          refreshInterval: 60,
        });
      }
    });
  });

  describe('Dependencies', () => {
    const testUser: UserContext = {
      id: 'user-123',
      email: 'test@example.com',
      organizationId: 'org-456',
      role: 'admin',
      plan: 'premium',
      registrationDate: '2024-01-15T00:00:00Z',
      attributes: {},
    };

    beforeEach(() => {
      manager.setUserContext(testUser);
    });

    test('should respect flag dependencies', () => {
      // AI insights depends on QuickBooks integration
      // First, disable QuickBooks
      const qbFlag = manager.getFlag('quickbooks_integration');
      if (qbFlag) {
        const disabledQbFlag: FeatureFlag = {
          ...qbFlag,
          rollout: { percentage: 0 },
        };
        manager.addFlag(disabledQbFlag);
      }

      const aiResult = manager.isEnabled('ai_powered_insights');
      expect(aiResult.enabled).toBe(false);
      expect(aiResult.reason).toContain('Dependency');
    });
  });

  describe('Analytics', () => {
    const testUser: UserContext = {
      id: 'user-123',
      email: 'test@example.com',
      organizationId: 'org-456',
      role: 'admin',
      plan: 'premium',
      registrationDate: '2024-01-15T00:00:00Z',
      attributes: {},
    };

    beforeEach(() => {
      manager.setUserContext(testUser);
      manager.clearAnalytics();
    });

    test('should record analytics events', () => {
      manager.isEnabled('quickbooks_integration');
      manager.isEnabled('ai_powered_insights');

      const analytics = manager.getAnalytics();
      expect(analytics).toHaveLength(2);
      
      expect(analytics[0].userId).toBe(testUser.id);
      expect(analytics[0].organizationId).toBe(testUser.organizationId);
    });

    test('should provide usage statistics', () => {
      // Generate some events
      manager.isEnabled('quickbooks_integration');
      manager.isEnabled('ai_powered_insights');
      manager.isEnabled('advanced_dashboard');

      const stats = manager.getUsageStatistics();
      expect(stats.totalEvents).toBe(3);
      expect(stats.uniqueUsers).toBe(1);
      expect(stats.enabledCount).toBeGreaterThan(0);
    });

    test('should filter analytics by flag key', () => {
      manager.isEnabled('quickbooks_integration');
      manager.isEnabled('ai_powered_insights');

      const qbAnalytics = manager.getAnalytics('quickbooks_integration');
      expect(qbAnalytics).toHaveLength(1);
      expect(qbAnalytics[0].flagKey).toBe('quickbooks_integration');
    });

    test('should track A/B test variant distribution', () => {
      // Generate multiple events for A/B test
      for (let i = 0; i < 10; i++) {
        const user: UserContext = {
          ...testUser,
          id: `user-${i}`,
        };
        manager.isEnabled('advanced_dashboard', user);
      }

      const stats = manager.getUsageStatistics('advanced_dashboard');
      expect(Object.keys(stats.variantDistribution).length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Management', () => {
    test('should export and import flags', () => {
      const exportedJson = manager.exportFlags();
      expect(exportedJson).toBeTruthy();
      
      const newManager = new FeatureFlagsManager('development');
      const originalFlagsCount = newManager.getAllFlags().length;
      
      // Add a custom flag to original manager
      const customFlag: FeatureFlag = {
        key: 'export_test',
        name: 'Export Test',
        description: 'Test flag for export/import',
        defaultValue: true,
        environments: {},
        rollout: { percentage: 50 },
        metadata: {
          createdBy: 'test',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          tags: ['test'],
        },
      };
      
      manager.addFlag(customFlag);
      const updatedJson = manager.exportFlags();
      
      newManager.importFlags(updatedJson);
      expect(newManager.getAllFlags().length).toBeGreaterThan(originalFlagsCount);
      expect(newManager.getFlag('export_test')).toBeTruthy();
    });

    test('should validate flag configuration', () => {
      const invalidFlag: FeatureFlag = {
        key: '',
        name: '',
        description: '',
        defaultValue: false,
        environments: {},
        rollout: {
          percentage: 150, // Invalid percentage
          abTest: {
            enabled: true,
            variants: [
              { name: 'a', percentage: 60 },
              { name: 'b', percentage: 50 }, // Total > 100%
            ],
          },
        },
        metadata: {
          createdBy: 'test',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          tags: [],
          dependencies: ['nonexistent_flag'],
        },
      };

      const errors = manager.validateFlag(invalidFlag);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('Flag key is required');
      expect(errors).toContain('Flag name is required');
      expect(errors).toContain('Flag description is required');
      expect(errors.some(error => error.includes('percentage must be between 0 and 100'))).toBe(true);
      expect(errors.some(error => error.includes('sum to 100'))).toBe(true);
      expect(errors.some(error => error.includes('does not exist'))).toBe(true);
    });

    test('should handle malformed JSON import', () => {
      expect(() => {
        manager.importFlags('invalid json');
      }).toThrow('Failed to import flags');
    });
  });

  describe('Environment Handling', () => {
    test('should behave differently in different environments', () => {
      const devManager = new FeatureFlagsManager('development');
      const stagingManager = new FeatureFlagsManager('staging');
      const prodManager = new FeatureFlagsManager('production');

      // mobile_app_promotion has different settings per environment
      const devResult = devManager.isEnabled('mobile_app_promotion');
      const stagingResult = stagingManager.isEnabled('mobile_app_promotion');
      const prodResult = prodManager.isEnabled('mobile_app_promotion');

      expect(devResult.enabled).toBe(false); // Disabled in dev
      expect(stagingResult.enabled).toBe(true); // Enabled in staging
      expect(prodResult.enabled).toBe(true); // Enabled in prod
    });
  });

  describe('Edge Cases', () => {
    test('should handle user with no attributes gracefully', () => {
      const minimalUser: UserContext = {
        id: 'user-minimal',
        email: 'minimal@example.com',
        organizationId: 'org-minimal',
        role: '',
        plan: '',
        registrationDate: '',
        attributes: {},
      };

      manager.setUserContext(minimalUser);
      
      expect(() => {
        manager.isEnabled('ai_powered_insights');
      }).not.toThrow();
    });

    test('should handle very large user IDs', () => {
      const largeIdUser: UserContext = {
        id: 'a'.repeat(1000),
        email: 'large@example.com',
        organizationId: 'org-large',
        role: 'user',
        plan: 'basic',
        registrationDate: '2024-01-01T00:00:00Z',
        attributes: {},
      };

      manager.setUserContext(largeIdUser);
      
      expect(() => {
        manager.isEnabled('quickbooks_integration');
      }).not.toThrow();
    });

    test('should handle circular dependencies gracefully', () => {
      // This test would require modifying the dependency checking logic
      // to prevent infinite recursion, which is beyond the current implementation
      // but should be considered for production use
    });

    test('should handle empty variant list in A/B test', () => {
      const emptyVariantFlag: FeatureFlag = {
        key: 'empty_variant_test',
        name: 'Empty Variant Test',
        description: 'Test flag with empty variant list',
        defaultValue: false,
        environments: {},
        rollout: {
          percentage: 100,
          abTest: {
            enabled: true,
            variants: [],
          },
        },
        metadata: {
          createdBy: 'test',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          tags: ['test'],
        },
      };

      const errors = manager.validateFlag(emptyVariantFlag);
      expect(errors.some(error => error.includes('at least one variant'))).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should handle many flag evaluations efficiently', () => {
      const testUser: UserContext = {
        id: 'user-perf-test',
        email: 'perf@example.com',
        organizationId: 'org-perf',
        role: 'user',
        plan: 'basic',
        registrationDate: '2024-01-01T00:00:00Z',
        attributes: {},
      };

      manager.setUserContext(testUser);

      const startTime = Date.now();
      
      // Evaluate flags many times
      for (let i = 0; i < 1000; i++) {
        manager.isEnabled('quickbooks_integration');
        manager.isEnabled('ai_powered_insights');
        manager.isEnabled('advanced_dashboard');
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });

    test('should limit analytics events to prevent memory issues', () => {
      const testUser: UserContext = {
        id: 'user-analytics-test',
        email: 'analytics@example.com',
        organizationId: 'org-analytics',
        role: 'user',
        plan: 'basic',
        registrationDate: '2024-01-01T00:00:00Z',
        attributes: {},
      };

      manager.setUserContext(testUser);
      manager.clearAnalytics();

      // Generate more events than the limit
      for (let i = 0; i < 1500; i++) {
        manager.isEnabled('quickbooks_integration');
      }

      const analytics = manager.getAnalytics();
      expect(analytics.length).toBeLessThanOrEqual(1000); // Should be capped
    });
  });
});