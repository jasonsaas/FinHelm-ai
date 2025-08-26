import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatbotUI, type AgentResponse } from '../../frontend/src/components/chatbot-ui';

// Mock the useChat hook
const mockSendMessage = vi.fn();
const mockClearError = vi.fn();

vi.mock('../../frontend/src/hooks/useChat', () => ({
  useChat: () => ({
    messages: [],
    sendMessage: mockSendMessage,
    isLoading: false,
    error: null,
    clearError: mockClearError,
    sessionId: 'test-session',
  })
}));

describe('ChatbotUI with ERP Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('ERP Data Sources Display', () => {
    const mockERPResponse: AgentResponse = {
      summary: 'Based on live data from QuickBooks and Sage Intacct integrations, your financial analysis shows strong performance.',
      confidence: 0.95,
      dataOverview: {
        totalRecords: 1247,
        dateRange: { start: Date.now() - 86400000, end: Date.now() },
        erpSources: [
          { type: 'quickbooks', status: 'active', lastSync: Date.now() - 3600000 },
          { type: 'sage_intacct', status: 'failed', lastSync: Date.now() - 86400000 },
          { type: 'xero', status: 'pending' }
        ],
        keyMetrics: [
          { name: 'Total Revenue', value: 125000, change: 12.5, trend: 'up', confidence: 0.95 },
          { name: 'Total Expenses', value: 78000, change: -3.2, trend: 'down', confidence: 0.88 },
          { name: 'Net Profit', value: 47000, change: 28.7, trend: 'up', confidence: 0.92 }
        ]
      },
      patterns: [
        {
          type: 'variance_trend',
          description: 'Revenue patterns show positive trajectory with 2 ERP systems connected',
          confidence: 0.85,
          impact: 'high'
        },
        {
          type: 'multi_entity_analysis',
          description: 'Multi-entity analysis reveals variance across 3 departments/locations',
          confidence: 0.82,
          impact: 'medium'
        }
      ],
      actions: [
        {
          type: 'variance_review',
          description: 'Follow up on variance analysis findings from ERP data',
          priority: 'medium',
          automated: false,
          dueDate: Date.now() + 604800000
        },
        {
          type: 'erp_sync_health',
          description: 'Review ERP connection health and data synchronization status',
          priority: 'high',
          automated: true
        }
      ],
      metadata: {
        dataSource: 'live_erp_integration',
        erpSystems: ['quickbooks', 'sage_intacct'],
        confidence: 0.95,
        lastDataRefresh: Date.now() - 3600000,
        grounded: true,
        disclaimer: 'AI-generated analysis based on live ERP data—please review all recommendations'
      },
      ragInsights: {
        similarQueries: 5,
        contextStrength: 'high',
        historicalPatterns: ['Revenue growth trend', 'Expense optimization pattern', 'Cash flow improvement']
      }
    };

    it('should display ERP integration status correctly', () => {
      const mockOnSendMessage = vi.fn().mockResolvedValue(mockERPResponse);
      
      render(
        <ChatbotUI 
          onSendMessage={mockOnSendMessage}
          organizationId="test-org"
          userId="test-user"
        />
      );

      // Send a message to trigger response
      const input = screen.getByPlaceholderText(/ask me about/i);
      const sendButton = screen.getByRole('button');

      fireEvent.change(input, { target: { value: 'Show me revenue analysis' } });
      fireEvent.click(sendButton);

      // Check for ERP integration status display
      expect(screen.getByText('Live ERP Data Integration')).toBeInTheDocument();
      
      // Check individual ERP system status
      expect(screen.getByText('Quickbooks')).toBeInTheDocument();
      expect(screen.getByText('Sage Intacct')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('failed')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
    });

    it('should show confidence scores for metrics', async () => {
      const mockOnSendMessage = vi.fn().mockResolvedValue(mockERPResponse);
      
      render(
        <ChatbotUI 
          onSendMessage={mockOnSendMessage}
          organizationId="test-org"
          userId="test-user"
        />
      );

      // Send message and wait for response
      const input = screen.getByPlaceholderText(/ask me about/i);
      fireEvent.change(input, { target: { value: 'Show me revenue analysis' } });
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('95%')).toBeInTheDocument(); // Total Revenue confidence
        expect(screen.getByText('88%')).toBeInTheDocument(); // Total Expenses confidence
        expect(screen.getByText('92%')).toBeInTheDocument(); // Net Profit confidence
      });
    });

    it('should display data freshness indicators', async () => {
      const mockOnSendMessage = vi.fn().mockResolvedValue(mockERPResponse);
      
      render(
        <ChatbotUI 
          onSendMessage={mockOnSendMessage}
          organizationId="test-org"
          userId="test-user"
        />
      );

      const input = screen.getByPlaceholderText(/ask me about/i);
      fireEvent.change(input, { target: { value: 'Show me analysis' } });
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
        expect(screen.getByText('live erp integration')).toBeInTheDocument();
      });
    });

    it('should show RAG insights when available', async () => {
      const mockOnSendMessage = vi.fn().mockResolvedValue(mockERPResponse);
      
      render(
        <ChatbotUI 
          onSendMessage={mockOnSendMessage}
          organizationId="test-org"
          userId="test-user"
        />
      );

      const input = screen.getByPlaceholderText(/ask me about/i);
      fireEvent.change(input, { target: { value: 'Analyze trends' } });
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('5 queries')).toBeInTheDocument(); // Similar queries count
      });
    });
  });

  describe('Data Quality Indicators', () => {
    it('should display overall confidence score', async () => {
      const mockOnSendMessage = vi.fn().mockResolvedValue(mockERPResponse);
      
      render(<ChatbotUI onSendMessage={mockOnSendMessage} />);

      const input = screen.getByPlaceholderText(/ask me about/i);
      fireEvent.change(input, { target: { value: 'Show analysis' } });
      fireEvent.click(screen.getByRole('button'));

      // Switch to data tab
      await waitFor(() => {
        const dataTab = screen.getByText('Data Overview');
        fireEvent.click(dataTab);
      });

      expect(screen.getByText('Analysis Quality')).toBeInTheDocument();
      expect(screen.getByText('Overall Confidence:')).toBeInTheDocument();
    });

    it('should show ERP system connection health', async () => {
      const mockOnSendMessage = vi.fn().mockResolvedValue(mockERPResponse);
      
      render(<ChatbotUI onSendMessage={mockOnSendMessage} />);

      const input = screen.getByPlaceholderText(/ask me about/i);
      fireEvent.change(input, { target: { value: 'Check status' } });
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        // Should show different status indicators
        const activeStatus = screen.getAllByText('active');
        const failedStatus = screen.getAllByText('failed');
        const pendingStatus = screen.getAllByText('pending');

        expect(activeStatus.length).toBeGreaterThan(0);
        expect(failedStatus.length).toBeGreaterThan(0);
        expect(pendingStatus.length).toBeGreaterThan(0);
      });
    });

    it('should display last sync timestamp', async () => {
      const mockOnSendMessage = vi.fn().mockResolvedValue(mockERPResponse);
      
      render(<ChatbotUI onSendMessage={mockOnSendMessage} />);

      const input = screen.getByPlaceholderText(/ask me about/i);
      fireEvent.change(input, { target: { value: 'Show sync status' } });
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText(/Last sync:/)).toBeInTheDocument();
      });
    });
  });

  describe('AI Disclaimer', () => {
    it('should show AI disclaimer when metadata is present', async () => {
      const mockOnSendMessage = vi.fn().mockResolvedValue(mockERPResponse);
      
      render(<ChatbotUI onSendMessage={mockOnSendMessage} />);

      const input = screen.getByPlaceholderText(/ask me about/i);
      fireEvent.change(input, { target: { value: 'Generate analysis' } });
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('AI-Generated Analysis')).toBeInTheDocument();
        expect(screen.getByText('AI-generated analysis based on live ERP data—please review all recommendations')).toBeInTheDocument();
      });
    });

    it('should show data sources in disclaimer', async () => {
      const mockOnSendMessage = vi.fn().mockResolvedValue(mockERPResponse);
      
      render(<ChatbotUI onSendMessage={mockOnSendMessage} />);

      const input = screen.getByPlaceholderText(/ask me about/i);
      fireEvent.change(input, { target: { value: 'Show revenue' } });
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('Data sources: quickbooks, sage_intacct')).toBeInTheDocument();
      });
    });

    it('should handle responses without metadata gracefully', async () => {
      const responseWithoutMetadata: AgentResponse = {
        summary: 'Basic analysis without ERP integration',
        dataOverview: {
          totalRecords: 100,
          dateRange: { start: Date.now() - 86400000, end: Date.now() },
          keyMetrics: [
            { name: 'Basic Metric', value: 1000, trend: 'up' }
          ]
        },
        patterns: [],
        actions: []
      };

      const mockOnSendMessage = vi.fn().mockResolvedValue(responseWithoutMetadata);
      
      render(<ChatbotUI onSendMessage={mockOnSendMessage} />);

      const input = screen.getByPlaceholderText(/ask me about/i);
      fireEvent.change(input, { target: { value: 'Basic analysis' } });
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        // Should not show AI disclaimer section
        expect(screen.queryByText('AI-Generated Analysis')).not.toBeInTheDocument();
      });
    });
  });

  describe('Segmented Output Enhancement', () => {
    it('should enhance patterns section with ERP-specific patterns', async () => {
      const mockOnSendMessage = vi.fn().mockResolvedValue(mockERPResponse);
      
      render(<ChatbotUI onSendMessage={mockOnSendMessage} />);

      const input = screen.getByPlaceholderText(/ask me about/i);
      fireEvent.change(input, { target: { value: 'Analyze patterns' } });
      fireEvent.click(screen.getByRole('button'));

      // Switch to patterns tab
      await waitFor(() => {
        const patternsTab = screen.getByText('Patterns');
        fireEvent.click(patternsTab);
      });

      expect(screen.getByText('Variance Trend')).toBeInTheDocument();
      expect(screen.getByText('Multi Entity Analysis')).toBeInTheDocument();
      expect(screen.getByText('Revenue patterns show positive trajectory with 2 ERP systems connected')).toBeInTheDocument();
    });

    it('should enhance actions section with ERP-specific actions', async () => {
      const mockOnSendMessage = vi.fn().mockResolvedValue(mockERPResponse);
      
      render(<ChatbotUI onSendMessage={mockOnSendMessage} />);

      const input = screen.getByPlaceholderText(/ask me about/i);
      fireEvent.change(input, { target: { value: 'Show actions' } });
      fireEvent.click(screen.getByRole('button'));

      // Switch to actions tab
      await waitFor(() => {
        const actionsTab = screen.getByText('Actions');
        fireEvent.click(actionsTab);
      });

      expect(screen.getByText('Variance Review')).toBeInTheDocument();
      expect(screen.getByText('Erp Sync Health')).toBeInTheDocument();
      expect(screen.getByText('Review ERP connection health and data synchronization status')).toBeInTheDocument();
    });

    it('should show automated action indicators', async () => {
      const mockOnSendMessage = vi.fn().mockResolvedValue(mockERPResponse);
      
      render(<ChatbotUI onSendMessage={mockOnSendMessage} />);

      const input = screen.getByPlaceholderText(/ask me about/i);
      fireEvent.change(input, { target: { value: 'Show actions' } });
      fireEvent.click(screen.getByRole('button'));

      // Switch to actions tab
      await waitFor(() => {
        const actionsTab = screen.getByText('Actions');
        fireEvent.click(actionsTab);
      });

      // Should show "Auto" indicator for automated actions
      expect(screen.getByText('Auto')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle ERP connection failures gracefully', async () => {
      const responseWithERPFailure: AgentResponse = {
        summary: 'Analysis completed with some ERP connection issues',
        dataOverview: {
          totalRecords: 500,
          dateRange: { start: Date.now() - 86400000, end: Date.now() },
          erpSources: [
            { type: 'quickbooks', status: 'failed', lastSync: Date.now() - 86400000 },
            { type: 'sage_intacct', status: 'failed', lastSync: Date.now() - 172800000 }
          ],
          keyMetrics: [
            { name: 'Cached Revenue', value: 100000, trend: 'flat', confidence: 0.60 }
          ]
        },
        patterns: [],
        actions: [
          {
            type: 'erp_reconnect',
            description: 'Reconnect failed ERP systems',
            priority: 'high',
            automated: false
          }
        ],
        metadata: {
          dataSource: 'cached_data',
          erpSystems: [],
          confidence: 0.60,
          lastDataRefresh: Date.now() - 172800000,
          grounded: false,
          disclaimer: 'AI-generated analysis based on cached data—ERP connections need attention'
        }
      };

      const mockOnSendMessage = vi.fn().mockResolvedValue(responseWithERPFailure);
      
      render(<ChatbotUI onSendMessage={mockOnSendMessage} />);

      const input = screen.getByPlaceholderText(/ask me about/i);
      fireEvent.change(input, { target: { value: 'Check status' } });
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        // Should show failed status
        const failedElements = screen.getAllByText('failed');
        expect(failedElements.length).toBeGreaterThan(0);
        
        // Should show cached data indicator
        expect(screen.getByText('cached data')).toBeInTheDocument();
        
        // Should show low confidence
        expect(screen.getByText('60%')).toBeInTheDocument();
      });
    });

    it('should display appropriate warnings for stale data', async () => {
      const staleDataResponse: AgentResponse = {
        summary: 'Analysis based on older data due to sync issues',
        dataOverview: {
          totalRecords: 800,
          dateRange: { start: Date.now() - 86400000, end: Date.now() },
          keyMetrics: [
            { name: 'Stale Revenue', value: 95000, trend: 'unknown', confidence: 0.45 }
          ]
        },
        patterns: [],
        actions: [],
        metadata: {
          dataSource: 'cached_data',
          erpSystems: ['quickbooks'],
          confidence: 0.45,
          lastDataRefresh: Date.now() - 604800000, // 1 week old
          grounded: false,
          disclaimer: 'Analysis based on week-old data—please refresh ERP connections'
        }
      };

      const mockOnSendMessage = vi.fn().mockResolvedValue(staleDataResponse);
      
      render(<ChatbotUI onSendMessage={mockOnSendMessage} />);

      const input = screen.getByPlaceholderText(/ask me about/i);
      fireEvent.change(input, { target: { value: 'Show analysis' } });
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('Cached')).toBeInTheDocument();
        expect(screen.getByText('Analysis based on week-old data—please refresh ERP connections')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should render large ERP responses efficiently', async () => {
      const largeERPResponse: AgentResponse = {
        summary: 'Large dataset analysis from multiple ERP systems',
        dataOverview: {
          totalRecords: 50000,
          dateRange: { start: Date.now() - 2592000000, end: Date.now() }, // 30 days
          erpSources: Array.from({ length: 10 }, (_, i) => ({
            type: 'quickbooks' as const,
            status: 'active' as const,
            lastSync: Date.now() - (i * 3600000)
          })),
          keyMetrics: Array.from({ length: 20 }, (_, i) => ({
            name: `Metric ${i + 1}`,
            value: Math.random() * 100000,
            change: Math.random() * 20 - 10,
            trend: 'up' as const,
            confidence: 0.8 + Math.random() * 0.2
          }))
        },
        patterns: Array.from({ length: 15 }, (_, i) => ({
          type: `pattern_${i}`,
          description: `Pattern description ${i + 1}`,
          confidence: 0.7 + Math.random() * 0.3,
          impact: 'medium' as const
        })),
        actions: Array.from({ length: 10 }, (_, i) => ({
          type: `action_${i}`,
          description: `Action description ${i + 1}`,
          priority: 'medium' as const,
          automated: i % 2 === 0
        })),
        metadata: {
          dataSource: 'live_erp_integration',
          erpSystems: ['quickbooks', 'sage_intacct', 'xero'],
          confidence: 0.95,
          lastDataRefresh: Date.now() - 1800000,
          grounded: true,
          disclaimer: 'Large dataset analysis—performance optimized for 50k+ records'
        }
      };

      const startTime = performance.now();
      const mockOnSendMessage = vi.fn().mockResolvedValue(largeERPResponse);
      
      render(<ChatbotUI onSendMessage={mockOnSendMessage} />);

      const input = screen.getByPlaceholderText(/ask me about/i);
      fireEvent.change(input, { target: { value: 'Large analysis' } });
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('Large dataset analysis from multiple ERP systems')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(5000); // Should render within 5 seconds
    });
  });

  describe('Accessibility', () => {
    it('should maintain accessibility with ERP enhancements', async () => {
      const mockOnSendMessage = vi.fn().mockResolvedValue(mockERPResponse);
      
      render(<ChatbotUI onSendMessage={mockOnSendMessage} />);

      // Check for proper ARIA labels and roles
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();

      // Send message
      const input = screen.getByPlaceholderText(/ask me about/i);
      fireEvent.change(input, { target: { value: 'Accessibility test' } });
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        // Tab navigation should work
        const tabs = screen.getAllByRole('button');
        const dataTab = tabs.find(tab => tab.textContent?.includes('Data Overview'));
        
        if (dataTab) {
          fireEvent.click(dataTab);
          expect(dataTab).toHaveFocus();
        }
      });
    });

    it('should provide proper screen reader support for ERP status', async () => {
      const mockOnSendMessage = vi.fn().mockResolvedValue(mockERPResponse);
      
      render(<ChatbotUI onSendMessage={mockOnSendMessage} />);

      const input = screen.getByPlaceholderText(/ask me about/i);
      fireEvent.change(input, { target: { value: 'Screen reader test' } });
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        // Status indicators should have meaningful text
        const activeStatus = screen.getByText('active');
        const failedStatus = screen.getByText('failed');
        
        expect(activeStatus).toBeInTheDocument();
        expect(failedStatus).toBeInTheDocument();
      });
    });
  });
});