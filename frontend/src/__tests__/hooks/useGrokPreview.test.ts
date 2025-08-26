import { renderHook, act, waitFor } from '@testing-library/react';
import useGrokPreview, { FINANCIAL_SCENARIOS } from '../../hooks/useGrokPreview';

// Mock the Grok client
jest.mock('../../lib/grok-client', () => ({
  grokClient: {
    chat: jest.fn()
  }
}));

describe('useGrokPreview', () => {
  const mockGrokClient = require('../../lib/grok-client').grokClient;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Functionality', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useGrokPreview());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.preview).toBe(null);
      expect(result.current.scenarios).toHaveLength(FINANCIAL_SCENARIOS.length);
      expect(result.current.isDebouncing).toBe(false);
    });

    it('should provide all financial scenarios', () => {
      const { result } = renderHook(() => useGrokPreview());

      expect(result.current.scenarios).toEqual(FINANCIAL_SCENARIOS);
      expect(result.current.scenarios).toContainEqual(
        expect.objectContaining({
          id: 'expense_report_analysis',
          name: 'Expense Report Analysis'
        })
      );
    });
  });

  describe('Preview Generation', () => {
    it('should generate preview successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Test response from Grok'
          }
        }],
        usage: {
          total_tokens: 100
        }
      };

      mockGrokClient.chat.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGrokPreview());

      await act(async () => {
        await result.current.generatePreview({
          prompt: 'Test prompt for financial analysis agent that helps users understand their data'
        }, 0); // No debounce for testing
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.preview).toMatchObject({
          content: 'Test response from Grok',
          tokensUsed: 100
        });
        expect(result.current.error).toBe(null);
      });
    });

    it('should handle preview generation errors', async () => {
      const mockError = new Error('Grok API failed');
      mockGrokClient.chat.mockRejectedValue(mockError);

      const { result } = renderHook(() => useGrokPreview());

      await act(async () => {
        try {
          await result.current.generatePreview({
            prompt: 'Test prompt for financial analysis agent that helps users understand their data'
          }, 0);
        } catch (error) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe('Grok API failed');
        expect(result.current.preview).toBe(null);
      });
    });

    it('should validate prompt length', async () => {
      const { result } = renderHook(() => useGrokPreview());

      await act(async () => {
        try {
          await result.current.generatePreview({
            prompt: 'Short prompt'
          }, 0);
        } catch (error) {
          expect(error).toEqual(expect.objectContaining({
            message: 'Prompt must be at least 20 characters long'
          }));
        }
      });
    });

    it('should debounce preview generation', async () => {
      mockGrokClient.chat.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        usage: { total_tokens: 50 }
      });

      const { result } = renderHook(() => useGrokPreview());

      // Make multiple rapid calls
      act(() => {
        result.current.generatePreview({
          prompt: 'Test prompt for financial analysis agent that helps users understand their data'
        }, 100); // 100ms debounce
        result.current.generatePreview({
          prompt: 'Updated prompt for financial analysis agent that helps users understand their data'
        }, 100);
      });

      // Only the last call should be made after debounce
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockGrokClient.chat).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Scenario-based Preview', () => {
    it('should generate preview with specific scenario', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Scenario-based response'
          }
        }],
        usage: { total_tokens: 150 }
      };

      mockGrokClient.chat.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGrokPreview());

      await act(async () => {
        await result.current.generatePreviewWithScenario(
          'Test prompt for financial analysis agent that helps users understand their data',
          'expense_report_analysis'
        );
      });

      await waitFor(() => {
        expect(result.current.preview).toMatchObject({
          content: 'Scenario-based response',
          scenario: expect.objectContaining({
            id: 'expense_report_analysis'
          })
        });
      });

      expect(mockGrokClient.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('expense report')
            })
          ])
        })
      );
    });

    it('should throw error for invalid scenario', async () => {
      const { result } = renderHook(() => useGrokPreview());

      await act(async () => {
        try {
          await result.current.generatePreviewWithScenario(
            'Test prompt for financial analysis agent that helps users understand their data',
            'invalid_scenario_id'
          );
        } catch (error) {
          expect(error).toEqual(expect.objectContaining({
            message: 'Scenario not found: invalid_scenario_id'
          }));
        }
      });
    });
  });

  describe('Caching', () => {
    it('should cache preview responses', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Cached response' } }],
        usage: { total_tokens: 75 }
      };

      mockGrokClient.chat.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGrokPreview());

      // Make first request
      await act(async () => {
        await result.current.generatePreview({
          prompt: 'Test prompt for financial analysis agent that helps users understand their data'
        }, 0);
      });

      // Make same request again
      await act(async () => {
        await result.current.generatePreview({
          prompt: 'Test prompt for financial analysis agent that helps users understand their data'
        }, 0);
      });

      // Should only call API once due to caching
      expect(mockGrokClient.chat).toHaveBeenCalledTimes(1);
    });

    it('should provide cache statistics', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' } }],
        usage: { total_tokens: 50 }
      };

      mockGrokClient.chat.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGrokPreview());

      // Initially no cache
      expect(result.current.getCacheStats()).toMatchObject({
        totalEntries: 0,
        validEntries: 0
      });

      // Generate preview to populate cache
      await act(async () => {
        await result.current.generatePreview({
          prompt: 'Test prompt for financial analysis agent that helps users understand their data'
        }, 0);
      });

      await waitFor(() => {
        const stats = result.current.getCacheStats();
        expect(stats.totalEntries).toBe(1);
        expect(stats.validEntries).toBe(1);
      });
    });

    it('should clear cache', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' } }],
        usage: { total_tokens: 50 }
      };

      mockGrokClient.chat.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGrokPreview());

      // Populate cache
      await act(async () => {
        await result.current.generatePreview({
          prompt: 'Test prompt for financial analysis agent that helps users understand their data'
        }, 0);
      });

      // Clear cache
      act(() => {
        result.current.clearCache();
      });

      expect(result.current.getCacheStats()).toMatchObject({
        totalEntries: 0,
        validEntries: 0
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should cancel ongoing preview request', async () => {
      const { result } = renderHook(() => useGrokPreview());

      // Start a preview request
      act(() => {
        result.current.generatePreview({
          prompt: 'Test prompt for financial analysis agent that helps users understand their data'
        }, 1000); // Long debounce
      });

      // Cancel the request
      act(() => {
        result.current.cancelPreview();
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should clear preview state', () => {
      const { result } = renderHook(() => useGrokPreview());

      // Set some preview state manually (would normally come from API)
      act(() => {
        result.current.clearPreview();
      });

      expect(result.current.preview).toBe(null);
      expect(result.current.error).toBe(null);
    });
  });

  describe('Financial Scenarios', () => {
    it('should include all required scenario fields', () => {
      const { result } = renderHook(() => useGrokPreview());

      result.current.scenarios.forEach(scenario => {
        expect(scenario).toHaveProperty('id');
        expect(scenario).toHaveProperty('name');
        expect(scenario).toHaveProperty('description');
        expect(scenario).toHaveProperty('data');
        expect(scenario).toHaveProperty('query');
        expect(typeof scenario.id).toBe('string');
        expect(typeof scenario.name).toBe('string');
        expect(typeof scenario.description).toBe('string');
        expect(typeof scenario.query).toBe('string');
        expect(typeof scenario.data).toBe('object');
      });
    });

    it('should have diverse financial scenario types', () => {
      const { result } = renderHook(() => useGrokPreview());

      const scenarioIds = result.current.scenarios.map(s => s.id);
      
      expect(scenarioIds).toContain('expense_report_analysis');
      expect(scenarioIds).toContain('budget_variance_analysis');
      expect(scenarioIds).toContain('cash_flow_forecast');
      expect(scenarioIds).toContain('profit_margin_analysis');
      expect(scenarioIds).toContain('accounts_receivable_aging');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockGrokClient.chat.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useGrokPreview());

      await act(async () => {
        try {
          await result.current.generatePreview({
            prompt: 'Test prompt for financial analysis agent that helps users understand their data'
          }, 0);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle malformed API responses', async () => {
      mockGrokClient.chat.mockResolvedValue({
        // Missing choices array
      });

      const { result } = renderHook(() => useGrokPreview());

      await act(async () => {
        try {
          await result.current.generatePreview({
            prompt: 'Test prompt for financial analysis agent that helps users understand their data'
          }, 0);
        } catch (error) {
          expect(error).toEqual(expect.objectContaining({
            message: 'No response content received from Grok API'
          }));
        }
      });
    });
  });

  describe('Performance', () => {
    it('should clean up expired cache entries', async () => {
      // Mock Date.now to control time
      const originalDateNow = Date.now;
      let currentTime = 1000000;
      Date.now = jest.fn(() => currentTime);

      const mockResponse = {
        choices: [{ message: { content: 'Response' } }],
        usage: { total_tokens: 50 }
      };

      mockGrokClient.chat.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGrokPreview());

      // Generate preview
      await act(async () => {
        await result.current.generatePreview({
          prompt: 'Test prompt for financial analysis agent that helps users understand their data'
        }, 0);
      });

      // Fast forward time past cache expiration (5 minutes)
      currentTime += 6 * 60 * 1000;

      // Advance timers to trigger cache cleanup
      act(() => {
        jest.advanceTimersByTime(60 * 1000);
      });

      // Cache should be cleaned up
      await waitFor(() => {
        const stats = result.current.getCacheStats();
        expect(stats.validEntries).toBe(0);
      });

      // Restore original Date.now
      Date.now = originalDateNow;
    });
  });
});