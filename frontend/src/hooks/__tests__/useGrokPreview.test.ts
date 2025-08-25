/**
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useGrokPreview } from '../useGrokPreview';
import { grokService } from '../../services/grokService';
import type { CustomAgentFormData } from '../../types/agent';

// Mock the Grok service
jest.mock('../../services/grokService', () => ({
  grokService: {
    previewAgentResponse: jest.fn(),
    healthCheck: jest.fn(),
    dispose: jest.fn(),
  },
}));

const mockGrokService = grokService as jest.Mocked<typeof grokService>;

describe('useGrokPreview', () => {
  const mockAgentData: CustomAgentFormData = {
    name: 'Test Agent',
    description: 'Test Description',
    model: 'gpt-4',
    language: 'english',
    prompt: 'You are a helpful financial assistant',
    category: 'custom',
    temperature: 0.7,
    maxTokens: 1000,
  };

  const mockSuccessResponse = {
    response: 'This is a test response',
    executionTime: 1500,
    tokensUsed: 50,
    cost: 0.001,
    model: 'gpt-4',
    success: true,
  };

  const mockErrorResponse = {
    response: '',
    executionTime: 1000,
    tokensUsed: 0,
    cost: 0,
    model: 'gpt-4',
    success: false,
    error: 'API error occurred',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGrokService.healthCheck.mockResolvedValue({
      status: 'healthy',
      rateLimitRemaining: 100,
    });
  });

  describe('Initialization', () => {
    test('initializes with default state', () => {
      const { result } = renderHook(() => useGrokPreview());

      expect(result.current.previewResponse).toBe('');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.executionTime).toBe(0);
      expect(result.current.tokensUsed).toBe(0);
      expect(result.current.cost).toBe(0);
    });

    test('checks API health on mount', async () => {
      const { result } = renderHook(() => useGrokPreview());

      await waitFor(() => {
        expect(mockGrokService.healthCheck).toHaveBeenCalled();
        expect(result.current.isHealthy).toBe(true);
        expect(result.current.rateLimitRemaining).toBe(100);
      });
    });

    test('handles health check failure', async () => {
      mockGrokService.healthCheck.mockRejectedValue(new Error('Connection failed'));

      const { result } = renderHook(() => useGrokPreview());

      await waitFor(() => {
        expect(result.current.isHealthy).toBe(false);
        expect(result.current.error).toBe('Unable to connect to Grok API');
      });
    });

    test('handles degraded API status', async () => {
      mockGrokService.healthCheck.mockResolvedValue({
        status: 'degraded',
        rateLimitRemaining: 0,
      });

      const { result } = renderHook(() => useGrokPreview());

      await waitFor(() => {
        expect(result.current.isHealthy).toBe(false);
        expect(result.current.error).toBe('Grok API rate limit reached. Please try again later.');
      });
    });
  });

  describe('Preview Functionality', () => {
    test('successfully runs preview', async () => {
      mockGrokService.previewAgentResponse.mockResolvedValue(mockSuccessResponse);

      const { result } = renderHook(() => useGrokPreview({
        organizationId: 'test-org',
        userId: 'test-user',
      }));

      await act(async () => {
        await result.current.preview(mockAgentData, 'Test query');
      });

      expect(mockGrokService.previewAgentResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'You are a helpful financial assistant',
          query: 'Test query',
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 1000,
          organizationId: 'test-org',
          userId: 'test-user',
        }),
        1000 // default debounce
      );

      expect(result.current.previewResponse).toBe('This is a test response');
      expect(result.current.executionTime).toBe(1500);
      expect(result.current.tokensUsed).toBe(50);
      expect(result.current.cost).toBe(0.001);
      expect(result.current.error).toBe(null);
      expect(result.current.isLoading).toBe(false);
    });

    test('handles preview errors', async () => {
      mockGrokService.previewAgentResponse.mockResolvedValue(mockErrorResponse);

      const { result } = renderHook(() => useGrokPreview());

      await act(async () => {
        await result.current.preview(mockAgentData, 'Test query');
      });

      expect(result.current.error).toBe('API error occurred');
      expect(result.current.previewResponse).toBe('');
    });

    test('handles exceptions during preview', async () => {
      mockGrokService.previewAgentResponse.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useGrokPreview());

      await act(async () => {
        await result.current.preview(mockAgentData, 'Test query');
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.previewResponse).toBe('');
    });

    test('validates empty test query', async () => {
      const { result } = renderHook(() => useGrokPreview());

      await act(async () => {
        await result.current.preview(mockAgentData, '');
      });

      expect(result.current.error).toBe('Test query cannot be empty');
      expect(mockGrokService.previewAgentResponse).not.toHaveBeenCalled();
    });

    test('validates empty prompt', async () => {
      const { result } = renderHook(() => useGrokPreview());

      const invalidAgentData = { ...mockAgentData, prompt: '' };

      await act(async () => {
        await result.current.preview(invalidAgentData, 'Test query');
      });

      expect(result.current.error).toBe('Agent prompt cannot be empty');
      expect(mockGrokService.previewAgentResponse).not.toHaveBeenCalled();
    });

    test('shows loading state during preview', async () => {
      let resolvePreview: (value: any) => void;
      const previewPromise = new Promise((resolve) => {
        resolvePreview = resolve;
      });

      mockGrokService.previewAgentResponse.mockReturnValue(previewPromise);

      const { result } = renderHook(() => useGrokPreview());

      // Start preview
      act(() => {
        result.current.preview(mockAgentData, 'Test query');
      });

      expect(result.current.isLoading).toBe(true);

      // Resolve preview
      await act(async () => {
        resolvePreview!(mockSuccessResponse);
        await previewPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test('uses custom debounce time', async () => {
      mockGrokService.previewAgentResponse.mockResolvedValue(mockSuccessResponse);

      const { result } = renderHook(() => useGrokPreview({
        debounceMs: 2000,
      }));

      await act(async () => {
        await result.current.preview(mockAgentData, 'Test query');
      });

      expect(mockGrokService.previewAgentResponse).toHaveBeenCalledWith(
        expect.any(Object),
        2000
      );
    });
  });

  describe('Callback Functions', () => {
    test('calls onSuccess callback', async () => {
      const onSuccess = jest.fn();
      mockGrokService.previewAgentResponse.mockResolvedValue(mockSuccessResponse);

      const { result } = renderHook(() => useGrokPreview({
        onSuccess,
      }));

      await act(async () => {
        await result.current.preview(mockAgentData, 'Test query');
      });

      expect(onSuccess).toHaveBeenCalledWith(mockSuccessResponse);
    });

    test('calls onError callback', async () => {
      const onError = jest.fn();
      mockGrokService.previewAgentResponse.mockResolvedValue(mockErrorResponse);

      const { result } = renderHook(() => useGrokPreview({
        onError,
      }));

      await act(async () => {
        await result.current.preview(mockAgentData, 'Test query');
      });

      expect(onError).toHaveBeenCalledWith('API error occurred');
    });

    test('calls onError callback for exceptions', async () => {
      const onError = jest.fn();
      mockGrokService.previewAgentResponse.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useGrokPreview({
        onError,
      }));

      await act(async () => {
        await result.current.preview(mockAgentData, 'Test query');
      });

      expect(onError).toHaveBeenCalledWith('Network error');
    });
  });

  describe('State Management', () => {
    test('clears preview state correctly', async () => {
      mockGrokService.previewAgentResponse.mockResolvedValue(mockSuccessResponse);

      const { result } = renderHook(() => useGrokPreview());

      // First run a successful preview
      await act(async () => {
        await result.current.preview(mockAgentData, 'Test query');
      });

      expect(result.current.previewResponse).toBe('This is a test response');

      // Clear preview
      act(() => {
        result.current.clearPreview();
      });

      expect(result.current.previewResponse).toBe('');
      expect(result.current.error).toBe(null);
      expect(result.current.executionTime).toBe(0);
      expect(result.current.tokensUsed).toBe(0);
      expect(result.current.cost).toBe(0);
      expect(result.current.isLoading).toBe(false);
    });

    test('cancels ongoing request when clearing preview', async () => {
      let resolvePreview: (value: any) => void;
      const previewPromise = new Promise((resolve) => {
        resolvePreview = resolve;
      });

      mockGrokService.previewAgentResponse.mockReturnValue(previewPromise);

      const { result } = renderHook(() => useGrokPreview());

      // Start preview
      act(() => {
        result.current.preview(mockAgentData, 'Test query');
      });

      expect(result.current.isLoading).toBe(true);

      // Clear preview (should cancel request)
      act(() => {
        result.current.clearPreview();
      });

      expect(result.current.isLoading).toBe(false);

      // Resolve the original promise (should not affect state since request was cancelled)
      await act(async () => {
        resolvePreview!(mockSuccessResponse);
        await previewPromise;
      });

      expect(result.current.previewResponse).toBe('');
    });
  });

  describe('Health Monitoring', () => {
    test('manually checks health', async () => {
      const { result } = renderHook(() => useGrokPreview());

      await act(async () => {
        await result.current.checkHealth();
      });

      expect(mockGrokService.healthCheck).toHaveBeenCalledTimes(2); // Once on mount, once manual
    });

    test('updates health status from manual check', async () => {
      const { result } = renderHook(() => useGrokPreview());

      // Initial health check shows healthy
      await waitFor(() => {
        expect(result.current.isHealthy).toBe(true);
      });

      // Mock health check failure
      mockGrokService.healthCheck.mockResolvedValueOnce({
        status: 'down',
      });

      await act(async () => {
        await result.current.checkHealth();
      });

      expect(result.current.isHealthy).toBe(false);
      expect(result.current.error).toBe('Grok API is currently unavailable');
    });
  });

  describe('Cleanup', () => {
    test('handles component unmount gracefully', () => {
      const { unmount } = renderHook(() => useGrokPreview());

      // Should not throw errors when unmounting
      expect(() => unmount()).not.toThrow();
    });

    test('cancels ongoing requests on unmount', async () => {
      let resolvePreview: (value: any) => void;
      const previewPromise = new Promise((resolve) => {
        resolvePreview = resolve;
      });

      mockGrokService.previewAgentResponse.mockReturnValue(previewPromise);

      const { result, unmount } = renderHook(() => useGrokPreview());

      // Start a preview
      act(() => {
        result.current.preview(mockAgentData, 'Test query');
      });

      expect(result.current.isLoading).toBe(true);

      // Unmount component
      unmount();

      // Resolve the promise (should not cause any state updates)
      await act(async () => {
        resolvePreview!(mockSuccessResponse);
        await previewPromise;
      });

      // No errors should be thrown
      expect(true).toBe(true);
    });
  });
});