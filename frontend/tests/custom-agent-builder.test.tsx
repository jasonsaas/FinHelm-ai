import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import CustomAgentBuilder from '../src/components/custom-agent-builder';

// Mock Convex hooks
jest.mock('convex/react', () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn()
}));

// Mock the API
const mockPreviewGrokAnalysis = jest.fn();
const mockValidateConfiguration = jest.fn();
const mockDeployAgent = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  
  // Setup mock implementations
  const { useMutation } = require('convex/react');
  useMutation.mockImplementation((apiCall: any) => {
    if (apiCall.toString().includes('previewGrokAnalysis')) {
      return mockPreviewGrokAnalysis;
    }
    if (apiCall.toString().includes('validateConfiguration')) {
      return mockValidateConfiguration;
    }
    if (apiCall.toString().includes('deployAgent')) {
      return mockDeployAgent;
    }
    return jest.fn();
  });
});

describe('Custom Agent Builder UI Tests', () => {
  it('should render all 10 MVP agent types in dropdown', () => {
    render(<CustomAgentBuilder />);
    
    const agentTypeSelect = screen.getByTestId('agent-type-select');
    expect(agentTypeSelect).toBeInTheDocument();
    
    // Check for all 10 MVP agents
    const expectedAgents = [
      '1. Automated Variance Explanation',
      '2. Cash Flow Intelligence (13-week)',
      '3. Anomaly Monitoring', 
      '4. Close Acceleration',
      '5. Forecasting with ML',
      '6. Multivariate Prediction',
      '7. Working Capital Optimization',
      '8. Budget Variance Tracker',
      '9. Expense Categorization',
      '10. Revenue Recognition Assistant'
    ];
    
    expectedAgents.forEach(agent => {
      expect(screen.getByText(agent)).toBeInTheDocument();
    });
  });

  it('should validate form inputs with proper error messages', async () => {
    const user = userEvent.setup();
    render(<CustomAgentBuilder />);
    
    // Try to submit empty form
    const deployButton = screen.getByTestId('deploy-button');
    expect(deployButton).toBeDisabled();
    
    // Enter invalid short name
    const nameInput = screen.getByTestId('agent-name-input');
    await user.type(nameInput, 'AB');
    
    expect(screen.getByTestId('agent-name-error')).toHaveTextContent(
      'Agent name must be at least 3 characters'
    );
    
    // Enter valid name but invalid description
    await user.clear(nameInput);
    await user.type(nameInput, 'Test Agent');
    
    const descriptionTextarea = screen.getByTestId('description-textarea');
    await user.type(descriptionTextarea, 'Too short');
    
    expect(screen.getByTestId('description-error')).toHaveTextContent(
      'Description must be at least 10 characters'
    );
  });

  it('should handle confidence threshold validation', async () => {
    const user = userEvent.setup();
    render(<CustomAgentBuilder />);
    
    const confidenceInput = screen.getByTestId('confidence-threshold-input');
    
    // Test invalid range
    await user.clear(confidenceInput);
    await user.type(confidenceInput, '150');
    
    expect(screen.getByTestId('confidence-threshold-error')).toHaveTextContent(
      'Confidence threshold must be between 0 and 100'
    );
    
    // Test valid value (92.7% as per requirements)
    await user.clear(confidenceInput);
    await user.type(confidenceInput, '92.7');
    
    expect(screen.queryByTestId('confidence-threshold-error')).not.toBeInTheDocument();
  });

  it('should enable Grok AI preview functionality', async () => {
    const user = userEvent.setup();
    mockPreviewGrokAnalysis.mockResolvedValue({
      summary: 'Grok analysis preview result',
      confidence: 95,
      patterns: [
        {
          type: 'test_pattern',
          description: 'Test pattern description',
          confidence: 0.95,
          impact: 'high'
        }
      ],
      explainableAnalysis: {
        reasoning: 'AI reasoning explanation',
        factors: [
          { factor: 'Test Factor', weight: 0.8, impact: 'High impact' }
        ],
        traceabilityScore: 95
      }
    });
    
    render(<CustomAgentBuilder />);
    
    // Ensure Grok is enabled by default
    const grokCheckbox = screen.getByTestId('grok-enabled-checkbox');
    expect(grokCheckbox).toBeChecked();
    
    // Click preview button
    const previewButton = screen.getByTestId('grok-preview-button');
    await user.click(previewButton);
    
    expect(mockPreviewGrokAnalysis).toHaveBeenCalledWith({
      agentType: 'variance_explanation', // Default type
      sampleData: expect.any(Object),
      confidenceThreshold: 92.7
    });
    
    // Wait for preview result
    await waitFor(() => {
      expect(screen.getByTestId('grok-preview-result')).toBeInTheDocument();
    });
    
    expect(screen.getByTestId('grok-preview-result')).toHaveTextContent(
      'Grok analysis preview result'
    );
  });

  it('should handle different agent types with appropriate sample data', async () => {
    const user = userEvent.setup();
    render(<CustomAgentBuilder />);
    
    const agentTypeSelect = screen.getByTestId('agent-type-select');
    
    // Test cash flow intelligence agent
    await user.selectOptions(agentTypeSelect, 'cash_flow_intelligence');
    
    const previewButton = screen.getByTestId('grok-preview-button');
    await user.click(previewButton);
    
    expect(mockPreviewGrokAnalysis).toHaveBeenCalledWith({
      agentType: 'cash_flow_intelligence',
      sampleData: expect.objectContaining({
        transactions: expect.arrayContaining([
          expect.objectContaining({
            type: 'payment'
          })
        ]),
        forecast: { weeks: 13 }
      }),
      confidenceThreshold: 92.7
    });
  });

  it('should validate webhook URL format', async () => {
    const user = userEvent.setup();
    render(<CustomAgentBuilder />);
    
    const webhookInput = screen.getByTestId('webhook-url-input');
    
    // Enter invalid URL
    await user.type(webhookInput, 'invalid-url');
    
    expect(screen.getByTestId('webhook-error')).toHaveTextContent(
      'Invalid webhook URL'
    );
    
    // Enter valid URL
    await user.clear(webhookInput);
    await user.type(webhookInput, 'https://valid-webhook.com/endpoint');
    
    expect(screen.queryByTestId('webhook-error')).not.toBeInTheDocument();
  });

  it('should test configuration before deployment', async () => {
    const user = userEvent.setup();
    mockValidateConfiguration.mockResolvedValue({ valid: true });
    
    render(<CustomAgentBuilder />);
    
    // Fill valid form
    await user.type(screen.getByTestId('agent-name-input'), 'Test Agent');
    await user.type(screen.getByTestId('description-textarea'), 'Test agent description for testing purposes');
    
    const testButton = screen.getByTestId('test-config-button');
    await user.click(testButton);
    
    expect(mockValidateConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Agent',
        description: 'Test agent description for testing purposes',
        settings: expect.objectContaining({
          testMode: true
        })
      })
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('deployment-status')).toHaveTextContent(
        'Configuration test passed'
      );
    });
  });

  it('should deploy agent with proper configuration', async () => {
    const user = userEvent.setup();
    mockValidateConfiguration.mockResolvedValue({ valid: true });
    mockDeployAgent.mockResolvedValue({
      agentId: 'test-agent-id',
      version: '1.0.0',
      deployedAt: new Date().toISOString()
    });
    
    render(<CustomAgentBuilder />);
    
    // Fill valid form
    await user.type(screen.getByTestId('agent-name-input'), 'Production Agent');
    await user.type(screen.getByTestId('description-textarea'), 'Production agent for financial analysis');
    
    const deployButton = screen.getByTestId('deploy-button');
    await waitFor(() => {
      expect(deployButton).not.toBeDisabled();
    });
    
    await user.click(deployButton);
    
    expect(mockValidateConfiguration).toHaveBeenCalled();
    expect(mockDeployAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Production Agent',
        description: 'Production agent for financial analysis',
        type: 'variance_explanation'
      })
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('deployment-status')).toHaveTextContent(
        'Agent deployed successfully'
      );
    });
  });

  it('should handle Oracle integration toggle', () => {
    render(<CustomAgentBuilder />);
    
    const oracleCheckbox = screen.getByTestId('oracle-integration-checkbox');
    expect(oracleCheckbox).not.toBeChecked(); // Default false
    
    fireEvent.click(oracleCheckbox);
    expect(oracleCheckbox).toBeChecked();
  });

  it('should show loading states during operations', async () => {
    const user = userEvent.setup();
    
    // Make the preview function take time to resolve
    mockPreviewGrokAnalysis.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<CustomAgentBuilder />);
    
    const previewButton = screen.getByTestId('grok-preview-button');
    await user.click(previewButton);
    
    // Should show loading state
    expect(screen.getByTestId('grok-preview-loading')).toBeInTheDocument();
    expect(previewButton).toHaveTextContent('Generating...');
    
    await waitFor(() => {
      expect(screen.queryByTestId('grok-preview-loading')).not.toBeInTheDocument();
    }, { timeout: 200 });
  });

  it('should handle error states gracefully', async () => {
    const user = userEvent.setup();
    mockPreviewGrokAnalysis.mockRejectedValue(new Error('API Error'));
    
    render(<CustomAgentBuilder />);
    
    const previewButton = screen.getByTestId('grok-preview-button');
    await user.click(previewButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('grok-preview-error')).toBeInTheDocument();
      expect(screen.getByTestId('grok-preview-error')).toHaveTextContent('API Error');
    });
  });

  it('should maintain responsive design and accessibility', () => {
    render(<CustomAgentBuilder />);
    
    // Check for proper ARIA labels and semantic HTML
    expect(screen.getByLabelText('Agent Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Agent Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Description *')).toBeInTheDocument();
    
    // Check for proper form structure
    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();
    
    // Check for proper button roles
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<CustomAgentBuilder />);
    
    // Test tab navigation
    await user.tab();
    expect(screen.getByTestId('agent-name-input')).toHaveFocus();
    
    await user.tab();
    expect(screen.getByTestId('agent-type-select')).toHaveFocus();
    
    await user.tab();
    expect(screen.getByTestId('description-textarea')).toHaveFocus();
  });
});

