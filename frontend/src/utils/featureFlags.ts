/**
 * Feature Flags System for FinHelm.ai
 * 
 * This module provides a comprehensive feature flagging system that allows for:
 * - Gradual rollout of new features
 * - A/B testing capabilities
 * - User-based and organization-based targeting
 * - Environment-based configuration
 * - Real-time flag updates
 * - Analytics and metrics tracking
 */

/**
 * Feature flag configuration interface
 */
export interface FeatureFlag {
  /** Unique identifier for the feature flag */
  key: string;
  /** Human-readable name for the feature */
  name: string;
  /** Description of what this feature flag controls */
  description: string;
  /** Whether the flag is enabled by default */
  defaultValue: boolean;
  /** Environment-specific overrides */
  environments: {
    development?: boolean;
    staging?: boolean;
    production?: boolean;
  };
  /** Rollout configuration */
  rollout: {
    /** Percentage of users to enable for (0-100) */
    percentage: number;
    /** Specific user IDs to always enable */
    userIds?: string[];
    /** Specific organization IDs to always enable */
    organizationIds?: string[];
    /** User attributes to target */
    userAttributes?: {
      role?: string[];
      plan?: string[];
      registrationDate?: {
        after?: string;
        before?: string;
      };
    };
    /** A/B testing configuration */
    abTest?: {
      enabled: boolean;
      variants: {
        name: string;
        percentage: number;
        config?: Record<string, any>;
      }[];
    };
  };
  /** Flag metadata */
  metadata: {
    /** Who created this flag */
    createdBy: string;
    /** When the flag was created */
    createdAt: string;
    /** When the flag was last updated */
    updatedAt: string;
    /** Tags for organization */
    tags: string[];
    /** Dependencies on other flags */
    dependencies?: string[];
  };
}

/**
 * User context for feature flag evaluation
 */
export interface UserContext {
  /** User ID */
  id: string;
  /** User email */
  email: string;
  /** Organization ID */
  organizationId: string;
  /** User role */
  role: string;
  /** Subscription plan */
  plan: string;
  /** User registration date */
  registrationDate: string;
  /** Additional user attributes */
  attributes: Record<string, any>;
}

/**
 * Feature flag evaluation result
 */
export interface FeatureFlagResult {
  /** Whether the feature is enabled */
  enabled: boolean;
  /** Variant name (for A/B tests) */
  variant?: string;
  /** Variant configuration */
  config?: Record<string, any>;
  /** Reason why the flag was enabled/disabled */
  reason: string;
}

/**
 * Analytics event for feature flag usage
 */
interface FeatureFlagEvent {
  flagKey: string;
  userId: string;
  organizationId: string;
  enabled: boolean;
  variant?: string;
  timestamp: number;
  context: Record<string, any>;
}

/**
 * Feature Flags Manager Class
 */
export class FeatureFlagsManager {
  private flags: Map<string, FeatureFlag> = new Map();
  private userContext: UserContext | null = null;
  private environment: 'development' | 'staging' | 'production';
  private analytics: FeatureFlagEvent[] = [];
  private maxAnalyticsEvents = 1000;

  constructor(environment: 'development' | 'staging' | 'production' = 'development') {
    this.environment = environment;
    this.initializeDefaultFlags();
  }

