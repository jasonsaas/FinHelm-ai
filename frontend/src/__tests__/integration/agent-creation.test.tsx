import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CustomBuilderUI } from '../../components/custom-builder-ui';

// Mock all dependencies
jest.mock('convex/react', () => ({
  ConvexProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useMutation: () => jest.fn().mockResolvedValue('created-agent-id')
}));

jest.mock('../../hooks/useGrokPreview', () => ({
  __esModule: true,
  default: () => ({
    isLoading: false,
    error: null,
    preview: null,
    generatePreview: jest.fn(),
    generatePreviewWithScenario: jest.fn(),
    cancelPreview: jest.fn(),
    clearPreview: jest.fn(),
    getCacheStats: () => ({ validEntries: 0 }),
    scenarios: [
      {
        id: 'expense_report_analysis',
        name: 'Expense Report Analysis',
        description: 'Test scenario',
        query: 'Test query',
        data: { test: 'data' }
      }
    ],
    isDebouncing: false
  }),
  FINANCIAL_SCENARIOS: [
    {
      id: 'expense_report_analysis',
      name: 'Expense Report Analysis',
      description: 'Test scenario',
      query: 'Test query',
      data: { test: 'data' }
    }
  ]
}));

jest.mock('../../components/VersionManager', () => {
  return function MockVersionManager({ onVersionSelect }: any) {
    return (
      <div data-testid="version-manager">
        <button
          onClick={() => onVersionSelect?.({
            id: 'v1',
            version: '1.0.0',
            config: { prompt: 'Test prompt', model: 'grok-beta' }
          })}
        >
          Load Test Version
        </button>
      </div>
    );
  };
});