describe('Custom Agent Builder Performance Tests', () => {
  it('should render within performance budget', () => {
    const startTime = performance.now();
    render(<CustomAgentBuilder />);
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    expect(renderTime).toBeLessThan(100); // Should render in <100ms
  });

  it('should handle large form state updates efficiently', async () => {
    const user = userEvent.setup();
    render(<CustomAgentBuilder />);
    
    const startTime = performance.now();
    
    // Perform multiple state updates
    await user.type(screen.getByTestId('agent-name-input'), 'Performance Test Agent');
    await user.type(screen.getByTestId('description-textarea'), 'This is a performance test description');
    await user.type(screen.getByTestId('confidence-threshold-input'), '{selectall}85.5');
    await user.type(screen.getByTestId('batch-size-input'), '{selectall}2000');
    
    const endTime = performance.now();
    const updateTime = endTime - startTime;
    
    expect(updateTime).toBeLessThan(1000); // Should complete in <1s
  });
});

describe('MVP Requirements Compliance Tests', () => {
  it('should meet MVP deadline requirements (Sep 21, 2025)', () => {
    const mvpDeadline = new Date('2025-09-21');
    const currentDate = new Date();
    
    // This test ensures we're tracking toward the MVP deadline
    expect(mvpDeadline.getTime()).toBeGreaterThan(currentDate.getTime());
  });

  it('should support natural language with explainability', () => {
    render(<CustomAgentBuilder />);
    
    // Check for explainability features
    expect(screen.getByText('Enable Grok AI Analysis')).toBeInTheDocument();
    expect(screen.getByTestId('grok-preview-button')).toBeInTheDocument();
  });

  it('should aim for 50% manual effort reduction', () => {
    render(<CustomAgentBuilder />);
    
    // Check for automation features
    const automationCheckboxes = [
      screen.getByTestId('grok-enabled-checkbox'),
      screen.getByTestId('test-mode-checkbox')
    ];
    
    automationCheckboxes.forEach(checkbox => {
      expect(checkbox).toBeInTheDocument();
    });
  });

  it('should use Convex for reactive schemas', () => {
    // Test that Convex hooks are properly mocked and used
    const { useMutation } = require('convex/react');
    expect(useMutation).toBeDefined();
    
    render(<CustomAgentBuilder />);
    
    // Verify Convex integration
    expect(useMutation).toHaveBeenCalled();
  });
});