import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { IntacctPreferences } from '../../components/intacct-preferences';
import type { IntacctPreferencesProps, IntacctPreferences as IIntacctPreferences } from '../../components/intacct-preferences';

// Mock Convex client
const mockConvex = new ConvexReactClient('https://test.convex.cloud');

// Mock the hooks
jest.mock('../../hooks/useIntacctPreferences', () => ({
  useIntacctPreferences: jest.fn(() => ({
    preferences: null,
    isLoading: false,
    isError: false,
    error: null,
    savePreferences: jest.fn(),
    deletePreferences: jest.fn(),
    resetToDefaults: jest.fn(),
    refetch: jest.fn(),
  })),
}));

jest.mock('../../hooks/useGrokSuggestions', () => ({
  useGrokSuggestions: jest.fn(() => ({
    suggestions: [],
    isLoading: false,
    isError: false,
    error: null,
    lastUpdated: null,
    overallScore: 0,
    confidenceLevel: 0,
    generalRecommendations: [],
    generateSuggestions: jest.fn(),
    dismissSuggestion: jest.fn(),
    applySuggestion: jest.fn(),
    submitFeedback: jest.fn(),
    clearSuggestions: jest.fn(),
    retry: jest.fn(),
  })),
  useOptimizationTips: jest.fn(() => ({
    tips: [],
    isLoading: false,
    error: null,
    getTips: jest.fn(),
  })),
}));

const defaultProps: IntacctPreferencesProps = {
  userId: 'test-user-id' as any,
  organizationId: 'test-org-id' as any,
  useConvex: false, // Use local mode for testing
};

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <ConvexProvider client={mockConvex}>
      {component}
    </ConvexProvider>
  );
};

