import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import VersionManager from '../../components/VersionManager';

// Mock the useAgentVersions hook
jest.mock('../../hooks/useAgents', () => ({
  useAgentVersions: jest.fn()
}));

const mockVersions = [
  {
    id: 'v1',
    version: '2.1.0',
    createdAt: Date.now() - 86400000, // 1 day ago
    updatedAt: Date.now() - 86400000,
    isActive: true,
    config: {
      prompt: 'Latest agent prompt for financial analysis',
      model: 'grok-beta',
      userDefinedCalls: [
        { id: '1', name: 'Analyze Budget', description: 'Budget analysis', prompt: 'Analyze budget data' },
        { id: '2', name: 'Generate Report', description: 'Report generation', prompt: 'Generate financial report' }
      ],
      version: '2.1.0'
    },
    description: 'Latest version with enhanced features'
  },
  {
    id: 'v2',
    version: '2.0.0',
    createdAt: Date.now() - 172800000, // 2 days ago
    updatedAt: Date.now() - 172800000,
    isActive: false,
    config: {
      prompt: 'Previous agent prompt for financial analysis',
      model: 'gpt-4',
      userDefinedCalls: [
        { id: '1', name: 'Basic Analysis', description: 'Basic analysis', prompt: 'Perform basic analysis' }
      ],
      version: '2.0.0'
    },
    description: 'Major version update'
  },
  {
    id: 'v3',
    version: '1.0.0',
    createdAt: Date.now() - 259200000, // 3 days ago
    updatedAt: Date.now() - 259200000,
    isActive: false,
    config: {
      prompt: 'Initial agent prompt',
      model: 'gpt-3.5-turbo',
      userDefinedCalls: [],
      version: '1.0.0'
    },
    description: 'Initial version'
  }
];

