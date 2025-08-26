import { renderHook, act } from '@testing-library/react';
import { useGrokSuggestions, useOptimizationTips } from '../../hooks/useGrokSuggestions';
import type { IntacctPreferences } from '../../components/intacct-preferences';

// Mock the Grok service
jest.mock('../../lib/grok-intacct-suggestions', () => ({
  grokSuggestionService: {
    generatePreferenceSuggestions: jest.fn(),
    getOptimizationTips: jest.fn(),
    submitSuggestionFeedback: jest.fn(),
  },
}));

const { grokSuggestionService } = require('../../lib/grok-intacct-suggestions');

describe('useGrokSuggestions', () => {
  const mockPreferences: IntacctPreferences = {
    userId: 'user1' as any,
    organizationId: 'org1' as any,
    userRole: { id: 'user', name: 'User', permissions: ['read', 'write'] },
    notifications: { email: true, sms: false, inApp: true, desktop: true },
    uiCustomizations: {
      theme: 'light',
      compactMode: false,
      sidebarCollapsed: false,
      showGridLines: true,
      highContrast: false,
      fontSize: 'medium',
      primaryColor: '#3B82F6',
    },
    dashboardWidgets: {
      cashFlow: { enabled: true, position: 0, size: 'large' },
      revenueChart: { enabled: true, position: 1, size: 'large' },
      expenseSummary: { enabled: true, position: 2, size: 'medium' },
      quickActions: { enabled: true, position: 3, size: 'small' },
      recentTransactions: { enabled: true, position: 4, size: 'medium' },
      alerts: { enabled: true, position: 5, size: 'small' },
    },
    productivityTools: {
      keyboardShortcuts: {
        'Ctrl+S': true,
        'Ctrl+N': true,
        'Ctrl+F': true,
        'Ctrl+Z': true,
        'Ctrl+Y': true,
      },
      autoSave: true,
      autoSaveInterval: 300,
      bulkOperations: true,
      quickFilters: true,
      smartSuggestions: true,
      templateLibrary: true,
    },
    grokAIEnabled: true,
    lastUpdated: Date.now(),
  };

  const mockSuggestionResponse = {
    suggestions: [
      {
        id: 'suggestion-1',
        type: 'ui_optimization' as const,
        title: 'Enable Compact Mode',
        description: 'Switch to compact mode for better information density',
        category: 'ui' as const,
        impact: 'medium' as const,
        confidence: 0.8,
        suggestedChanges: {
          section: 'uiCustomizations' as const,
          changes: { compactMode: true },
          explanation: 'Compact mode reduces white space',
        },
        implementationSteps: ['Go to UI tab', 'Toggle compact mode'],
        potentialBenefits: ['More data on screen', 'Reduced scrolling'],
      },
      {
        id: 'suggestion-2',
        type: 'productivity_enhancement' as const,
        title: 'Reduce Auto-Save Interval',
        description: 'Set auto-save to 60 seconds for better data protection',
        category: 'productivity' as const,
        impact: 'high' as const,
        confidence: 0.9,
        suggestedChanges: {
          section: 'productivityTools' as const,
          changes: { autoSaveInterval: 60 },
          explanation: 'Faster auto-save prevents data loss',
        },
        implementationSteps: ['Go to Productivity tab', 'Change auto-save interval'],
        potentialBenefits: ['Better data protection', 'Reduced risk of data loss'],
      },
    ],
    overallScore: 85,
    generalRecommendations: ['Regular preference reviews recommended'],
    confidenceLevel: 0.8,
    generatedAt: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    grokSuggestionService.generatePreferenceSuggestions.mockResolvedValue(mockSuggestionResponse);
    grokSuggestionService.submitSuggestionFeedback.mockResolvedValue(undefined);
  });

  describe('Basic functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useGrokSuggestions());

      expect(result.current.suggestions).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.overallScore).toBe(0);
      expect(result.current.confidenceLevel).toBe(0);
      expect(result.current.generalRecommendations).toEqual([]);
    });

    it('should respect enabled option', () => {
      const { result } = renderHook(() => useGrokSuggestions({ enabled: false }));

      act(() => {
        result.current.generateSuggestions(mockPreferences);
      });

      expect(grokSuggestionService.generatePreferenceSuggestions).not.toHaveBeenCalled();
    });
  });

  describe('Generate suggestions', () => {
    it('should generate suggestions successfully', async () => {
      const { result } = renderHook(() => useGrokSuggestions());

      await act(async () => {
        await result.current.generateSuggestions(mockPreferences);
      });

      expect(result.current.suggestions).toHaveLength(2);
      expect(result.current.suggestions[0].id).toBe('suggestion-1');
      expect(result.current.suggestions[1].id).toBe('suggestion-2');
      expect(result.current.overallScore).toBe(85);
      expect(result.current.confidenceLevel).toBe(0.8);
      expect(result.current.generalRecommendations).toEqual(['Regular preference reviews recommended']);
      expect(result.current.lastUpdated).toBeDefined();
    });

    it('should handle generation errors', async () => {
      const errorMessage = 'API Error';
      grokSuggestionService.generatePreferenceSuggestions.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useGrokSuggestions());

      await act(async () => {
        await result.current.generateSuggestions(mockPreferences);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.suggestions).toEqual([]);
    });

    it('should show loading state during generation', async () => {
      let resolvePromise: (value: any) => void;
      const mockPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      grokSuggestionService.generatePreferenceSuggestions.mockReturnValue(mockPromise);

      const { result } = renderHook(() => useGrokSuggestions());

      act(() => {
        result.current.generateSuggestions(mockPreferences);
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!(mockSuggestionResponse);
        await mockPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should create default user behavior when not provided', async () => {
      const { result } = renderHook(() => useGrokSuggestions());

      await act(async () => {
        await result.current.generateSuggestions(mockPreferences);
      });

      expect(grokSuggestionService.generatePreferenceSuggestions).toHaveBeenCalledWith(
        expect.objectContaining({
          currentPreferences: mockPreferences,
          userBehavior: expect.objectContaining({
            sessionDuration: 3600,
            mostUsedFeatures: ['dashboard', 'transactions', 'reports'],
            userRole: 'user',
            organizationType: 'financial_services',
          }),
        })
      );
    });

    it('should use provided user behavior', async () => {
      const customBehavior = {
        sessionDuration: 7200,
        mostUsedFeatures: ['analytics', 'reports'],
        frequentlyVisitedTabs: ['dashboard', 'ui'],
        commonWorkflows: ['reporting'],
        timeOfDayUsage: { morning: 0.8, afternoon: 0.2 },
        errorPatterns: [],
        performanceIssues: ['slow_loading'],
        userRole: 'admin',
        organizationType: 'enterprise',
      };

      const { result } = renderHook(() => useGrokSuggestions());

      await act(async () => {
        await result.current.generateSuggestions(mockPreferences, customBehavior);
      });

      expect(grokSuggestionService.generatePreferenceSuggestions).toHaveBeenCalledWith(
        expect.objectContaining({
          currentPreferences: mockPreferences,
          userBehavior: expect.objectContaining(customBehavior),
        })
      );
    });
  });

  describe('Suggestion management', () => {
    it('should dismiss suggestions', async () => {
      const { result } = renderHook(() => useGrokSuggestions());

      await act(async () => {
        await result.current.generateSuggestions(mockPreferences);
      });

      expect(result.current.suggestions).toHaveLength(2);

      act(() => {
        result.current.dismissSuggestion('suggestion-1');
      });

      expect(result.current.suggestions).toHaveLength(1);
      expect(result.current.suggestions[0].id).toBe('suggestion-2');
    });

    it('should apply suggestions correctly', () => {
      const { result } = renderHook(() => useGrokSuggestions());

      const suggestion = {
        id: 'test-suggestion',
        type: 'ui_optimization' as const,
        title: 'Test Suggestion',
        description: 'Test description',
        category: 'ui' as const,
        impact: 'medium' as const,
        confidence: 0.8,
        suggestedChanges: {
          section: 'uiCustomizations' as const,
          changes: { compactMode: true },
          explanation: 'Test explanation',
        },
        implementationSteps: ['Test step'],
        potentialBenefits: ['Test benefit'],
      };

      const updatedPreferences = result.current.applySuggestion(suggestion, mockPreferences);

      expect(updatedPreferences.uiCustomizations.compactMode).toBe(true);
      expect(updatedPreferences.lastUpdated).toBeGreaterThan(mockPreferences.lastUpdated);
    });

    it('should handle invalid suggestion sections gracefully', () => {
      const { result } = renderHook(() => useGrokSuggestions());

      const invalidSuggestion = {
        id: 'invalid-suggestion',
        type: 'ui_optimization' as const,
        title: 'Invalid Suggestion',
        description: 'Test description',
        category: 'ui' as const,
        impact: 'medium' as const,
        confidence: 0.8,
        suggestedChanges: {
          section: 'invalidSection' as any,
          changes: { invalidProp: true },
          explanation: 'Test explanation',
        },
        implementationSteps: ['Test step'],
        potentialBenefits: ['Test benefit'],
      };

      const updatedPreferences = result.current.applySuggestion(invalidSuggestion, mockPreferences);

      expect(updatedPreferences).toBe(mockPreferences);
    });

    it('should submit feedback successfully', async () => {
      const { result } = renderHook(() => useGrokSuggestions());

      await act(async () => {
        await result.current.generateSuggestions(mockPreferences);
      });

      const feedback = {
        suggestionId: 'suggestion-1',
        rating: 5 as const,
        implemented: true,
        helpful: true,
        comments: 'Great suggestion!',
      };

      await act(async () => {
        await result.current.submitFeedback(feedback);
      });

      expect(grokSuggestionService.submitSuggestionFeedback).toHaveBeenCalledWith(feedback);
    });

    it('should remove implemented suggestions after feedback', async () => {
      const { result } = renderHook(() => useGrokSuggestions());

      await act(async () => {
        await result.current.generateSuggestions(mockPreferences);
      });

      expect(result.current.suggestions).toHaveLength(2);

      const feedback = {
        suggestionId: 'suggestion-1',
        rating: 5 as const,
        implemented: true,
        helpful: true,
      };

      await act(async () => {
        await result.current.submitFeedback(feedback);
      });

      expect(result.current.suggestions).toHaveLength(1);
      expect(result.current.suggestions[0].id).toBe('suggestion-2');
    });

    it('should handle feedback submission errors', async () => {
      const errorMessage = 'Feedback failed';
      grokSuggestionService.submitSuggestionFeedback.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useGrokSuggestions());

      await act(async () => {
        await result.current.generateSuggestions(mockPreferences);
      });

      const feedback = {
        suggestionId: 'suggestion-1',
        rating: 5 as const,
        implemented: true,
        helpful: true,
      };

      await expect(
        act(async () => {
          await result.current.submitFeedback(feedback);
        })
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('Utility functions', () => {
    it('should clear all suggestions', async () => {
      const { result } = renderHook(() => useGrokSuggestions());

      await act(async () => {
        await result.current.generateSuggestions(mockPreferences);
      });

      expect(result.current.suggestions).toHaveLength(2);
      expect(result.current.overallScore).toBe(85);

      act(() => {
        result.current.clearSuggestions();
      });

      expect(result.current.suggestions).toEqual([]);
      expect(result.current.overallScore).toBe(0);
      expect(result.current.confidenceLevel).toBe(0);
      expect(result.current.generalRecommendations).toEqual([]);
      expect(result.current.lastUpdated).toBeNull();
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should retry failed requests', async () => {
      const { result } = renderHook(() => useGrokSuggestions());

      // First call fails
      grokSuggestionService.generatePreferenceSuggestions.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await result.current.generateSuggestions(mockPreferences);
      });

      expect(result.current.isError).toBe(true);

      // Retry should work
      grokSuggestionService.generatePreferenceSuggestions.mockResolvedValue(mockSuggestionResponse);

      await act(async () => {
        result.current.retry();
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.suggestions).toHaveLength(2);
    });

    it('should not retry when no previous request was made', () => {
      const { result } = renderHook(() => useGrokSuggestions());

      act(() => {
        result.current.retry();
      });

      expect(grokSuggestionService.generatePreferenceSuggestions).not.toHaveBeenCalled();
    });
  });

  describe('Filter dismissed suggestions', () => {
    it('should filter out dismissed suggestions on new generation', async () => {
      const { result } = renderHook(() => useGrokSuggestions());

      await act(async () => {
        await result.current.generateSuggestions(mockPreferences);
      });

      act(() => {
        result.current.dismissSuggestion('suggestion-1');
      });

      expect(result.current.suggestions).toHaveLength(1);

      // Generate again - dismissed suggestion should not reappear
      await act(async () => {
        await result.current.generateSuggestions(mockPreferences);
      });

      expect(result.current.suggestions).toHaveLength(1);
      expect(result.current.suggestions[0].id).toBe('suggestion-2');
    });
  });
});

describe('useOptimizationTips', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useOptimizationTips());

    expect(result.current.tips).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should get optimization tips successfully', async () => {
    const mockTips = [
      'Enable auto-save for data protection',
      'Use keyboard shortcuts for efficiency',
      'Customize dashboard layout',
    ];

    grokSuggestionService.getOptimizationTips.mockResolvedValue(mockTips);

    const { result } = renderHook(() => useOptimizationTips());

    await act(async () => {
      await result.current.getTips(mockPreferences);
    });

    expect(result.current.tips).toEqual(mockTips);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors when getting tips', async () => {
    const errorMessage = 'Tips failed';
    grokSuggestionService.getOptimizationTips.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useOptimizationTips());

    await act(async () => {
      await result.current.getTips(mockPreferences);
    });

    expect(result.current.tips).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(errorMessage);
  });

  it('should show loading state while getting tips', async () => {
    let resolvePromise: (value: any) => void;
    const mockPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    grokSuggestionService.getOptimizationTips.mockReturnValue(mockPromise);

    const { result } = renderHook(() => useOptimizationTips());

    act(() => {
      result.current.getTips(mockPreferences);
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise!(['Tip 1', 'Tip 2']);
      await mockPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should pass focus parameter to service', async () => {
    grokSuggestionService.getOptimizationTips.mockResolvedValue([]);

    const { result } = renderHook(() => useOptimizationTips());

    await act(async () => {
      await result.current.getTips(mockPreferences, 'dashboard');
    });

    expect(grokSuggestionService.getOptimizationTips).toHaveBeenCalledWith(mockPreferences, 'dashboard');
  });
});