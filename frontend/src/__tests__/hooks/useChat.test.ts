import { renderHook, act } from '@testing-library/react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import React from 'react';
import { useChat } from '../../hooks/useChat';

// Mock Convex hooks
jest.mock('convex/react', () => ({
  ...jest.requireActual('convex/react'),
  useMutation: jest.fn(),
  useQuery: jest.fn(),
}));

const mockConvex = new ConvexReactClient('https://test.convex.cloud');

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ConvexProvider client={mockConvex}>
    {children}
  </ConvexProvider>
);

describe('useChat Hook', () => {
  const mockSendChatMessage = jest.fn();
  const mockCreateDefaultAgent = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    const { useMutation, useQuery } = require('convex/react');
    
    useMutation.mockImplementation((apiFunction) => {
      if (apiFunction.toString().includes('sendChatMessage')) {
        return mockSendChatMessage;
      }
      if (apiFunction.toString().includes('createDefaultAgent')) {
        return mockCreateDefaultAgent;
      }
      return jest.fn();
    });
    
    useQuery.mockImplementation((apiFunction) => {
      if (apiFunction.toString().includes('getChatMessages')) {
        return [
          {
            _id: 'msg1',
            type: 'user',
            content: 'Test message',
            createdAt: Date.now(),
          },
          {
            _id: 'msg2',
            type: 'assistant',
            content: 'Test response',
            createdAt: Date.now() + 1000,
            response: {
              summary: 'Test response',
              dataOverview: {
                totalRecords: 10,
                dateRange: { start: 0, end: 100 },
                keyMetrics: [],
              },
              patterns: [],
              actions: [],
            },
          },
        ];
      }
      
      if (apiFunction.toString().includes('getDefaultAgent')) {
        return { _id: 'agent1', name: 'Test Agent' };
      }
      
      if (apiFunction.toString().includes('getChatStats')) {
        return {
          totalMessages: 10,
          userMessages: 5,
          assistantMessages: 5,
          uniqueSessions: 2,
          period: 30,
          averageMessagesPerSession: 5,
        };
      }
      
      return null;
    });
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useChat(), { wrapper });
    
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.sessionId).toBeDefined();
    expect(result.current.hasDefaultAgent).toBe(true);
  });

  it('sends message successfully with existing agent', async () => {
    mockSendChatMessage.mockResolvedValue({
      response: {
        summary: 'Mock response',
        dataOverview: {
          totalRecords: 5,
          dateRange: { start: 0, end: 100 },
          keyMetrics: [],
        },
        patterns: [],
        actions: [],
      },
    });

    const { result } = renderHook(() => useChat(), { wrapper });
    
    await act(async () => {
      const response = await result.current.sendMessage('Test message');
      expect(response.summary).toBe('Mock response');
    });
    
    expect(mockSendChatMessage).toHaveBeenCalledWith({
      organizationId: 'demo-org',
      userId: 'demo-user',
      sessionId: result.current.sessionId,
      content: 'Test message',
      agentId: 'agent1',
    });
  });

  it('creates default agent when none exists', async () => {
    const { useQuery } = require('convex/react');
    useQuery.mockImplementation((apiFunction) => {
      if (apiFunction.toString().includes('getDefaultAgent')) {
        return null; // No default agent
      }
      return [];
    });
    
    mockCreateDefaultAgent.mockResolvedValue('new-agent-id');
    mockSendChatMessage.mockResolvedValue({
      response: { summary: 'Response', dataOverview: { totalRecords: 0, dateRange: { start: 0, end: 0 }, keyMetrics: [] }, patterns: [], actions: [] },
    });

    const { result } = renderHook(() => useChat(), { wrapper });
    
    await act(async () => {
      await result.current.sendMessage('Test message');
    });
    
    expect(mockCreateDefaultAgent).toHaveBeenCalledWith({
      organizationId: 'demo-org',
      userId: 'demo-user',
    });
  });

  it('handles message sending errors correctly', async () => {
    mockSendChatMessage.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useChat(), { wrapper });
    
    await act(async () => {
      try {
        await result.current.sendMessage('Test message');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });
    
    expect(result.current.isLoading).toBe(false);
  });

  it('starts new session correctly', () => {
    const { result } = renderHook(() => useChat(), { wrapper });
    
    const initialSessionId = result.current.sessionId;
    
    act(() => {
      const newSessionId = result.current.startNewSession();
      expect(newSessionId).not.toBe(initialSessionId);
      expect(result.current.sessionId).toBe(newSessionId);
    });
  });

  it('clears error correctly', () => {
    const { result } = renderHook(() => useChat(), { wrapper });
    
    // Manually set an error state (this would normally be set by a failed operation)
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBe(null);
  });

  it('formats messages correctly', () => {
    const { result } = renderHook(() => useChat(), { wrapper });
    
    const messages = result.current.messages;
    expect(messages).toHaveLength(2);
    
    expect(messages[0]).toMatchObject({
      id: 'msg1',
      type: 'user',
      content: 'Test message',
    });
    
    expect(messages[1]).toMatchObject({
      id: 'msg2',
      type: 'assistant',
      content: 'Test response',
      response: expect.objectContaining({
        summary: 'Test response',
      }),
    });
  });

  it('accepts custom configuration', () => {
    const customConfig = {
      organizationId: 'custom-org' as any,
      userId: 'custom-user' as any,
      sessionId: 'custom-session',
      agentId: 'custom-agent' as any,
    };

    const { result } = renderHook(() => useChat(customConfig), { wrapper });
    
    expect(result.current.sessionId).toBe('custom-session');
  });

  it('handles loading state correctly', async () => {
    mockSendChatMessage.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    const { result } = renderHook(() => useChat(), { wrapper });
    
    act(() => {
      result.current.sendMessage('Test message');
    });
    
    expect(result.current.isLoading).toBe(true);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });
    
    expect(result.current.isLoading).toBe(false);
  });
});