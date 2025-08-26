import { useState, useCallback, useEffect } from 'react';
import { 
  grokSuggestionService, 
  GrokSuggestionRequest, 
  GrokSuggestionResponse, 
  GrokPreferenceSuggestion,
  SuggestionFeedback,
  UserBehaviorData 
} from '../lib/grok-intacct-suggestions';
import type { IntacctPreferences } from '../components/intacct-preferences';

export interface UseGrokSuggestionsOptions {
  enabled?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // in minutes
}

export interface UseGrokSuggestionsResult {
  suggestions: GrokPreferenceSuggestion[];
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  lastUpdated: number | null;
  overallScore: number;
  confidenceLevel: number;
  generalRecommendations: string[];
  
  // Actions
  generateSuggestions: (preferences: IntacctPreferences, userBehavior?: UserBehaviorData) => Promise<void>;
  dismissSuggestion: (suggestionId: string) => void;
  applySuggestion: (suggestion: GrokPreferenceSuggestion, currentPreferences: IntacctPreferences) => IntacctPreferences;
  submitFeedback: (feedback: SuggestionFeedback) => Promise<void>;
  clearSuggestions: () => void;
  retry: () => void;
}

/**
 * Custom hook for managing Grok AI preference suggestions
 */
export function useGrokSuggestions(options: UseGrokSuggestionsOptions = {}): UseGrokSuggestionsResult {
  const { enabled = true, autoRefresh = false, refreshInterval = 60 } = options;

  const [suggestions, setSuggestions] = useState<GrokPreferenceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [overallScore, setOverallScore] = useState(0);
  const [confidenceLevel, setConfidenceLevel] = useState(0);
  const [generalRecommendations, setGeneralRecommendations] = useState<string[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [lastRequest, setLastRequest] = useState<{
    preferences: IntacctPreferences;
    userBehavior?: UserBehaviorData;
  } | null>(null);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !enabled || !lastRequest) return;

    const interval = setInterval(() => {
      if (lastRequest) {
        generateSuggestions(lastRequest.preferences, lastRequest.userBehavior);
      }
    }, refreshInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, enabled, refreshInterval, lastRequest]);

  const generateSuggestions = useCallback(async (
    preferences: IntacctPreferences,
    userBehavior?: UserBehaviorData
  ) => {
    if (!enabled) {
      console.warn('Grok suggestions are disabled');
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      // Create default user behavior if not provided
      const defaultBehavior: UserBehaviorData = {
        sessionDuration: 3600, // 1 hour default
        mostUsedFeatures: ['dashboard', 'transactions', 'reports'],
        frequentlyVisitedTabs: ['general', 'dashboard'],
        commonWorkflows: ['data_entry', 'reporting', 'analysis'],
        timeOfDayUsage: { morning: 0.4, afternoon: 0.6 },
        errorPatterns: [],
        performanceIssues: [],
        userRole: preferences.userRole.name.toLowerCase(),
        organizationType: 'financial_services',
        ...userBehavior
      };

      const request: GrokSuggestionRequest = {
        currentPreferences: preferences,
        userBehavior: defaultBehavior,
        suggestionTypes: ['ui_optimization', 'productivity_enhancement', 'dashboard_layout', 'workflow_improvement'],
        maxSuggestions: 5,
        includeExplanations: true
      };

      const response: GrokSuggestionResponse = await grokSuggestionService.generatePreferenceSuggestions(request);

      // Filter out dismissed suggestions
      const filteredSuggestions = response.suggestions.filter(
        suggestion => !dismissedSuggestions.has(suggestion.id)
      );

      setSuggestions(filteredSuggestions);
      setOverallScore(response.overallScore);
      setConfidenceLevel(response.confidenceLevel);
      setGeneralRecommendations(response.generalRecommendations);
      setLastUpdated(response.generatedAt);
      setLastRequest({ preferences, userBehavior });

    } catch (err) {
      setIsError(true);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate suggestions';
      setError(errorMessage);
      console.error('Failed to generate Grok suggestions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, dismissedSuggestions]);

  const dismissSuggestion = useCallback((suggestionId: string) => {
    setDismissedSuggestions(prev => new Set(prev).add(suggestionId));
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, []);

  const applySuggestion = useCallback((
    suggestion: GrokPreferenceSuggestion,
    currentPreferences: IntacctPreferences
  ): IntacctPreferences => {
    try {
      const updatedPreferences = { ...currentPreferences };
      const { section, changes } = suggestion.suggestedChanges;

      if (section in updatedPreferences) {
        updatedPreferences[section] = {
          ...updatedPreferences[section],
          ...changes
        };
        updatedPreferences.lastUpdated = Date.now();
      }

      return updatedPreferences;
    } catch (err) {
      console.error('Failed to apply suggestion:', err);
      return currentPreferences;
    }
  }, []);

  const submitFeedback = useCallback(async (feedback: SuggestionFeedback) => {
    try {
      await grokSuggestionService.submitSuggestionFeedback(feedback);
      
      // If implemented, remove suggestion from list
      if (feedback.implemented) {
        setSuggestions(prev => prev.filter(s => s.id !== feedback.suggestionId));
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      throw new Error('Failed to submit feedback');
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setOverallScore(0);
    setConfidenceLevel(0);
    setGeneralRecommendations([]);
    setLastUpdated(null);
    setIsError(false);
    setError(null);
    setDismissedSuggestions(new Set());
    setLastRequest(null);
  }, []);

  const retry = useCallback(() => {
    if (lastRequest) {
      generateSuggestions(lastRequest.preferences, lastRequest.userBehavior);
    }
  }, [generateSuggestions, lastRequest]);

  return {
    suggestions,
    isLoading,
    isError,
    error,
    lastUpdated,
    overallScore,
    confidenceLevel,
    generalRecommendations,
    generateSuggestions,
    dismissSuggestion,
    applySuggestion,
    submitFeedback,
    clearSuggestions,
    retry,
  };
}

/**
 * Hook for getting optimization tips
 */
export function useOptimizationTips() {
  const [tips, setTips] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTips = useCallback(async (preferences: IntacctPreferences, focus?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const optimizationTips = await grokSuggestionService.getOptimizationTips(preferences, focus);
      setTips(optimizationTips);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get tips';
      setError(errorMessage);
      setTips([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    tips,
    isLoading,
    error,
    getTips,
  };
}

/**
 * Hook for dashboard efficiency analysis
 */
export function useDashboardAnalysis() {
  const [analysis, setAnalysis] = useState<{
    score: number;
    recommendations: string[];
    optimizedLayout: Record<string, any>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeDashboard = useCallback(async (preferences: IntacctPreferences) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await grokSuggestionService.analyzeDashboardEfficiency(preferences);
      setAnalysis(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze dashboard';
      setError(errorMessage);
      setAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    analysis,
    isLoading,
    error,
    analyzeDashboard,
  };
}

/**
 * Hook for personalized insights
 */
export function usePersonalizedInsights() {
  const [insights, setInsights] = useState<{
    insights: string[];
    roleSpecificTips: string[];
    industryBestPractices: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getInsights = useCallback(async (preferences: IntacctPreferences, userRole: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await grokSuggestionService.getPersonalizedInsights(preferences, userRole);
      setInsights(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get insights';
      setError(errorMessage);
      setInsights(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    insights,
    isLoading,
    error,
    getInsights,
  };
}