import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ChatbotUI } from '../../components/chatbot-ui';
import type { AgentResponse } from '../../components/chatbot-ui';

// Mock Convex client
const mockConvex = new ConvexReactClient('https://test.convex.cloud');

// Mock useChat hook
jest.mock('../../hooks/useChat', () => ({
  useChat: jest.fn(() => ({
    messages: [
      {
        _id: 'msg1',
        type: 'user',
        content: 'What is my revenue this month?',
        createdAt: Date.now() - 1000,
      },
      {
        _id: 'msg2',
        type: 'assistant',
        content: 'Your revenue this month is $125,000.',
        createdAt: Date.now(),
        response: {
          summary: 'Your revenue this month is $125,000.',
          dataOverview: {
            totalRecords: 100,
            dateRange: { start: Date.now() - 30 * 24 * 60 * 60 * 1000, end: Date.now() },
            keyMetrics: [
              { name: 'Revenue', value: 125000, change: 12.5, trend: 'up' }
            ],
          },
          patterns: [
            {
              type: 'growth_trend',
              description: 'Revenue shows positive growth',
              confidence: 0.85,
              impact: 'high',
            }
          ],
          actions: [
            {
              type: 'review',
              description: 'Review growth strategies',
              priority: 'medium',
              automated: false,
            }
          ],
        },
      }
    ],
    sendMessage: jest.fn(),
    isLoading: false,
    error: null,
    clearError: jest.fn(),
    sessionId: 'test-session',
    startNewSession: jest.fn(),
    stats: null,
    hasDefaultAgent: true,
  })),
}));

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <ConvexProvider client={mockConvex}>
      {component}
    </ConvexProvider>
  );
};

describe('ChatbotUI Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the chatbot UI with header', () => {
    renderWithProvider(<ChatbotUI />);
    
    expect(screen.getByText('FinHelm AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('2 messages')).toBeInTheDocument();
  });

  it('displays welcome message when no messages', () => {
    const { useChat } = require('../../hooks/useChat');
    useChat.mockReturnValue({
      messages: [],
      sendMessage: jest.fn(),
      isLoading: false,
      error: null,
      clearError: jest.fn(),
      sessionId: 'test-session',
      startNewSession: jest.fn(),
    });

    renderWithProvider(<ChatbotUI />);
    
    expect(screen.getByText('Welcome to FinHelm AI')).toBeInTheDocument();
    expect(screen.getByText(/Ask me about your financial data/)).toBeInTheDocument();
  });

  it('displays existing messages correctly', () => {
    renderWithProvider(<ChatbotUI />);
    
    expect(screen.getByText('What is my revenue this month?')).toBeInTheDocument();
    expect(screen.getByText('Your revenue this month is $125,000.')).toBeInTheDocument();
  });

  it('allows user to type and send messages', async () => {
    const mockSendMessage = jest.fn();
    const { useChat } = require('../../hooks/useChat');
    useChat.mockReturnValue({
      messages: [],
      sendMessage: mockSendMessage,
      isLoading: false,
      error: null,
      clearError: jest.fn(),
      sessionId: 'test-session',
      startNewSession: jest.fn(),
    });

    renderWithProvider(<ChatbotUI />);
    
    const input = screen.getByPlaceholderText('Ask about your financial data...');
    const sendButton = screen.getByRole('button');
    
    fireEvent.change(input, { target: { value: 'Show me my expenses' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Show me my expenses');
    });
  });

  it('sends message on Enter key press', async () => {
    const mockSendMessage = jest.fn();
    const { useChat } = require('../../hooks/useChat');
    useChat.mockReturnValue({
      messages: [],
      sendMessage: mockSendMessage,
      isLoading: false,
      error: null,
      clearError: jest.fn(),
      sessionId: 'test-session',
      startNewSession: jest.fn(),
    });

    renderWithProvider(<ChatbotUI />);
    
    const input = screen.getByPlaceholderText('Ask about your financial data...');
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Test message');
    });
  });

  it('displays loading state correctly', () => {
    const { useChat } = require('../../hooks/useChat');
    useChat.mockReturnValue({
      messages: [],
      sendMessage: jest.fn(),
      isLoading: true,
      error: null,
      clearError: jest.fn(),
      sessionId: 'test-session',
      startNewSession: jest.fn(),
    });

    renderWithProvider(<ChatbotUI />);
    
    expect(screen.getByText('Analyzing...')).toBeInTheDocument();
  });

  it('displays error state correctly', () => {
    const { useChat } = require('../../hooks/useChat');
    useChat.mockReturnValue({
      messages: [],
      sendMessage: jest.fn(),
      isLoading: false,
      error: 'Network error occurred',
      clearError: jest.fn(),
      sessionId: 'test-session',
      startNewSession: jest.fn(),
    });

    renderWithProvider(<ChatbotUI />);
    
    expect(screen.getByText('Network error occurred')).toBeInTheDocument();
  });

  it('switches between segment tabs correctly', () => {
    renderWithProvider(<ChatbotUI />);
    
    // Should default to Summary tab
    expect(screen.getByText('Summary')).toHaveClass('text-blue-600');
    
    // Click on Data Overview tab
    const dataTab = screen.getByText('Data Overview');
    fireEvent.click(dataTab);
    
    // Should display data overview content
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('$125,000')).toBeInTheDocument();
  });

  it('displays segment content correctly for patterns', () => {
    renderWithProvider(<ChatbotUI />);
    
    const patternsTab = screen.getByText('Patterns');
    fireEvent.click(patternsTab);
    
    expect(screen.getByText('Growth Trend')).toBeInTheDocument();
    expect(screen.getByText('Revenue shows positive growth')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument(); // confidence
  });

  it('displays segment content correctly for actions', () => {
    renderWithProvider(<ChatbotUI />);
    
    const actionsTab = screen.getByText('Actions');
    fireEvent.click(actionsTab);
    
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Review growth strategies')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument(); // priority
  });

  it('disables send button when input is empty', () => {
    const { useChat } = require('../../hooks/useChat');
    useChat.mockReturnValue({
      messages: [],
      sendMessage: jest.fn(),
      isLoading: false,
      error: null,
      clearError: jest.fn(),
      sessionId: 'test-session',
      startNewSession: jest.fn(),
    });

    renderWithProvider(<ChatbotUI />);
    
    const sendButton = screen.getByRole('button');
    expect(sendButton).toBeDisabled();
  });

  it('uses custom onSendMessage prop when provided', async () => {
    const customSendMessage = jest.fn().mockResolvedValue({
      summary: 'Custom response',
      dataOverview: { totalRecords: 0, dateRange: { start: 0, end: 0 }, keyMetrics: [] },
      patterns: [],
      actions: [],
    } as AgentResponse);

    const { useChat } = require('../../hooks/useChat');
    useChat.mockReturnValue({
      messages: [],
      sendMessage: jest.fn(),
      isLoading: false,
      error: null,
      clearError: jest.fn(),
      sessionId: 'test-session',
      startNewSession: jest.fn(),
    });

    renderWithProvider(<ChatbotUI onSendMessage={customSendMessage} />);
    
    const input = screen.getByPlaceholderText('Ask about your financial data...');
    const sendButton = screen.getByRole('button');
    
    fireEvent.change(input, { target: { value: 'Custom message' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(customSendMessage).toHaveBeenCalledWith('Custom message');
    });
  });
});