  /**
   * Initialize default feature flags
   */
  private initializeDefaultFlags(): void {
    const defaultFlags: FeatureFlag[] = [
      {
        key: 'ai_powered_insights',
        name: 'AI-Powered Financial Insights',
        description: 'Enable advanced AI-driven financial analysis and insights',
        defaultValue: false,
        environments: {
          development: true,
          staging: true,
          production: false,
        },
        rollout: {
          percentage: 25,
          userAttributes: {
            plan: ['premium', 'enterprise'],
            role: ['admin', 'financial_analyst'],
          },
        },
        metadata: {
          createdBy: 'system',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
          tags: ['ai', 'analytics', 'premium'],
          dependencies: ['quickbooks_integration'],
        },
      },
      {
        key: 'quickbooks_integration',
        name: 'QuickBooks Integration',
        description: 'Enable QuickBooks data synchronization and reporting',
        defaultValue: true,
        environments: {
          development: true,
          staging: true,
          production: true,
        },
        rollout: {
          percentage: 100,
        },
        metadata: {
          createdBy: 'system',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          tags: ['integration', 'core'],
        },
      },
      {
        key: 'advanced_dashboard',
        name: 'Advanced Dashboard',
        description: 'Enable the new advanced dashboard with real-time metrics',
        defaultValue: false,
        environments: {
          development: true,
          staging: true,
          production: false,
        },
        rollout: {
          percentage: 50,
          abTest: {
            enabled: true,
            variants: [
              { name: 'control', percentage: 50 },
              { name: 'enhanced', percentage: 30, config: { showMetrics: true, refreshInterval: 30 } },
              { name: 'minimal', percentage: 20, config: { showMetrics: false, refreshInterval: 60 } },
            ],
          },
        },
        metadata: {
          createdBy: 'product_team',
          createdAt: '2024-01-10T00:00:00Z',
          updatedAt: '2024-01-20T14:15:00Z',
          tags: ['ui', 'dashboard', 'ab_test'],
        },
      },
      {
        key: 'bulk_operations',
        name: 'Bulk Operations',
        description: 'Enable bulk transaction processing and management',
        defaultValue: false,
        environments: {
          development: true,
          staging: false,
          production: false,
        },
        rollout: {
          percentage: 10,
          userAttributes: {
            role: ['admin', 'power_user'],
          },
        },
        metadata: {
          createdBy: 'engineering_team',
          createdAt: '2024-01-15T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
          tags: ['performance', 'admin', 'beta'],
        },
      },
      {
        key: 'mobile_app_promotion',
        name: 'Mobile App Promotion',
        description: 'Show mobile app download prompts and banners',
        defaultValue: true,
        environments: {
          development: false,
          staging: true,
          production: true,
        },
        rollout: {
          percentage: 80,
          userAttributes: {
            registrationDate: {
              after: '2024-01-01',
            },
          },
        },
        metadata: {
          createdBy: 'marketing_team',
          createdAt: '2024-01-05T00:00:00Z',
          updatedAt: '2024-01-25T09:00:00Z',
          tags: ['marketing', 'mobile', 'promotion'],
        },
      },
    ];

    defaultFlags.forEach(flag => {
      this.flags.set(flag.key, flag);
    });
  }

  /**
   * Set user context for feature flag evaluation
   * @param context - User context information
   */
  setUserContext(context: UserContext): void {
    this.userContext = context;
  }

  /**
   * Add or update a feature flag
   * @param flag - Feature flag configuration
   */
  addFlag(flag: FeatureFlag): void {
    this.flags.set(flag.key, flag);
  }

  /**
   * Remove a feature flag
   * @param key - Feature flag key
   */
  removeFlag(key: string): void {
    this.flags.delete(key);
  }

  /**
   * Check if a feature flag is enabled for the current user
   * @param key - Feature flag key
   * @param context - Optional user context override
   * @returns Feature flag evaluation result
   */
  isEnabled(key: string, context?: Partial<UserContext>): FeatureFlagResult {
    const flag = this.flags.get(key);
    
    if (!flag) {
      return {
        enabled: false,
        reason: 'Flag not found',
      };
    }

    const userCtx = { ...this.userContext, ...context } as UserContext;
    
    if (!userCtx) {
      const envValue = flag.environments[this.environment];
      const enabled = envValue !== undefined ? envValue : flag.defaultValue;
      
      return {
        enabled,
        reason: envValue !== undefined ? 'Environment override' : 'Default value',
      };
    }

    const result = this.evaluateFlag(flag, userCtx);
    
    // Record analytics event
    this.recordAnalyticsEvent({
      flagKey: key,
      userId: userCtx.id,
      organizationId: userCtx.organizationId,
      enabled: result.enabled,
      variant: result.variant,
      timestamp: Date.now(),
      context: {
        environment: this.environment,
        reason: result.reason,
      },
    });

    return result;
  }

  /**
   * Get feature flag configuration
   * @param key - Feature flag key
   * @returns Feature flag configuration or null if not found
   */
  getFlag(key: string): FeatureFlag | null {
    return this.flags.get(key) || null;
  }

  /**
   * Get all feature flags
   * @returns Array of all feature flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get flags by tag
   * @param tag - Tag to filter by
   * @returns Array of feature flags with the specified tag
   */
  getFlagsByTag(tag: string): FeatureFlag[] {
    return this.getAllFlags().filter(flag => flag.metadata.tags.includes(tag));
  }