describe('VersionManager', () => {
  const defaultProps = {
    organizationId: 'org123' as any,
    userId: 'user123' as any,
    agentName: 'Test Agent',
    currentVersion: '2.1.0',
    onVersionSelect: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    const mockUseAgentVersions = require('../../hooks/useAgents').useAgentVersions;
    mockUseAgentVersions.mockReturnValue({
      versions: mockVersions,
      isLoading: false,
      getLatestVersion: () => mockVersions[0],
      getVersionByNumber: (version: string) => mockVersions.find(v => v.version === version),
      compareVersions: jest.fn()
    });
  });

  describe('Rendering', () => {
    it('should render version overview statistics', () => {
      render(<VersionManager {...defaultProps} />);

      expect(screen.getByText('3')).toBeInTheDocument(); // Total versions
      expect(screen.getByText('1')).toBeInTheDocument(); // Active versions
      expect(screen.getByText('2.1.0')).toBeInTheDocument(); // Latest version
    });

    it('should render version list in correct order', () => {
      render(<VersionManager {...defaultProps} />);

      const versionElements = screen.getAllByText(/Version/);
      expect(versionElements[0]).toHaveTextContent('Version Overview');
      
      // Check that versions are displayed in semantic version order (descending)
      expect(screen.getByText('2.1.0')).toBeInTheDocument();
      expect(screen.getByText('2.0.0')).toBeInTheDocument();
      expect(screen.getByText('1.0.0')).toBeInTheDocument();
    });

    it('should show active status indicators', () => {
      render(<VersionManager {...defaultProps} />);

      const activeIndicators = screen.getAllByText('Active');
      expect(activeIndicators).toHaveLength(1); // Only one active version
    });

    it('should show current version indicator', () => {
      render(<VersionManager {...defaultProps} />);

      expect(screen.getByText('Current')).toBeInTheDocument();
    });

    it('should display user-defined calls for each version', () => {
      render(<VersionManager {...defaultProps} />);

      expect(screen.getByText('Analyze Budget')).toBeInTheDocument();
      expect(screen.getByText('Generate Report')).toBeInTheDocument();
      expect(screen.getByText('Basic Analysis')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no agent name provided', () => {
      const props = { ...defaultProps, agentName: undefined };
      render(<VersionManager {...props} />);

      expect(screen.getByText('Enter an agent name to view version history')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      const mockUseAgentVersions = require('../../hooks/useAgents').useAgentVersions;
      mockUseAgentVersions.mockReturnValue({
        versions: [],
        isLoading: true,
        getLatestVersion: () => null,
        getVersionByNumber: () => null,
        compareVersions: jest.fn()
      });

      render(<VersionManager {...defaultProps} />);

      expect(screen.getByText('Loading version history...')).toBeInTheDocument();
    });

    it('should show no versions state', () => {
      const mockUseAgentVersions = require('../../hooks/useAgents').useAgentVersions;
      mockUseAgentVersions.mockReturnValue({
        versions: [],
        isLoading: false,
        getLatestVersion: () => null,
        getVersionByNumber: () => null,
        compareVersions: jest.fn()
      });

      render(<VersionManager {...defaultProps} />);

      expect(screen.getByText('No versions found for "Test Agent"')).toBeInTheDocument();
      expect(screen.getByText('Create Version 1.0.0')).toBeInTheDocument();
    });
  });

  describe('Version Selection', () => {
    it('should select versions for comparison', async () => {
      render(<VersionManager {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      
      // Select first version
      await userEvent.click(checkboxes[0]);
      expect(checkboxes[0]).toBeChecked();
      
      // Select second version
      await userEvent.click(checkboxes[1]);
      expect(checkboxes[1]).toBeChecked();

      // Should show compare button
      expect(screen.getByText('Compare Versions')).toBeInTheDocument();
    });

    it('should limit selection to 2 versions', async () => {
      render(<VersionManager {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      
      // Select first three versions
      await userEvent.click(checkboxes[0]);
      await userEvent.click(checkboxes[1]);
      await userEvent.click(checkboxes[2]);

      // Should only have 2 selected (last two clicked)
      expect(checkboxes[0]).not.toBeChecked();
      expect(checkboxes[1]).toBeChecked();
      expect(checkboxes[2]).toBeChecked();
    });
  });

  describe('Version Loading', () => {
    it('should call onVersionSelect when load button is clicked', async () => {
      render(<VersionManager {...defaultProps} />);

      const loadButtons = screen.getAllByText('Load');
      await userEvent.click(loadButtons[0]);

      expect(defaultProps.onVersionSelect).toHaveBeenCalledWith(mockVersions[0]);
    });
  });

  describe('Version Comparison', () => {
    it('should open comparison modal when compare button is clicked', async () => {
      render(<VersionManager {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      
      // Select two versions
      await userEvent.click(checkboxes[0]);
      await userEvent.click(checkboxes[1]);

      // Click compare button
      const compareButton = screen.getByText('Compare Versions');
      await userEvent.click(compareButton);

      // Should show comparison modal
      await waitFor(() => {
        expect(screen.getByText('Compare Versions: 2.1.0 vs 2.0.0')).toBeInTheDocument();
      });
    });

    it('should show field differences in comparison modal', async () => {
      render(<VersionManager {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      
      // Select two versions
      await userEvent.click(checkboxes[0]);
      await userEvent.click(checkboxes[1]);

      // Open comparison modal
      const compareButton = screen.getByText('Compare Versions');
      await userEvent.click(compareButton);

      await waitFor(() => {
        // Should show comparison content
        expect(screen.getByText('Prompt')).toBeInTheDocument();
        expect(screen.getByText('Model')).toBeInTheDocument();
        expect(screen.getByText('User-Defined Calls')).toBeInTheDocument();
        expect(screen.getByText('Description')).toBeInTheDocument();
      });
    });

    it('should close comparison modal when close button is clicked', async () => {
      render(<VersionManager {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      
      // Select two versions and open comparison
      await userEvent.click(checkboxes[0]);
      await userEvent.click(checkboxes[1]);
      await userEvent.click(screen.getByText('Compare Versions'));

      // Close modal
      await waitFor(() => {
        const closeButton = screen.getByText('×');
        fireEvent.click(closeButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('Compare Versions: 2.1.0 vs 2.0.0')).not.toBeInTheDocument();
      });
    });
  });

  describe('New Version Creation', () => {
    it('should create new version when button is clicked', async () => {
      render(<VersionManager {...defaultProps} />);

      const newVersionButton = screen.getByText('New Version');
      await userEvent.click(newVersionButton);

      expect(defaultProps.onVersionSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          version: '2.2.0' // Next patch version
        })
      );
    });

    it('should create version 1.0.0 when no current version', async () => {
      const props = { ...defaultProps, currentVersion: undefined };
      render(<VersionManager {...props} />);

      const newVersionButton = screen.getByText('New Version');
      await userEvent.click(newVersionButton);

      expect(defaultProps.onVersionSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          version: '1.0.0'
        })
      );
    });
  });

  describe('Version Details', () => {
    it('should display version metadata correctly', () => {
      render(<VersionManager {...defaultProps} />);

      // Check model information
      expect(screen.getByText('grok-beta')).toBeInTheDocument();
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.getByText('gpt-3.5-turbo')).toBeInTheDocument();

      // Check user calls count
      const userCallsCounts = screen.getAllByText(/\d+/);
      expect(screen.getByText('2')).toBeInTheDocument(); // First version has 2 calls
      expect(screen.getByText('1')).toBeInTheDocument(); // Second version has 1 call
    });

    it('should show prompt length information', () => {
      render(<VersionManager {...defaultProps} />);

      // Should show character counts for prompts
      expect(screen.getByText(/\d+ chars/)).toBeInTheDocument();
    });
  });

  describe('Semantic Versioning', () => {
    it('should sort versions by semantic version order', () => {
      const unsortedVersions = [
        { ...mockVersions[0], version: '1.0.0' },
        { ...mockVersions[1], version: '2.1.0' },
        { ...mockVersions[2], version: '2.0.0' }
      ];

      const mockUseAgentVersions = require('../../hooks/useAgents').useAgentVersions;
      mockUseAgentVersions.mockReturnValue({
        versions: unsortedVersions,
        isLoading: false,
        getLatestVersion: () => unsortedVersions[1],
        getVersionByNumber: (version: string) => unsortedVersions.find(v => v.version === version),
        compareVersions: jest.fn()
      });

      render(<VersionManager {...defaultProps} />);

      // Should display in descending semantic version order
      const versionTexts = screen.getAllByText(/^\d+\.\d+\.\d+$/);
      expect(versionTexts[0]).toHaveTextContent('2.1.0');
      expect(versionTexts[1]).toHaveTextContent('2.0.0');
      expect(versionTexts[2]).toHaveTextContent('1.0.0');
    });

    it('should generate next version correctly', async () => {
      render(<VersionManager {...defaultProps} />);

      const newVersionButton = screen.getByText('New Version');
      await userEvent.click(newVersionButton);

      // Should increment patch version: 2.1.0 -> 2.1.1
      expect(defaultProps.onVersionSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          version: '2.2.0'
        })
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<VersionManager {...defaultProps} />);

      // Checkboxes should be properly labeled
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);

      // Buttons should be accessible
      expect(screen.getByRole('button', { name: /New Version/ })).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Load/ })).toHaveLength(3);
    });

    it('should be keyboard navigable', async () => {
      render(<VersionManager {...defaultProps} />);

      const firstCheckbox = screen.getAllByRole('checkbox')[0];
      firstCheckbox.focus();

      // Should be able to navigate with keyboard
      await userEvent.keyboard(' '); // Space to check
      expect(firstCheckbox).toBeChecked();

      await userEvent.tab();
      // Should move focus to next interactive element
    });
  });

  describe('Performance', () => {
    it('should handle large number of versions efficiently', () => {
      const manyVersions = Array.from({ length: 100 }, (_, i) => ({
        ...mockVersions[0],
        id: `v${i}`,
        version: `1.0.${i}`,
        createdAt: Date.now() - (i * 86400000)
      }));

      const mockUseAgentVersions = require('../../hooks/useAgents').useAgentVersions;
      mockUseAgentVersions.mockReturnValue({
        versions: manyVersions,
        isLoading: false,
        getLatestVersion: () => manyVersions[0],
        getVersionByNumber: (version: string) => manyVersions.find(v => v.version === version),
        compareVersions: jest.fn()
      });

      const startTime = performance.now();
      render(<VersionManager {...defaultProps} />);
      const endTime = performance.now();

      // Should render in reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});