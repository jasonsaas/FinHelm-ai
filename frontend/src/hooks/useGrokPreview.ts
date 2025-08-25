/**
 * React Hook for Grok API Preview Integration
 * Provides debounced preview functionality with loading states and error handling
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { grokService, GrokPreviewRequest, GrokPreviewResponse } from '../services/grokService';
import { CustomAgentFormData } from '../types/agent';

export interface UseGrokPreviewOptions {
  debounceMs?: number;
  organizationId?: string;
  userId?: string;
  onSuccess?: (response: GrokPreviewResponse) => void;
  onError?: (error: string) => void;
}

export interface UseGrokPreviewReturn {
  previewResponse: string;
  isLoading: boolean;
  error: string | null;
  executionTime: number;
  tokensUsed: number;
  cost: number;
  isHealthy: boolean;
  rateLimitRemaining: number | null;
  preview: (agentData: CustomAgentFormData, testQuery: string) => Promise<void>;
  clearPreview: () => void;
  checkHealth: () => Promise<void>;
}

export function useGrokPreview(options: UseGrokPreviewOptions = {}): UseGrokPreviewReturn {
  const {
    debounceMs = 1000,
    organizationId,
    userId,
    onSuccess,
    onError,
  } = options;

  // State management
  const [previewResponse, setPreviewResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number>(0);
  const [tokensUsed, setTokensUsed] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [isHealthy, setIsHealthy] = useState<boolean>(true);
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);

  // Ref to track the current request to avoid race conditions
  const currentRequestRef = useRef<AbortController | null>(null);
  const mountedRef = useRef<boolean>(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (currentRequestRef.current) {
        currentRequestRef.current.abort();
      }
    };
  }, []);

  /**
   * Preview agent response with Grok API
   */
  const preview = useCallback(async (
    agentData: CustomAgentFormData, 
    testQuery: string
  ): Promise<void> => {
    // Validate inputs
    if (!testQuery.trim()) {
      setError('Test query cannot be empty');
      return;
    }

    if (!agentData.prompt.trim()) {
      setError('Agent prompt cannot be empty');
      return;
    }

    // Cancel any existing request
    if (currentRequestRef.current) {
      currentRequestRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    currentRequestRef.current = abortController;

    // Reset state
    setIsLoading(true);
    setError(null);
    setPreviewResponse('');

    try {
      const request: GrokPreviewRequest = {
        prompt: agentData.prompt,
        query: testQuery,
        model: agentData.model,
        temperature: agentData.temperature,
        maxTokens: agentData.maxTokens,
        organizationId,
        userId,
      };

      const response = await grokService.previewAgentResponse(request, debounceMs);

      // Check if component is still mounted and request wasn't cancelled
      if (!mountedRef.current || abortController.signal.aborted) {
        return;
      }

      if (response.success) {
        setPreviewResponse(response.response);
        setExecutionTime(response.executionTime);
        setTokensUsed(response.tokensUsed);
        setCost(response.cost || 0);
        setError(null);

        // Call success callback if provided
        if (onSuccess) {
          onSuccess(response);
        }
      } else {
        const errorMessage = response.error || 'Preview failed with unknown error';
        setError(errorMessage);
        setPreviewResponse('');
        
        // Call error callback if provided
        if (onError) {
          onError(errorMessage);
        }
      }
    } catch (err) {
      // Check if component is still mounted and request wasn't cancelled
      if (!mountedRef.current || abortController.signal.aborted) {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setPreviewResponse('');

      // Call error callback if provided
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      // Check if component is still mounted
      if (mountedRef.current) {
        setIsLoading(false);
        currentRequestRef.current = null;
      }
    }
  }, [debounceMs, organizationId, userId, onSuccess, onError]);

  /**
   * Clear preview state
   */
  const clearPreview = useCallback(() => {
    // Cancel any pending request
    if (currentRequestRef.current) {
      currentRequestRef.current.abort();
      currentRequestRef.current = null;
    }

    setPreviewResponse('');
    setError(null);
    setExecutionTime(0);
    setTokensUsed(0);
    setCost(0);
    setIsLoading(false);
  }, []);

  /**
   * Check Grok API health and rate limits
   */
  const checkHealth = useCallback(async () => {
    try {
      const healthStatus = await grokService.healthCheck();
      
      if (mountedRef.current) {
        setIsHealthy(healthStatus.status === 'healthy');
        setRateLimitRemaining(healthStatus.rateLimitRemaining || null);

        // Set error state if service is down
        if (healthStatus.status === 'down') {
          setError('Grok API is currently unavailable');
        } else if (healthStatus.status === 'degraded') {
          setError('Grok API rate limit reached. Please try again later.');
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setIsHealthy(false);
        setError('Unable to connect to Grok API');
      }
    }
  }, []);

  // Check health on mount
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return {
    previewResponse,
    isLoading,
    error,
    executionTime,
    tokensUsed,
    cost,
    isHealthy,
    rateLimitRemaining,
    preview,
    clearPreview,
    checkHealth,
  };
}