  /**
   * Evaluate a specific feature flag for a user
   * @param flag - Feature flag configuration
   * @param userCtx - User context
   * @returns Feature flag evaluation result
   */
  private evaluateFlag(flag: FeatureFlag, userCtx: UserContext): FeatureFlagResult {
    // Check dependencies first
    if (flag.metadata.dependencies) {
      for (const dependency of flag.metadata.dependencies) {
        const dependencyResult = this.isEnabled(dependency, userCtx);
        if (!dependencyResult.enabled) {
          return {
            enabled: false,
            reason: `Dependency '${dependency}' not enabled`,
          };
        }
      }
    }

    // Check environment override
    const envValue = flag.environments[this.environment];
    if (envValue !== undefined && !envValue) {
      return {
        enabled: false,
        reason: 'Disabled by environment',
      };
    }

    // Check specific user targeting
    if (flag.rollout.userIds?.includes(userCtx.id)) {
      return {
        enabled: true,
        reason: 'User explicitly targeted',
      };
    }

    // Check organization targeting
    if (flag.rollout.organizationIds?.includes(userCtx.organizationId)) {
      return {
        enabled: true,
        reason: 'Organization explicitly targeted',
      };
    }

    // Check user attributes
    if (flag.rollout.userAttributes) {
      const attributeMatch = this.checkUserAttributes(flag.rollout.userAttributes, userCtx);
      if (!attributeMatch) {
        return {
          enabled: false,
          reason: 'User attributes do not match',
        };
      }
    }

    // Check percentage rollout
    const userHash = this.hashUser(userCtx.id, flag.key);
    const userPercentile = (userHash % 100) + 1;

    if (userPercentile > flag.rollout.percentage) {
      return {
        enabled: false,
        reason: `User percentile ${userPercentile} > rollout ${flag.rollout.percentage}%`,
      };
    }

    // Handle A/B testing
    if (flag.rollout.abTest?.enabled && flag.rollout.abTest.variants.length > 0) {
      const variant = this.selectAbTestVariant(flag.rollout.abTest.variants, userHash);
      return {
        enabled: true,
        variant: variant.name,
        config: variant.config,
        reason: `A/B test variant: ${variant.name}`,
      };
    }

    return {
      enabled: envValue !== undefined ? envValue : flag.defaultValue,
      reason: 'Default rollout behavior',
    };
  }

  /**
   * Check if user attributes match flag criteria
   * @param criteria - User attribute criteria
   * @param userCtx - User context
   * @returns True if attributes match
   */
  private checkUserAttributes(
    criteria: NonNullable<FeatureFlag['rollout']['userAttributes']>,
    userCtx: UserContext
  ): boolean {
    // Check role
    if (criteria.role && !criteria.role.includes(userCtx.role)) {
      return false;
    }

    // Check plan
    if (criteria.plan && !criteria.plan.includes(userCtx.plan)) {
      return false;
    }

    // Check registration date
    if (criteria.registrationDate) {
      const userRegDate = new Date(userCtx.registrationDate);
      
      if (criteria.registrationDate.after) {
        const afterDate = new Date(criteria.registrationDate.after);
        if (userRegDate <= afterDate) return false;
      }
      
      if (criteria.registrationDate.before) {
        const beforeDate = new Date(criteria.registrationDate.before);
        if (userRegDate >= beforeDate) return false;
      }
    }

    return true;
  }

  /**
   * Select A/B test variant based on user hash
   * @param variants - Available variants
   * @param userHash - User hash value
   * @returns Selected variant
   */
  private selectAbTestVariant(
    variants: NonNullable<FeatureFlag['rollout']['abTest']>['variants'],
    userHash: number
  ): NonNullable<FeatureFlag['rollout']['abTest']>['variants'][0] {
    const percentile = userHash % 100;
    let cumulativePercentage = 0;

    for (const variant of variants) {
      cumulativePercentage += variant.percentage;
      if (percentile < cumulativePercentage) {
        return variant;
      }
    }

    // Fallback to first variant
    return variants[0];
  }