describe('Agent Creation Integration', () => {
  const defaultProps = {
    organizationId: 'org123' as any,
    userId: 'user123' as any,
    onAgentCreated: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full agent creation workflow', async () => {
    render(<CustomBuilderUI {...defaultProps} />);

    // Fill out the form
    await userEvent.type(
      screen.getByPlaceholderText('e.g., Financial Insights Agent'),
      'Complete Test Agent'
    );

    await userEvent.type(
      screen.getByPlaceholderText(/Describe what this agent does/),
      'This agent performs comprehensive financial analysis with advanced insights and reporting capabilities'
    );

    await userEvent.selectOptions(
      screen.getByDisplayValue(/GPT-4/),
      'grok-beta'
    );

    await userEvent.selectOptions(
      screen.getByDisplayValue(/English/),
      'es'
    );

    await userEvent.selectOptions(
      screen.getByDisplayValue(/Custom/),
      'financial_intelligence'
    );

    // Wait for prompt to be auto-filled
    await waitFor(() => {
      const promptTextarea = screen.getByPlaceholderText(/Define your agent's behavior/);
      expect(promptTextarea).toHaveValue(expect.stringContaining('financial intelligence agent'));
    });

    // Add user-defined calls
    const addCallButton = screen.getByText('Add Call');
    await userEvent.click(addCallButton);

    await waitFor(() => {
      expect(screen.getByText('Call #1')).toBeInTheDocument();
    });

    // Fill out user-defined call
    const callNameInputs = screen.getAllByPlaceholderText(/e.g., Rewrite expense report/);
    const callDescInputs = screen.getAllByPlaceholderText(/e.g., Rewrites expense report/);
    const callPromptInputs = screen.getAllByPlaceholderText(/Define how the agent should handle/);

    await userEvent.type(callNameInputs[0], 'Analyze Financial Health');
    await userEvent.type(callDescInputs[0], 'Comprehensive financial health analysis');
    await userEvent.type(callPromptInputs[0], 'Perform a detailed analysis of financial health indicators including liquidity, profitability, and solvency ratios');

    // Add another call
    await userEvent.click(addCallButton);

    await waitFor(() => {
      expect(screen.getByText('Call #2')).toBeInTheDocument();
    });

    await userEvent.type(callNameInputs[1], 'Generate Executive Summary');
    await userEvent.type(callDescInputs[1], 'Create executive summary report');
    await userEvent.type(callPromptInputs[1], 'Generate a concise executive summary highlighting key financial performance metrics and recommendations');

    // Test preview functionality
    const previewTab = screen.getByText('Preview');
    await userEvent.click(previewTab);

    await waitFor(() => {
      expect(screen.getByText('Test Scenarios')).toBeInTheDocument();
    });

    // Select a scenario
    const scenarioButton = screen.getByText('Expense Report Analysis');
    await userEvent.click(scenarioButton);

    // Test version management
    const versionsTab = screen.getByText('Versions');
    await userEvent.click(versionsTab);

    await waitFor(() => {
      expect(screen.getByTestId('version-manager')).toBeInTheDocument();
    });

    // Load a version
    const loadVersionButton = screen.getByText('Load Test Version');
    await userEvent.click(loadVersionButton);

    // Go back to builder tab
    const builderTab = screen.getByText('Builder');
    await userEvent.click(builderTab);

    // Deploy the agent
    await waitFor(() => {
      const deployButton = screen.getByText('Deploy Agent');
      expect(deployButton).not.toHaveAttribute('disabled');
    });

    const deployButton = screen.getByText('Deploy Agent');
    await userEvent.click(deployButton);

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/deployed successfully/)).toBeInTheDocument();
    });

    // Verify callback was called
    expect(defaultProps.onAgentCreated).toHaveBeenCalledWith('created-agent-id');
  });

  it('should handle validation errors during creation', async () => {
    render(<CustomBuilderUI {...defaultProps} />);

    // Try to submit with minimal invalid data
    await userEvent.type(
      screen.getByPlaceholderText('e.g., Financial Insights Agent'),
      'AB' // Too short
    );

    await userEvent.type(
      screen.getByPlaceholderText(/Describe what this agent does/),
      'Short' // Too short
    );

    const deployButton = screen.getByText('Deploy Agent');
    await userEvent.click(deployButton);

    await waitFor(() => {
      expect(screen.getByText(/Agent name must be at least 3 characters/)).toBeInTheDocument();
      expect(screen.getByText(/Description must be at least 10 characters/)).toBeInTheDocument();
      expect(screen.getByText(/Prompt must be at least 50 characters/)).toBeInTheDocument();
    });

    // Form should still be invalid
    expect(deployButton).toHaveAttribute('disabled');
  });

  it('should handle user-defined calls management', async () => {
    render(<CustomBuilderUI {...defaultProps} />);

    // Add multiple calls
    const addCallButton = screen.getByText('Add Call');
    
    await userEvent.click(addCallButton);
    await userEvent.click(addCallButton);
    await userEvent.click(addCallButton);

    await waitFor(() => {
      expect(screen.getByText('Call #1')).toBeInTheDocument();
      expect(screen.getByText('Call #2')).toBeInTheDocument();
      expect(screen.getByText('Call #3')).toBeInTheDocument();
    });

    // Remove middle call
    const removeButtons = screen.getAllByRole('button', { name: '' }); // Trash icon buttons
    const middleRemoveButton = removeButtons.find(button => 
      button.closest('[class*="card"]')?.textContent?.includes('Call #2')
    );
    
    if (middleRemoveButton) {
      await userEvent.click(middleRemoveButton);
    }

    await waitFor(() => {
      expect(screen.queryByText('Call #2')).not.toBeInTheDocument();
      expect(screen.getByText('Call #1')).toBeInTheDocument();
      expect(screen.getByText('Call #3')).toBeInTheDocument();
    });
  });

  it('should preserve form state when switching tabs', async () => {
    render(<CustomBuilderUI {...defaultProps} />);

    // Fill out form
    const agentName = 'Tab Switch Test Agent';
    await userEvent.type(
      screen.getByPlaceholderText('e.g., Financial Insights Agent'),
      agentName
    );

    // Switch to preview tab
    await userEvent.click(screen.getByText('Preview'));

    // Switch back to builder
    await userEvent.click(screen.getByText('Builder'));

    // Verify form state is preserved
    await waitFor(() => {
      expect(screen.getByDisplayValue(agentName)).toBeInTheDocument();
    });
  });

  it('should handle category-based prompt examples', async () => {
    render(<CustomBuilderUI {...defaultProps} />);

    const categorySelect = screen.getByDisplayValue(/Custom/);
    
    // Test different categories
    const categories = [
      'financial_intelligence',
      'supply_chain',
      'revenue_customer',
      'it_operations'
    ];

    for (const category of categories) {
      await userEvent.selectOptions(categorySelect, category);
      
      await waitFor(() => {
        const promptTextarea = screen.getByPlaceholderText(/Define your agent's behavior/);
        const promptValue = (promptTextarea as HTMLTextAreaElement).value;
        expect(promptValue.length).toBeGreaterThan(50);
        expect(promptValue.toLowerCase()).toContain(category.replace('_', ' '));
      });
    }
  });

  it('should handle form reset correctly', async () => {
    render(<CustomBuilderUI {...defaultProps} />);

    // Fill out form
    await userEvent.type(
      screen.getByPlaceholderText('e.g., Financial Insights Agent'),
      'Reset Test Agent'
    );

    await userEvent.type(
      screen.getByPlaceholderText(/Describe what this agent does/),
      'Agent to be reset'
    );

    // Add user-defined call
    const addCallButton = screen.getByText('Add Call');
    await userEvent.click(addCallButton);

    // Reset form
    const resetButton = screen.getByText('Reset');
    await userEvent.click(resetButton);

    // Verify everything is cleared
    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g., Financial Insights Agent')).toHaveValue('');
      expect(screen.getByPlaceholderText(/Describe what this agent does/)).toHaveValue('');
      expect(screen.queryByText('Call #1')).not.toBeInTheDocument();
    });
  });

  it('should display character count for prompt field', async () => {
    render(<CustomBuilderUI {...defaultProps} />);

    const promptTextarea = screen.getByPlaceholderText(/Define your agent's behavior/);
    const testPrompt = 'This is a test prompt for counting characters in the textarea field';
    
    await userEvent.type(promptTextarea, testPrompt);

    await waitFor(() => {
      expect(screen.getByText(`${testPrompt.length}/2000`)).toBeInTheDocument();
    });
  });

  it('should handle deployment errors gracefully', async () => {
    // Mock failed deployment
    jest.mocked(require('convex/react').useMutation).mockReturnValue(
      jest.fn().mockRejectedValue(new Error('Network error'))
    );

    render(<CustomBuilderUI {...defaultProps} />);

    // Fill out valid form
    await userEvent.type(
      screen.getByPlaceholderText('e.g., Financial Insights Agent'),
      'Error Test Agent'
    );

    await userEvent.type(
      screen.getByPlaceholderText(/Describe what this agent does/),
      'This agent is used to test deployment error handling'
    );

    await userEvent.type(
      screen.getByPlaceholderText(/Define your agent's behavior/),
      'You are a test agent used to verify error handling during deployment process'
    );

    // Deploy
    const deployButton = screen.getByText('Deploy Agent');
    await userEvent.click(deployButton);

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });

    // onAgentCreated should not be called
    expect(defaultProps.onAgentCreated).not.toHaveBeenCalled();
  });
});