describe('IntacctPreferences Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the component with header and tabs', () => {
      renderWithProvider(<IntacctPreferences {...defaultProps} />);
      
      expect(screen.getByText('Intacct Preferences')).toBeInTheDocument();
      expect(screen.getByText('Customize your Sage Intacct experience with personalized settings and AI-powered features')).toBeInTheDocument();
      
      // Check all tabs are present
      expect(screen.getByText('General')).toBeInTheDocument();
      expect(screen.getByText('UI Customization')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Productivity')).toBeInTheDocument();
      expect(screen.getByText('AI Features')).toBeInTheDocument();
    });

    it('starts with General tab active by default', () => {
      renderWithProvider(<IntacctPreferences {...defaultProps} />);
      
      const generalTab = screen.getByRole('button', { name: /general/i });
      expect(generalTab).toHaveClass('text-blue-600');
      expect(generalTab).toHaveClass('border-blue-500');
    });

    it('displays save and reset buttons', () => {
      renderWithProvider(<IntacctPreferences {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('switches between tabs correctly', async () => {
      renderWithProvider(<IntacctPreferences {...defaultProps} />);
      
      // Start on General tab
      expect(screen.getByText('User Information')).toBeInTheDocument();
      
      // Switch to UI Customization tab
      await user.click(screen.getByRole('button', { name: /ui customization/i }));
      expect(screen.getByText('Theme Settings')).toBeInTheDocument();
      
      // Switch to Dashboard tab
      await user.click(screen.getByRole('button', { name: /dashboard/i }));
      expect(screen.getByText('Dashboard Widgets')).toBeInTheDocument();
      
      // Switch to Productivity tab
      await user.click(screen.getByRole('button', { name: /productivity/i }));
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
      
      // Switch to AI Features tab
      await user.click(screen.getByRole('button', { name: /ai features/i }));
      expect(screen.getByText('Grok AI Integration')).toBeInTheDocument();
    });

    it('updates active tab styling correctly', async () => {
      renderWithProvider(<IntacctPreferences {...defaultProps} />);
      
      const generalTab = screen.getByRole('button', { name: /general/i });
      const uiTab = screen.getByRole('button', { name: /ui customization/i });
      
      // General tab starts active
      expect(generalTab).toHaveClass('text-blue-600');
      expect(uiTab).toHaveClass('text-gray-500');
      
      // Click UI tab
      await user.click(uiTab);
      
      // UI tab becomes active
      expect(uiTab).toHaveClass('text-blue-600');
      expect(generalTab).toHaveClass('text-gray-500');
    });
  });

  describe('General Tab', () => {
    it('displays user information correctly', () => {
      const props = {
        ...defaultProps,
        userId: 'user-123' as any,
        organizationId: 'org-456' as any,
        userRole: { id: 'admin', name: 'Administrator', permissions: ['read', 'write', 'admin'] },
      };
      
      renderWithProvider(<IntacctPreferences {...props} />);
      
      expect(screen.getByText('user-123')).toBeInTheDocument();
      expect(screen.getByText('org-456')).toBeInTheDocument();
      expect(screen.getByText('Administrator')).toBeInTheDocument();
    });

    it('displays notification preference toggles', () => {
      renderWithProvider(<IntacctPreferences {...defaultProps} />);
      
      // Check for notification settings
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('SMS')).toBeInTheDocument();
      expect(screen.getByText('In-App')).toBeInTheDocument();
      expect(screen.getByText('Desktop')).toBeInTheDocument();
      
      // All should have toggle buttons
      const toggles = screen.getAllByRole('button');
      const notificationToggles = toggles.filter(button => 
        button.className.includes('rounded-full') && button.className.includes('flex-shrink-0')
      );
      expect(notificationToggles.length).toBeGreaterThanOrEqual(4);
    });

    it('toggles notification settings correctly', async () => {
      const mockOnChange = jest.fn();
      renderWithProvider(
        <IntacctPreferences 
          {...defaultProps} 
          onPreferencesChange={mockOnChange}
        />
      );
      
      // Find email notification toggle (first toggle in the notification section)
      const toggles = screen.getAllByRole('button');
      const emailToggle = toggles.find(button => 
        button.className.includes('rounded-full') && 
        button.className.includes('flex-shrink-0')
      );
      
      if (emailToggle) {
        await user.click(emailToggle);
        
        // Should trigger preferences change
        await waitFor(() => {
          expect(mockOnChange).toHaveBeenCalled();
        });
      }
    });
  });

  describe('UI Customization Tab', () => {
    beforeEach(async () => {
      renderWithProvider(<IntacctPreferences {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: /ui customization/i }));
    });

    it('displays theme selection options', () => {
      expect(screen.getByText('Theme Settings')).toBeInTheDocument();
      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('Auto')).toBeInTheDocument();
    });

    it('displays display options toggles', () => {
      expect(screen.getByText('Display Options')).toBeInTheDocument();
      expect(screen.getByText('Compact Mode')).toBeInTheDocument();
      expect(screen.getByText('Collapsed Sidebar')).toBeInTheDocument();
      expect(screen.getByText('Show Grid Lines')).toBeInTheDocument();
      expect(screen.getByText('High Contrast')).toBeInTheDocument();
    });

    it('displays font size options', () => {
      expect(screen.getByText('Font Size')).toBeInTheDocument();
      expect(screen.getByText('Small')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Large')).toBeInTheDocument();
    });

    it('displays color picker for primary color', () => {
      expect(screen.getByText('Primary Color')).toBeInTheDocument();
      const colorInput = screen.getByDisplayValue('#3B82F6');
      expect(colorInput).toBeInTheDocument();
      expect(colorInput).toHaveAttribute('type', 'color');
    });

    it('allows theme selection', async () => {
      const darkThemeButton = screen.getByRole('button', { name: /dark/i });
      await user.click(darkThemeButton);
      
      // Should show dark theme as selected (blue styling)
      expect(darkThemeButton).toHaveClass('border-blue-500');
      expect(darkThemeButton).toHaveClass('bg-blue-50');
    });
  });

  describe('Dashboard Tab', () => {
    beforeEach(async () => {
      renderWithProvider(<IntacctPreferences {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: /dashboard/i }));
    });

    it('displays dashboard widgets section', () => {
      expect(screen.getByText('Dashboard Widgets')).toBeInTheDocument();
    });

    it('displays all widget configuration options', () => {
      // Check for widget names (transformed from camelCase)
      expect(screen.getByText('Cash Flow')).toBeInTheDocument();
      expect(screen.getByText('Revenue Chart')).toBeInTheDocument();
      expect(screen.getByText('Expense Summary')).toBeInTheDocument();
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
      expect(screen.getByText('Alerts')).toBeInTheDocument();
    });

    it('shows widget configuration when enabled', async () => {
      // Find and click a widget toggle to enable it
      const toggles = screen.getAllByRole('button');
      const widgetToggle = toggles.find(button => 
        button.className.includes('rounded-full') && 
        button.className.includes('flex-shrink-0')
      );
      
      if (widgetToggle && widgetToggle.className.includes('bg-blue-600')) {
        // Widget is enabled, should show Position and Size inputs
        expect(screen.getByDisplayValue('0')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Large')).toBeInTheDocument();
      }
    });
  });

  describe('Productivity Tab', () => {
    beforeEach(async () => {
      renderWithProvider(<IntacctPreferences {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: /productivity/i }));
    });

    it('displays keyboard shortcuts section', () => {
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+N')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+F')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+Z')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+Y')).toBeInTheDocument();
    });

    it('displays automation settings', () => {
      expect(screen.getByText('Automation Settings')).toBeInTheDocument();
      expect(screen.getByText('Auto Save')).toBeInTheDocument();
      expect(screen.getByText('Bulk Operations')).toBeInTheDocument();
      expect(screen.getByText('Quick Filters')).toBeInTheDocument();
      expect(screen.getByText('Smart Suggestions')).toBeInTheDocument();
      expect(screen.getByText('Template Library')).toBeInTheDocument();
    });

    it('shows auto save interval when auto save is enabled', () => {
      // Should show auto save interval input since auto save is enabled by default
      expect(screen.getByText('Auto Save Interval (seconds)')).toBeInTheDocument();
      expect(screen.getByDisplayValue('300')).toBeInTheDocument();
    });

    it('validates auto save interval', async () => {
      const intervalInput = screen.getByDisplayValue('300');
      
      // Clear and enter invalid value
      await user.clear(intervalInput);
      await user.type(intervalInput, '30');
      
      // Try to save - should show validation error
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Auto-save interval must be at least 60 seconds')).toBeInTheDocument();
      });
    });
  });

  describe('AI Features Tab', () => {
    beforeEach(async () => {
      renderWithProvider(<IntacctPreferences {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: /ai features/i }));
    });

    it('displays Grok AI integration section', () => {
      expect(screen.getByText('Grok AI Integration')).toBeInTheDocument();
      expect(screen.getByText('AI-Powered Suggestions')).toBeInTheDocument();
      expect(screen.getByText('Enable Grok AI')).toBeInTheDocument();
    });

    it('shows AI features when Grok AI is enabled', async () => {
      // Find and enable Grok AI toggle
      const grokToggle = screen.getByRole('button', { 
        name: /enable grok ai/i 
      }).closest('div')?.querySelector('button[class*="rounded-full"]');
      
      if (grokToggle) {
        await user.click(grokToggle);
        
        // Should show AI features section
        await waitFor(() => {
          expect(screen.getByText('AI Features Active')).toBeInTheDocument();
        });
      }
    });
  });

  describe('State Management', () => {
    it('tracks unsaved changes correctly', async () => {
      renderWithProvider(<IntacctPreferences {...defaultProps} />);
      
      // Make a change
      const toggles = screen.getAllByRole('button');
      const notificationToggle = toggles.find(button => 
        button.className.includes('rounded-full') && 
        button.className.includes('flex-shrink-0')
      );
      
      if (notificationToggle) {
        await user.click(notificationToggle);
        
        // Should show unsaved changes indicator
        await waitFor(() => {
          expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
        });
      }
    });

    it('enables save button when there are unsaved changes', async () => {
      renderWithProvider(<IntacctPreferences {...defaultProps} />);
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      
      // Initially disabled
      expect(saveButton).toBeDisabled();
      
      // Make a change
      const toggles = screen.getAllByRole('button');
      const toggle = toggles.find(button => 
        button.className.includes('rounded-full') && 
        button.className.includes('flex-shrink-0')
      );
      
      if (toggle) {
        await user.click(toggle);
        
        // Save button should be enabled
        await waitFor(() => {
          expect(saveButton).not.toBeDisabled();
        });
      }
    });

    it('calls onPreferencesChange when preferences update', async () => {
      const mockOnChange = jest.fn();
      renderWithProvider(
        <IntacctPreferences 
          {...defaultProps} 
          onPreferencesChange={mockOnChange}
        />
      );
      
      // Make a change
      const toggles = screen.getAllByRole('button');
      const toggle = toggles.find(button => 
        button.className.includes('rounded-full') && 
        button.className.includes('flex-shrink-0')
      );
      
      if (toggle) {
        await user.click(toggle);
        
        await waitFor(() => {
          expect(mockOnChange).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Save and Reset Functionality', () => {
    it('calls onSave when save button is clicked', async () => {
      const mockOnSave = jest.fn().mockResolvedValue(undefined);
      renderWithProvider(
        <IntacctPreferences 
          {...defaultProps} 
          onSave={mockOnSave}
        />
      );
      
      // Make a change to enable save button
      const toggles = screen.getAllByRole('button');
      const toggle = toggles.find(button => 
        button.className.includes('rounded-full') && 
        button.className.includes('flex-shrink-0')
      );
      
      if (toggle) {
        await user.click(toggle);
        
        // Click save
        const saveButton = screen.getByRole('button', { name: /save changes/i });
        await user.click(saveButton);
        
        await waitFor(() => {
          expect(mockOnSave).toHaveBeenCalled();
        });
      }
    });

    it('shows loading state while saving', async () => {
      const mockOnSave = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      renderWithProvider(
        <IntacctPreferences 
          {...defaultProps} 
          onSave={mockOnSave}
        />
      );
      
      // Make a change
      const toggles = screen.getAllByRole('button');
      const toggle = toggles.find(button => 
        button.className.includes('rounded-full') && 
        button.className.includes('flex-shrink-0')
      );
      
      if (toggle) {
        await user.click(toggle);
        
        const saveButton = screen.getByRole('button', { name: /save changes/i });
        await user.click(saveButton);
        
        // Should show loading state
        expect(screen.getByText('Saving...')).toBeInTheDocument();
        
        // Wait for save to complete
        await waitFor(() => {
          expect(screen.getByText('Save Changes')).toBeInTheDocument();
        });
      }
    });

    it('shows success message after successful save', async () => {
      const mockOnSave = jest.fn().mockResolvedValue(undefined);
      renderWithProvider(
        <IntacctPreferences 
          {...defaultProps} 
          onSave={mockOnSave}
        />
      );
      
      // Make a change and save
      const toggles = screen.getAllByRole('button');
      const toggle = toggles.find(button => 
        button.className.includes('rounded-full') && 
        button.className.includes('flex-shrink-0')
      );
      
      if (toggle) {
        await user.click(toggle);
        
        const saveButton = screen.getByRole('button', { name: /save changes/i });
        await user.click(saveButton);
        
        await waitFor(() => {
          expect(screen.getByText('Saved')).toBeInTheDocument();
        });
      }
    });

    it('resets preferences to defaults when reset is clicked', async () => {
      renderWithProvider(<IntacctPreferences {...defaultProps} />);
      
      // Make some changes
      await user.click(screen.getByRole('button', { name: /ui customization/i }));
      const darkButton = screen.getByRole('button', { name: /dark/i });
      await user.click(darkButton);
      
      // Click reset
      const resetButton = screen.getByRole('button', { name: /reset/i });
      await user.click(resetButton);
      
      // Should reset to defaults
      await waitFor(() => {
        expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
      });
    });
  });

  describe('Read-Only Mode', () => {
    it('disables all controls when readOnly is true', () => {
      renderWithProvider(<IntacctPreferences {...defaultProps} readOnly={true} />);
      
      // All buttons should be disabled except tabs
      const buttons = screen.getAllByRole('button');
      const toggles = buttons.filter(button => 
        button.className.includes('rounded-full') || 
        button.textContent?.includes('Save') || 
        button.textContent?.includes('Reset')
      );
      
      toggles.forEach(button => {
        if (!button.textContent?.includes('General') && 
            !button.textContent?.includes('UI') && 
            !button.textContent?.includes('Dashboard') && 
            !button.textContent?.includes('Productivity') && 
            !button.textContent?.includes('AI')) {
          expect(button).toBeDisabled();
        }
      });
    });

    it('shows opacity styling for disabled controls', () => {
      renderWithProvider(<IntacctPreferences {...defaultProps} readOnly={true} />);
      
      const toggles = screen.getAllByRole('button').filter(button => 
        button.className.includes('rounded-full')
      );
      
      toggles.forEach(toggle => {
        expect(toggle).toHaveClass('opacity-50');
        expect(toggle).toHaveClass('cursor-not-allowed');
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when save fails', async () => {
      const mockOnSave = jest.fn().mockRejectedValue(new Error('Network error'));
      renderWithProvider(
        <IntacctPreferences 
          {...defaultProps} 
          onSave={mockOnSave}
        />
      );
      
      // Make a change and try to save
      const toggles = screen.getAllByRole('button');
      const toggle = toggles.find(button => 
        button.className.includes('rounded-full') && 
        button.className.includes('flex-shrink-0')
      );
      
      if (toggle) {
        await user.click(toggle);
        
        const saveButton = screen.getByRole('button', { name: /save changes/i });
        await user.click(saveButton);
        
        await waitFor(() => {
          expect(screen.getByText('Network error')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithProvider(<IntacctPreferences {...defaultProps} />);
      
      // Tab navigation should have proper ARIA
      const tablist = screen.getByRole('navigation', { name: /tabs/i });
      expect(tablist).toBeInTheDocument();
      
      // Buttons should be keyboard accessible
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      buttons.forEach(button => {
        expect(button).toBeVisible();
      });
    });

    it('supports keyboard navigation', async () => {
      renderWithProvider(<IntacctPreferences {...defaultProps} />);
      
      // Tab should work for navigation
      const firstTab = screen.getByRole('button', { name: /general/i });
      firstTab.focus();
      
      await user.keyboard('{ArrowRight}');
      
      // Should move to next tab
      const uiTab = screen.getByRole('button', { name: /ui customization/i });
      expect(uiTab).toHaveFocus();
    });
  });

  describe('Initial Preferences', () => {
    it('applies initial preferences correctly', () => {
      const initialPrefs: Partial<IIntacctPreferences> = {
        uiCustomizations: {
          theme: 'dark',
          compactMode: true,
          sidebarCollapsed: false,
          showGridLines: false,
          highContrast: true,
          fontSize: 'large',
          primaryColor: '#FF0000',
        },
        grokAIEnabled: true,
      };
      
      renderWithProvider(
        <IntacctPreferences 
          {...defaultProps} 
          initialPreferences={initialPrefs}
        />
      );
      
      // Switch to UI tab
      fireEvent.click(screen.getByRole('button', { name: /ui customization/i }));
      
      // Should show dark theme selected
      const darkButton = screen.getByRole('button', { name: /dark/i });
      expect(darkButton).toHaveClass('border-blue-500');
      
      // Should show large font selected
      const largeButton = screen.getByRole('button', { name: /large/i });
      expect(largeButton).toHaveClass('border-blue-500');
    });
  });
});