  /**
   * Generate deterministic hash for user and flag combination
   * @param userId - User ID
   * @param flagKey - Flag key
   * @returns Hash value
   */
  private hashUser(userId: string, flagKey: string): number {
    const combined = `${userId}:${flagKey}`;
    let hash = 0;
    
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash);
  }

  /**
   * Record analytics event for feature flag usage
   * @param event - Analytics event
   */
  private recordAnalyticsEvent(event: FeatureFlagEvent): void {
    this.analytics.unshift(event);
    
    // Limit analytics array size
    if (this.analytics.length > this.maxAnalyticsEvents) {
      this.analytics = this.analytics.slice(0, this.maxAnalyticsEvents);
    }
  }

  /**
   * Get analytics events for a specific flag
   * @param flagKey - Flag key
   * @param limit - Maximum number of events to return
   * @returns Array of analytics events
   */
  getAnalytics(flagKey?: string, limit: number = 100): FeatureFlagEvent[] {
    let events = this.analytics;
    
    if (flagKey) {
      events = events.filter(event => event.flagKey === flagKey);
    }
    
    return events.slice(0, limit);
  }

  /**
   * Get feature flag usage statistics
   * @param flagKey - Optional flag key to filter by
   * @returns Usage statistics
   */
  getUsageStatistics(flagKey?: string): {
    totalEvents: number;
    enabledCount: number;
    disabledCount: number;
    uniqueUsers: number;
    variantDistribution: Record<string, number>;
  } {
    let events = this.analytics;
    
    if (flagKey) {
      events = events.filter(event => event.flagKey === flagKey);
    }

    const uniqueUsers = new Set(events.map(event => event.userId)).size;
    const enabledCount = events.filter(event => event.enabled).length;
    const variantDistribution: Record<string, number> = {};

    events.forEach(event => {
      if (event.variant) {
        variantDistribution[event.variant] = (variantDistribution[event.variant] || 0) + 1;
      }
    });

    return {
      totalEvents: events.length,
      enabledCount,
      disabledCount: events.length - enabledCount,
      uniqueUsers,
      variantDistribution,
    };
  }

  /**
   * Export feature flags configuration
   * @returns JSON string of all flags
   */
  exportFlags(): string {
    const flagsArray = this.getAllFlags();
    return JSON.stringify(flagsArray, null, 2);
  }

  /**
   * Import feature flags configuration
   * @param json - JSON string of flags
   */
  importFlags(json: string): void {
    try {
      const flagsArray = JSON.parse(json) as FeatureFlag[];
      
      flagsArray.forEach(flag => {
        this.addFlag(flag);
      });
    } catch (error) {
      throw new Error(`Failed to import flags: ${error}`);
    }
  }

  /**
   * Clear all analytics data
   */
  clearAnalytics(): void {
    this.analytics = [];
  }

  /**
   * Validate feature flag configuration
   * @param flag - Feature flag to validate
   * @returns Validation errors (empty array if valid)
   */
  validateFlag(flag: FeatureFlag): string[] {
    const errors: string[] = [];

    // Validate required fields
    if (!flag.key) errors.push('Flag key is required');
    if (!flag.name) errors.push('Flag name is required');
    if (!flag.description) errors.push('Flag description is required');

    // Validate rollout percentage
    if (flag.rollout.percentage < 0 || flag.rollout.percentage > 100) {
      errors.push('Rollout percentage must be between 0 and 100');
    }

    // Validate A/B test configuration
    if (flag.rollout.abTest?.enabled) {
      const totalPercentage = flag.rollout.abTest.variants.reduce(
        (sum, variant) => sum + variant.percentage, 0
      );
      
      if (totalPercentage !== 100) {
        errors.push('A/B test variant percentages must sum to 100');
      }
      
      if (flag.rollout.abTest.variants.length === 0) {
        errors.push('A/B test must have at least one variant');
      }
    }

    // Validate dependencies
    if (flag.metadata.dependencies) {
      for (const dependency of flag.metadata.dependencies) {
        if (!this.flags.has(dependency)) {
          errors.push(`Dependency '${dependency}' does not exist`);
        }
      }
    }

    return errors;
  }
}

/**
 * Global feature flags manager instance
 */
export const featureFlags = new FeatureFlagsManager(
  (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development'
);

/**
 * React hook for using feature flags
 * @param flagKey - Feature flag key
 * @param context - Optional user context override
 * @returns Feature flag result
 */
export function useFeatureFlag(
  flagKey: string, 
  context?: Partial<UserContext>
): FeatureFlagResult {
  return featureFlags.isEnabled(flagKey, context);
}

/**
 * Higher-order component for feature flag gating
 * @param flagKey - Feature flag key
 * @param fallback - Component to render when flag is disabled
 * @returns HOC function
 */
export function withFeatureFlag<P extends object>(
  flagKey: string,
  fallback?: React.ComponentType<P>
) {
  return function FeatureFlagWrapper(WrappedComponent: React.ComponentType<P>) {
    return function FeatureFlagComponent(props: P) {
      const flagResult = useFeatureFlag(flagKey);
      
      if (!flagResult.enabled) {
        return fallback ? React.createElement(fallback, props) : null;
      }
      
      return React.createElement(WrappedComponent, {
        ...props,
        featureFlagResult: flagResult,
      } as P & { featureFlagResult: FeatureFlagResult });
    };
  };
}

export default {
  FeatureFlagsManager,
  featureFlags,
  useFeatureFlag,
  withFeatureFlag,
};