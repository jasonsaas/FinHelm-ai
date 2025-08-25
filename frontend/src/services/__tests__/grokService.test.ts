/**
 * @jest-environment jsdom
 */

import { grokService, GrokPreviewRequest, GrokService } from '../grokService';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock AbortSignal.timeout
global.AbortSignal.timeout = jest.fn((timeout) => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return controller.signal;
});

describe('GrokService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('previewAgentResponse', () => {
    const mockRequest: GrokPreviewRequest = {
      prompt: 'You are a financial assistant',
      query: 'Analyze this transaction',
      model: 'grok-beta',
      temperature: 0.7,
      maxTokens: 1000,
      organizationId: 'test-org',
      userId: 'test-user',
    };

    test('debounces API calls correctly', async () => {
      const service = new (grokService.constructor as typeof GrokService)({
        apiKey: 'test-key',
      });

      // Start multiple calls
      const promise1 = service.previewAgentResponse(mockRequest, 1000);
      const promise2 = service.previewAgentResponse(mockRequest, 1000);
      const promise3 = service.previewAgentResponse(mockRequest, 1000);

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      // Mock successful API response
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({
          choices: [{ message: { content: 'Test response' } }],
          usage: { total_tokens: 50 },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      );

      const results = await Promise.all([promise1, promise2, promise3]);

      // Only the last call should resolve with the actual response
      expect(results).toHaveLength(3);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('uses mock responses in development mode', async () => {
      process.env.NODE_ENV = 'development';
      
      const service = new (grokService.constructor as typeof GrokService)();
      const result = service.previewAgentResponse(mockRequest);

      // Fast-forward debounce time
      jest.advanceTimersByTime(1000);

      // Fast-forward mock delay
      jest.advanceTimersByTime(3000);

      const response = await result;

      expect(response.success).toBe(true);
      expect(response.response).toBeTruthy();
      expect(response.executionTime).toBeGreaterThan(0);
      expect(response.tokensUsed).toBeGreaterThan(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('makes actual API calls when API key is provided', async () => {
      process.env.NODE_ENV = 'production';
      
      const service = new (grokService.constructor as typeof GrokService)({
        apiKey: 'test-api-key',
      });

      const mockApiResponse = {
        choices: [{ message: { content: 'Financial analysis response' } }],
        usage: { total_tokens: 75 },
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockApiResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const result = service.previewAgentResponse(mockRequest);

      jest.advanceTimersByTime(1000); // Debounce time

      const response = await result;

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.x.ai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('grok-beta'),
        })
      );

      expect(response.success).toBe(true);
      expect(response.response).toBe('Financial analysis response');
      expect(response.tokensUsed).toBe(75);
    });

    test('handles API errors correctly', async () => {
      const service = new (grokService.constructor as typeof GrokService)({
        apiKey: 'test-key',
      });

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = service.previewAgentResponse(mockRequest);
      jest.advanceTimersByTime(1000);

      const response = await result;

      expect(response.success).toBe(false);
      expect(response.error).toBe('Network error');
      expect(response.response).toBe('');
    });

    test('handles timeout errors', async () => {
      const service = new (grokService.constructor as typeof GrokService)({
        apiKey: 'test-key',
        timeout: 5000,
      });

      const timeoutError = new Error('Request timed out');
      timeoutError.name = 'TimeoutError';
      mockFetch.mockRejectedValueOnce(timeoutError);

      const result = service.previewAgentResponse(mockRequest);
      jest.advanceTimersByTime(1000);

      const response = await result;

      expect(response.success).toBe(false);
      expect(response.error).toBe('Request timed out. The AI model took too long to respond.');
    });
  });

  describe('Mock Response Generation', () => {
    test('generates email rewrite responses', async () => {
      process.env.NODE_ENV = 'development';
      
      const service = new (grokService.constructor as typeof GrokService)();
      
      const emailRequest: GrokPreviewRequest = {
        ...mockRequest,
        query: 'Rewrite this expense report as an email',
      };

      const result = service.previewAgentResponse(emailRequest);
      jest.advanceTimersByTime(3000);

      const response = await result;

      expect(response.response).toContain('Subject:');
      expect(response.response).toContain('Dear Management Team');
      expect(response.response).toContain('Best regards');
    });

    test('generates transaction categorization responses', async () => {
      process.env.NODE_ENV = 'development';
      
      const service = new (grokService.constructor as typeof GrokService)();
      
      const categorizationRequest: GrokPreviewRequest = {
        ...mockRequest,
        query: 'Categorize this transaction: $2,500 payment',
      };

      const result = service.previewAgentResponse(categorizationRequest);
      jest.advanceTimersByTime(3000);

      const response = await result;

      expect(response.response).toContain('Transaction Categorization');
      expect(response.response).toContain('Recommended Category:');
      expect(response.response).toContain('Confidence:');
    });

    test('generates variance analysis responses', async () => {
      process.env.NODE_ENV = 'development';
      
      const service = new (grokService.constructor as typeof GrokService)();
      
      const varianceRequest: GrokPreviewRequest = {
        ...mockRequest,
        query: 'Analyze the variance in our monthly expenses',
      };

      const result = service.previewAgentResponse(varianceRequest);
      jest.advanceTimersByTime(3000);

      const response = await result;

      expect(response.response).toContain('Variance Analysis');
      expect(response.response).toContain('Key Findings:');
      expect(response.response).toContain('Action Items:');
    });

    test('generates default responses for unknown queries', async () => {
      process.env.NODE_ENV = 'development';
      
      const service = new (grokService.constructor as typeof GrokService)();
      
      const unknownRequest: GrokPreviewRequest = {
        ...mockRequest,
        query: 'What is the meaning of life?',
      };

      const result = service.previewAgentResponse(unknownRequest);
      jest.advanceTimersByTime(3000);

      const response = await result;

      expect(response.response).toContain('Financial Intelligence Response');
      expect(response.response).toContain('Key Insights:');
      expect(response.response).toContain('Recommendations:');
    });
  });

  describe('Health Check', () => {
    test('reports healthy status when API is accessible', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('{}', {
          status: 200,
          headers: { 'x-ratelimit-remaining': '150' },
        })
      );

      const service = new (grokService.constructor as typeof GrokService)({
        apiKey: 'test-key',
      });

      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.rateLimitRemaining).toBe(150);
    });

    test('reports degraded status when rate limited', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('{}', {
          status: 429,
          headers: { 'x-ratelimit-remaining': '0' },
        })
      );

      const service = new (grokService.constructor as typeof GrokService)({
        apiKey: 'test-key',
      });

      const health = await service.healthCheck();

      expect(health.status).toBe('degraded');
      expect(health.rateLimitRemaining).toBe(0);
    });

    test('reports down status when API is unreachable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const service = new (grokService.constructor as typeof GrokService)({
        apiKey: 'test-key',
      });

      const health = await service.healthCheck();

      expect(health.status).toBe('down');
    });
  });

  describe('Model Mapping', () => {
    test('maps internal model names to API model names correctly', async () => {
      process.env.NODE_ENV = 'production';
      
      const service = new (grokService.constructor as typeof GrokService)({
        apiKey: 'test-key',
      });

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({
          choices: [{ message: { content: 'test' } }],
          usage: { total_tokens: 10 },
        }), { status: 200 })
      );

      await service.callGrokAPI({
        ...mockRequest,
        model: 'gpt-4-turbo',
      });

      jest.advanceTimersByTime(1000);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"model":"gpt-4-turbo-preview"'),
        })
      );
    });
  });

  describe('Cost Calculation', () => {
    test('calculates costs correctly for different models', async () => {
      process.env.NODE_ENV = 'development';
      
      const service = new (grokService.constructor as typeof GrokService)();

      // Test with different models
      const gpt4Request = { ...mockRequest, model: 'gpt-4' as const };
      const claudeRequest = { ...mockRequest, model: 'claude-3-haiku' as const };

      const result1 = service.previewAgentResponse(gpt4Request);
      const result2 = service.previewAgentResponse(claudeRequest);

      jest.advanceTimersByTime(3000);

      const [response1, response2] = await Promise.all([result1, result2]);

      // GPT-4 should be more expensive than Claude Haiku
      expect(response1.cost).toBeGreaterThan(response2.cost);
      expect(response1.cost).toBeGreaterThan(0);
      expect(response2.cost).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    test('clears debounce timers on dispose', () => {
      const service = new (grokService.constructor as typeof GrokService)();
      
      // Start some debounced calls
      service.previewAgentResponse(mockRequest, 1000);
      service.previewAgentResponse(mockRequest, 1000);

      // Dispose should clear timers
      service.dispose();

      // Fast forward time - no calls should be made
      jest.advanceTimersByTime(2000);

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});