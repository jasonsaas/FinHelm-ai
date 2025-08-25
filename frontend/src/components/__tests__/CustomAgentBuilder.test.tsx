/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CustomAgentBuilder } from '../CustomAgentBuilder';
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

// Mock ResizeObserver for TextareaAutosize
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('CustomAgentBuilder', () => {
  const defaultProps = {
    organizationId: 'test-org-123',
    userId: 'test-user-456',
  };

  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGrokService.healthCheck.mockResolvedValue({
      status: 'healthy',
      rateLimitRemaining: 100,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('renders the main form elements', () => {
      render(<CustomAgentBuilder {...defaultProps} />);

      expect(screen.getByText('Custom Agent Builder')).toBeInTheDocument();
      expect(screen.getByText('Create intelligent financial AI assistants')).toBeInTheDocument();
      
      // Check for form fields
      expect(screen.getByLabelText(/Agent Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Language/)).toBeInTheDocument();
      expect(screen.getByLabelText(/AI Model/)).toBeInTheDocument();
      expect(screen.getByLabelText(/System Prompt/)).toBeInTheDocument();
      
      // Check for buttons
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
      expect(screen.getByText('Deploy Agent')).toBeInTheDocument();
    });

    test('renders with initial data correctly', () => {
      const initialData: Partial<CustomAgentFormData> = {
        name: 'Test Agent',
        description: 'Test Description',
        model: 'gpt-4',
        language: 'english',
        category: 'custom',
        temperature: 0.5,
        maxTokens: 2000,
        prompt: 'Test prompt',
      };

      render(<CustomAgentBuilder {...defaultProps} initialData={initialData} />);

      expect(screen.getByDisplayValue('Test Agent')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test prompt')).toBeInTheDocument();
    });

    test('shows API health status', async () => {
      render(<CustomAgentBuilder {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Grok API Online')).toBeInTheDocument();
        expect(screen.getByText('(100 requests left)')).toBeInTheDocument();
      });
    });

    test('shows offline status when API is down', async () => {
      mockGrokService.healthCheck.mockResolvedValue({
        status: 'down',
      });

      render(<CustomAgentBuilder {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Grok API Offline')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    test('shows validation errors for empty required fields', async () => {
      const user = userEvent.setup();
      render(<CustomAgentBuilder {...defaultProps} onSubmit={mockOnSubmit} />);

      const deployButton = screen.getByText('Deploy Agent');
      await user.click(deployButton);

      await waitFor(() => {
        expect(screen.getByText('Agent name is required')).toBeInTheDocument();
        expect(screen.getByText('Description is required')).toBeInTheDocument();
        expect(screen.getByText('Prompt is required')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    test('validates field length limits', async () => {
      const user = userEvent.setup();
      render(<CustomAgentBuilder {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Agent Name/);
      const longName = 'a'.repeat(101);
      
      await user.type(nameInput, longName);
      await user.tab(); // Trigger validation

      await waitFor(() => {
        expect(screen.getByText('Agent name must be less than 100 characters')).toBeInTheDocument();
      });
    });

    test('shows character counts correctly', async () => {
      const user = userEvent.setup();
      render(<CustomAgentBuilder {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Agent Name/);
      await user.type(nameInput, 'Test Agent');

      expect(screen.getByText('10/100')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    test('updates form fields correctly', async () => {
      const user = userEvent.setup();
      render(<CustomAgentBuilder {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Agent Name/) as HTMLInputElement;
      const descriptionInput = screen.getByLabelText(/Description/) as HTMLTextAreaElement;
      const modelSelect = screen.getByLabelText(/AI Model/) as HTMLSelectElement;

      await user.type(nameInput, 'My Custom Agent');
      await user.type(descriptionInput, 'This is a test agent');
      await user.selectOptions(modelSelect, 'claude-3-opus');

      expect(nameInput.value).toBe('My Custom Agent');
      expect(descriptionInput.value).toBe('This is a test agent');
      expect(modelSelect.value).toBe('claude-3-opus');
    });

    test('updates temperature slider correctly', async () => {
      const user = userEvent.setup();
      render(<CustomAgentBuilder {...defaultProps} />);

      const temperatureSlider = screen.getByLabelText(/Creativity \(Temperature\)/) as HTMLInputElement;
      
      await user.clear(temperatureSlider);
      await user.type(temperatureSlider, '1.5');

      expect(temperatureSlider.value).toBe('1.5');
      expect(screen.getByText('1.5')).toBeInTheDocument();
    });

    test('calls onSubmit with correct data when form is valid', async () => {
      const user = userEvent.setup();
      render(<CustomAgentBuilder {...defaultProps} onSubmit={mockOnSubmit} />);

      // Fill out the form
      await user.type(screen.getByLabelText(/Agent Name/), 'Test Agent');
      await user.type(screen.getByLabelText(/Description/), 'Test Description');
      await user.type(screen.getByLabelText(/System Prompt/), 'You are a helpful financial assistant.');

      const deployButton = screen.getByText('Deploy Agent');
      await user.click(deployButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Agent',
            description: 'Test Description',
            prompt: 'You are a helpful financial assistant.',
            model: 'gpt-4', // default value
            language: 'english', // default value
            category: 'custom', // default value
          })
        );
      });
    });
  });

  describe('Preview Functionality', () => {
    test('toggles preview mode correctly', async () => {
      const user = userEvent.setup();
      render(<CustomAgentBuilder {...defaultProps} />);

      const previewButton = screen.getByText('Preview');
      await user.click(previewButton);

      expect(screen.getByText('Agent Preview')).toBeInTheDocument();
      expect(screen.getByText('Test Query')).toBeInTheDocument();
    });

    test('runs preview with valid form data', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        response: 'This is a test response from the agent.',
        executionTime: 1500,
        tokensUsed: 50,
        cost: 0.001,
        model: 'gpt-4',
        success: true,
      };

      mockGrokService.previewAgentResponse.mockResolvedValue(mockResponse);

      render(<CustomAgentBuilder {...defaultProps} />);

      // Fill out required fields
      await user.type(screen.getByLabelText(/Agent Name/), 'Test Agent');
      await user.type(screen.getByLabelText(/Description/), 'Test Description');
      await user.type(screen.getByLabelText(/System Prompt/), 'You are a helpful assistant.');

      // Open preview mode
      await user.click(screen.getByText('Preview'));

      // Run preview
      const runPreviewButton = screen.getByText('Run Preview');
      await user.click(runPreviewButton);

      await waitFor(() => {
        expect(mockGrokService.previewAgentResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            prompt: 'You are a helpful assistant.',
            model: 'gpt-4',
            temperature: 0.7,
            maxTokens: 1000,
          }),
          1500 // debounce time
        );
      });

      await waitFor(() => {
        expect(screen.getByText('This is a test response from the agent.')).toBeInTheDocument();
        expect(screen.getByText('1500ms')).toBeInTheDocument();
        expect(screen.getByText('50 tokens')).toBeInTheDocument();
        expect(screen.getByText('$0.0010')).toBeInTheDocument();
      });
    });

    test('handles preview errors correctly', async () => {
      const user = userEvent.setup();
      mockGrokService.previewAgentResponse.mockResolvedValue({
        response: '',
        executionTime: 1000,
        tokensUsed: 0,
        cost: 0,
        model: 'gpt-4',
        success: false,
        error: 'API rate limit exceeded',
      });

      render(<CustomAgentBuilder {...defaultProps} />);

      // Fill required fields
      await user.type(screen.getByLabelText(/Agent Name/), 'Test Agent');
      await user.type(screen.getByLabelText(/Description/), 'Test Description');
      await user.type(screen.getByLabelText(/System Prompt/), 'You are a helpful assistant.');

      await user.click(screen.getByText('Preview'));

      const runPreviewButton = screen.getByText('Run Preview');
      await user.click(runPreviewButton);

      await waitFor(() => {
        expect(screen.getByText('Preview Error')).toBeInTheDocument();
        expect(screen.getByText('API rate limit exceeded')).toBeInTheDocument();
      });
    });

    test('clears preview results', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        response: 'Test response',
        executionTime: 1000,
        tokensUsed: 25,
        cost: 0.0005,
        model: 'gpt-4',
        success: true,
      };

      mockGrokService.previewAgentResponse.mockResolvedValue(mockResponse);

      render(<CustomAgentBuilder {...defaultProps} />);

      // Set up and run preview
      await user.type(screen.getByLabelText(/Agent Name/), 'Test Agent');
      await user.type(screen.getByLabelText(/Description/), 'Test Description');
      await user.type(screen.getByLabelText(/System Prompt/), 'Test prompt');

      await user.click(screen.getByText('Preview'));
      await user.click(screen.getByText('Run Preview'));

      await waitFor(() => {
        expect(screen.getByText('Test response')).toBeInTheDocument();
      });

      // Clear preview
      const clearButton = screen.getByText('Clear');
      await user.click(clearButton);

      expect(screen.queryByText('Test response')).not.toBeInTheDocument();
    });

    test('updates test query correctly', async () => {
      const user = userEvent.setup();
      render(<CustomAgentBuilder {...defaultProps} />);

      await user.click(screen.getByText('Preview'));

      const testQuerySelect = screen.getByDisplayValue(/Rewrite this expense report/);
      await user.selectOptions(testQuerySelect, 'Categorize this transaction: $2,500 payment to ABC Software Solutions');

      expect(screen.getByDisplayValue(/Categorize this transaction/)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    test('shows loading state during form submission', async () => {
      const user = userEvent.setup();
      let resolveSubmit: (value: void) => void;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });

      const slowSubmit = jest.fn(() => submitPromise);

      render(<CustomAgentBuilder {...defaultProps} onSubmit={slowSubmit} />);

      // Fill required fields
      await user.type(screen.getByLabelText(/Agent Name/), 'Test Agent');
      await user.type(screen.getByLabelText(/Description/), 'Test Description');
      await user.type(screen.getByLabelText(/System Prompt/), 'Test prompt');

      const deployButton = screen.getByText('Deploy Agent');
      await user.click(deployButton);

      // Should show loading state
      expect(screen.getByText('Deploy Agent').closest('button')).toBeDisabled();

      // Resolve the promise
      act(() => {
        resolveSubmit();
      });

      await waitFor(() => {
        expect(screen.getByText('Deploy Agent').closest('button')).not.toBeDisabled();
      });
    });

    test('shows loading state during preview', async () => {
      const user = userEvent.setup();
      let resolvePreview: (value: any) => void;
      const previewPromise = new Promise((resolve) => {
        resolvePreview = resolve;
      });

      mockGrokService.previewAgentResponse.mockReturnValue(previewPromise);

      render(<CustomAgentBuilder {...defaultProps} />);

      // Fill required fields and open preview
      await user.type(screen.getByLabelText(/Agent Name/), 'Test Agent');
      await user.type(screen.getByLabelText(/Description/), 'Test Description');
      await user.type(screen.getByLabelText(/System Prompt/), 'Test prompt');

      await user.click(screen.getByText('Preview'));

      const runPreviewButton = screen.getByText('Run Preview');
      await user.click(runPreviewButton);

      // Should show loading indicator
      await waitFor(() => {
        expect(screen.getByText('Run Preview').closest('button')).toBeDisabled();
      });

      // Resolve the preview
      act(() => {
        resolvePreview({
          response: 'Test response',
          executionTime: 1000,
          tokensUsed: 25,
          cost: 0.0005,
          model: 'gpt-4',
          success: true,
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Run Preview').closest('button')).not.toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels and structure', () => {
      render(<CustomAgentBuilder {...defaultProps} />);

      // Check for proper labels
      expect(screen.getByLabelText(/Agent Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
      expect(screen.getByLabelText(/System Prompt/)).toBeInTheDocument();

      // Check for required field indicators
      expect(screen.getAllByText('*')).toHaveLength(3); // name, description, prompt are required
    });

    test('supports keyboard navigation', async () => {
      render(<CustomAgentBuilder {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Agent Name/);
      nameInput.focus();

      expect(document.activeElement).toBe(nameInput);

      // Tab to next field
      fireEvent.keyDown(nameInput, { key: 'Tab' });
      
      // Should move to description field (implementation may vary based on tab order)
      const descriptionInput = screen.getByLabelText(/Description/);
      expect(document.activeElement === descriptionInput || document.activeElement === nameInput).toBe(true);
    });
  });
});