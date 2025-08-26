import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ConvexProvider } from 'convex/react';
import { CustomBuilderUI } from '../../components/custom-builder-ui';

// Mock the Convex client
const mockConvex = {
  // Mock convex methods
};

// Mock the hooks
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
    scenarios: [],
    isDebouncing: false
  }),
  FINANCIAL_SCENARIOS: []
}));

jest.mock('convex/react', () => ({
  ConvexProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useMutation: () => jest.fn()
}));

describe('CustomBuilderUI', () => {
  const defaultProps = {
    organizationId: 'org123' as any,
    userId: 'user123' as any,
    onAgentCreated: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Form Validation', () => {
    it('should display validation errors for empty required fields', async () => {
      render(<CustomBuilderUI {...defaultProps} />);
      
      // Try to submit empty form
      const deployButton = screen.getByText('Deploy Agent');
      fireEvent.click(deployButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Agent name must be at least 3 characters/)).toBeInTheDocument();
        expect(screen.getByText(/Description must be at least 10 characters/)).toBeInTheDocument();
        expect(screen.getByText(/Prompt must be at least 50 characters/)).toBeInTheDocument();
      });
    });

    it('should validate agent name format', async () => {
      render(<CustomBuilderUI {...defaultProps} />);
      
      const nameInput = screen.getByPlaceholderText('e.g., Financial Insights Agent');
      
      // Test invalid characters
      await userEvent.type(nameInput, 'Agent@#$%');
      
      await waitFor(() => {
        expect(screen.getByText(/Agent name can only contain letters, numbers, spaces, hyphens, and underscores/)).toBeInTheDocument();
      });
    });

    it('should validate version format', async () => {
      render(<CustomBuilderUI {...defaultProps} />);
      
      const versionInput = screen.getByPlaceholderText('1.0.0');
      
      // Test invalid version format
      await userEvent.clear(versionInput);
      await userEvent.type(versionInput, 'invalid-version');
      
      await waitFor(() => {
        expect(screen.getByText(/Version must follow semantic versioning/)).toBeInTheDocument();
      });
    });

    it('should validate prompt length', async () => {
      render(<CustomBuilderUI {...defaultProps} />);
      
      const promptTextarea = screen.getByPlaceholderText(/Define your agent's behavior/);
      
      // Test too short prompt
      await userEvent.type(promptTextarea, 'Short prompt');
      
      await waitFor(() => {
        expect(screen.getByText(/Prompt must be at least 50 characters/)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should enable deploy button when form is valid', async () => {
      render(<CustomBuilderUI {...defaultProps} />);
      
      // Fill out valid form
      await userEvent.type(screen.getByPlaceholderText('e.g., Financial Insights Agent'), 'Test Agent');
      await userEvent.type(screen.getByPlaceholderText(/Describe what this agent does/), 'This is a test agent for financial analysis');
      await userEvent.type(screen.getByPlaceholderText(/Define your agent's behavior/), 'You are a financial analysis agent that helps users understand their financial data and provides actionable insights for business improvement.');
      
      await waitFor(() => {
        const deployButton = screen.getByText('Deploy Agent');
        expect(deployButton).not.toHaveAttribute('disabled');
      });
    });

    it('should reset form when reset button is clicked', async () => {
      render(<CustomBuilderUI {...defaultProps} />);
      
      // Fill out form
      const nameInput = screen.getByPlaceholderText('e.g., Financial Insights Agent');
      await userEvent.type(nameInput, 'Test Agent');
      
      // Click reset
      const resetButton = screen.getByText('Reset');
      fireEvent.click(resetButton);
      
      await waitFor(() => {
        expect(nameInput).toHaveValue('');
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between builder, preview, and versions tabs', async () => {
      render(<CustomBuilderUI {...defaultProps} />);
      
      // Should start on builder tab
      expect(screen.getByText(/Agent Name \*/)).toBeInTheDocument();
      
      // Switch to preview tab
      const previewTab = screen.getByText('Preview');
      fireEvent.click(previewTab);
      
      await waitFor(() => {
        expect(screen.getByText(/Preview is only available when using Grok Beta/)).toBeInTheDocument();
      });
      
      // Switch to versions tab
      const versionsTab = screen.getByText('Versions');
      fireEvent.click(versionsTab);
      
      await waitFor(() => {
        expect(screen.getByText(/Enter an agent name to view version history/)).toBeInTheDocument();
      });
    });
  });

  describe('User-Defined Calls', () => {
    it('should add new user-defined call', async () => {
      render(<CustomBuilderUI {...defaultProps} />);
      
      // Click add call button
      const addCallButton = screen.getByText('Add Call');
      fireEvent.click(addCallButton);
      
      await waitFor(() => {
        expect(screen.getByText('Call #1')).toBeInTheDocument();
      });
    });

    it('should remove user-defined call', async () => {
      render(<CustomBuilderUI {...defaultProps} />);
      
      // Add a call first
      const addCallButton = screen.getByText('Add Call');
      fireEvent.click(addCallButton);
      
      await waitFor(() => {
        expect(screen.getByText('Call #1')).toBeInTheDocument();
      });
      
      // Remove the call
      const removeButton = screen.getByRole('button', { name: '' }); // Trash icon button
      fireEvent.click(removeButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Call #1')).not.toBeInTheDocument();
      });
    });
  });

  describe('Model Selection', () => {
    it('should enable preview when Grok Beta is selected', async () => {
      render(<CustomBuilderUI {...defaultProps} />);
      
      // Select Grok Beta model
      const modelSelect = screen.getByDisplayValue(/GPT-4/);
      fireEvent.change(modelSelect, { target: { value: 'grok-beta' } });
      
      // Switch to preview tab
      const previewTab = screen.getByText('Preview');
      fireEvent.click(previewTab);
      
      await waitFor(() => {
        expect(screen.getByText('Test Scenarios')).toBeInTheDocument();
      });
    });
  });

  describe('Prompt Examples', () => {
    it('should copy example prompt when category button is clicked', async () => {
      render(<CustomBuilderUI {...defaultProps} />);
      
      // Select financial intelligence category
      const categorySelect = screen.getByDisplayValue(/Custom/);
      fireEvent.change(categorySelect, { target: { value: 'financial_intelligence' } });
      
      await waitFor(() => {
        const promptTextarea = screen.getByPlaceholderText(/Define your agent's behavior/);
        expect(promptTextarea).toHaveValue(expect.stringContaining('financial intelligence agent'));
      });
    });
  });

  describe('Deployment Status', () => {
    it('should show deployment success message', async () => {
      const mockCreateAgent = jest.fn().mockResolvedValue('agent123');
      
      jest.mocked(require('convex/react').useMutation).mockReturnValue(mockCreateAgent);
      
      render(<CustomBuilderUI {...defaultProps} />);
      
      // Fill out valid form
      await userEvent.type(screen.getByPlaceholderText('e.g., Financial Insights Agent'), 'Test Agent');
      await userEvent.type(screen.getByPlaceholderText(/Describe what this agent does/), 'This is a test agent for financial analysis');
      await userEvent.type(screen.getByPlaceholderText(/Define your agent's behavior/), 'You are a financial analysis agent that helps users understand their financial data and provides actionable insights for business improvement.');
      
      // Submit form
      const deployButton = screen.getByText('Deploy Agent');
      fireEvent.click(deployButton);
      
      await waitFor(() => {
        expect(screen.getByText(/deployed successfully/)).toBeInTheDocument();
      });
    });

    it('should show deployment error message', async () => {
      const mockCreateAgent = jest.fn().mockRejectedValue(new Error('Deployment failed'));
      
      jest.mocked(require('convex/react').useMutation).mockReturnValue(mockCreateAgent);
      
      render(<CustomBuilderUI {...defaultProps} />);
      
      // Fill out valid form and submit
      await userEvent.type(screen.getByPlaceholderText('e.g., Financial Insights Agent'), 'Test Agent');
      await userEvent.type(screen.getByPlaceholderText(/Describe what this agent does/), 'This is a test agent for financial analysis');
      await userEvent.type(screen.getByPlaceholderText(/Define your agent's behavior/), 'You are a financial analysis agent that helps users understand their financial data and provides actionable insights for business improvement.');
      
      const deployButton = screen.getByText('Deploy Agent');
      fireEvent.click(deployButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Deployment failed/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<CustomBuilderUI {...defaultProps} />);
      
      expect(screen.getByLabelText(/Agent Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
      expect(screen.getByLabelText(/AI Model/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Language/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Agent Prompt/)).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      render(<CustomBuilderUI {...defaultProps} />);
      
      const nameInput = screen.getByPlaceholderText('e.g., Financial Insights Agent');
      nameInput.focus();
      
      // Tab through form fields
      await userEvent.tab();
      expect(screen.getByPlaceholderText('1.0.0')).toHaveFocus();
      
      await userEvent.tab();
      expect(screen.getByPlaceholderText(/Describe what this agent does/)).toHaveFocus();
    });
  });

  describe('Character Counter', () => {
    it('should show character count for prompt field', async () => {
      render(<CustomBuilderUI {...defaultProps} />);
      
      const promptTextarea = screen.getByPlaceholderText(/Define your agent's behavior/);
      await userEvent.type(promptTextarea, 'Test prompt');
      
      await waitFor(() => {
        expect(screen.getByText('11/2000')).toBeInTheDocument();
      });
    });
  });
});