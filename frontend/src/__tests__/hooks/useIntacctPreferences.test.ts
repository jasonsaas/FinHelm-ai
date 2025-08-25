import { renderHook, act } from '@testing-library/react';
import { useIntacctPreferences } from '../../hooks/useIntacctPreferences';
import type { IntacctPreferences } from '../../components/intacct-preferences';

// Mock Convex
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));

const { useQuery, useMutation } = require('convex/react');

describe('useIntacctPreferences', () => {
  const mockSavePreferences = jest.fn();
  const mockDeletePreferences = jest.fn();
  const mockGetDefaultPreferences = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    useQuery.mockReturnValue(null);
    useMutation.mockImplementation((action: string) => {
      if (action.includes('save')) return mockSavePreferences;
      if (action.includes('delete')) return mockDeletePreferences;
      if (action.includes('getDefault')) return mockGetDefaultPreferences;
      return jest.fn();
    });
  });

  describe('Basic functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => 
        useIntacctPreferences({ userId: 'user1' as any, organizationId: 'org1' as any })
      );

      expect(result.current.preferences).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should show loading state', () => {
      useQuery.mockReturnValue(undefined); // Convex loading state

      const { result } = renderHook(() => 
        useIntacctPreferences({ userId: 'user1' as any, organizationId: 'org1' as any })
      );

      expect(result.current.isLoading).toBe(true);
    });

    it('should convert Convex document to IntacctPreferences format', () => {
      const mockConvexDoc = {
        _id: 'pref123',
        userId: 'user1',
        organizationId: 'org1',
        userRole: { id: 'user', name: 'User', permissions: ['read', 'write'] },
        notifications: { email: true, sms: false, inApp: true, desktop: true },
        uiCustomizations: {
          theme: 'dark',
          compactMode: true,
          sidebarCollapsed: false,
          showGridLines: true,
          highContrast: false,
          fontSize: 'medium',
          primaryColor: '#3B82F6',
        },
        dashboardWidgets: {
          cashFlow: { enabled: true, position: 0, size: 'large' },
          revenueChart: { enabled: true, position: 1, size: 'large' },
          expenseSummary: { enabled: true, position: 2, size: 'medium' },
          quickActions: { enabled: true, position: 3, size: 'small' },
          recentTransactions: { enabled: true, position: 4, size: 'medium' },
          alerts: { enabled: true, position: 5, size: 'small' },
        },
        productivityTools: {
          keyboardShortcuts: {
            'Ctrl+S': true,
            'Ctrl+N': true,
            'Ctrl+F': true,
            'Ctrl+Z': true,
            'Ctrl+Y': true,
          },
          autoSave: true,
          autoSaveInterval: 300,
          bulkOperations: true,
          quickFilters: true,
          smartSuggestions: true,
          templateLibrary: true,
        },
        grokAIEnabled: true,
        lastUpdated: 1234567890,
        _creationTime: 1234567890,
      };

      useQuery.mockReturnValue(mockConvexDoc);

      const { result } = renderHook(() => 
        useIntacctPreferences({ userId: 'user1' as any, organizationId: 'org1' as any })
      );

      expect(result.current.preferences).toBeDefined();
      expect(result.current.preferences?.id).toBe('pref123');
      expect(result.current.preferences?.userId).toBe('user1');
      expect(result.current.preferences?.uiCustomizations.theme).toBe('dark');
      expect(result.current.preferences?.grokAIEnabled).toBe(true);
    });
  });

  describe('Save functionality', () => {
    it('should save preferences successfully', async () => {
      mockSavePreferences.mockResolvedValue({});

      const { result } = renderHook(() => 
        useIntacctPreferences({ userId: 'user1' as any, organizationId: 'org1' as any })
      );

      const mockPreferences: IntacctPreferences = {
        userId: 'user1' as any,
        organizationId: 'org1' as any,
        userRole: { id: 'user', name: 'User', permissions: ['read', 'write'] },
        notifications: { email: true, sms: false, inApp: true, desktop: true },
        uiCustomizations: {
          theme: 'light',
          compactMode: false,
          sidebarCollapsed: false,
          showGridLines: true,
          highContrast: false,
          fontSize: 'medium',
          primaryColor: '#3B82F6',
        },
        dashboardWidgets: {
          cashFlow: { enabled: true, position: 0, size: 'large' },
          revenueChart: { enabled: true, position: 1, size: 'large' },
          expenseSummary: { enabled: true, position: 2, size: 'medium' },
          quickActions: { enabled: true, position: 3, size: 'small' },
          recentTransactions: { enabled: true, position: 4, size: 'medium' },
          alerts: { enabled: true, position: 5, size: 'small' },
        },
        productivityTools: {
          keyboardShortcuts: {
            'Ctrl+S': true,
            'Ctrl+N': true,
            'Ctrl+F': true,
            'Ctrl+Z': true,
            'Ctrl+Y': true,
          },
          autoSave: true,
          autoSaveInterval: 300,
          bulkOperations: true,
          quickFilters: true,
          smartSuggestions: true,
          templateLibrary: true,
        },
        grokAIEnabled: false,
        lastUpdated: Date.now(),
      };

      await act(async () => {
        await result.current.savePreferences(mockPreferences);
      });

      expect(mockSavePreferences).toHaveBeenCalledWith({
        userId: 'user1',
        organizationId: 'org1',
        userRole: mockPreferences.userRole,
        notifications: mockPreferences.notifications,
        uiCustomizations: mockPreferences.uiCustomizations,
        dashboardWidgets: mockPreferences.dashboardWidgets,
        productivityTools: mockPreferences.productivityTools,
        grokAIEnabled: mockPreferences.grokAIEnabled,
      });
    });

    it('should handle save errors', async () => {
      const errorMessage = 'Save failed';
      mockSavePreferences.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => 
        useIntacctPreferences({ userId: 'user1' as any, organizationId: 'org1' as any })
      );

      const mockPreferences: IntacctPreferences = {
        userId: 'user1' as any,
        organizationId: 'org1' as any,
        userRole: { id: 'user', name: 'User', permissions: ['read', 'write'] },
        notifications: { email: true, sms: false, inApp: true, desktop: true },
        uiCustomizations: {
          theme: 'light',
          compactMode: false,
          sidebarCollapsed: false,
          showGridLines: true,
          highContrast: false,
          fontSize: 'medium',
          primaryColor: '#3B82F6',
        },
        dashboardWidgets: {
          cashFlow: { enabled: true, position: 0, size: 'large' },
          revenueChart: { enabled: true, position: 1, size: 'large' },
          expenseSummary: { enabled: true, position: 2, size: 'medium' },
          quickActions: { enabled: true, position: 3, size: 'small' },
          recentTransactions: { enabled: true, position: 4, size: 'medium' },
          alerts: { enabled: true, position: 5, size: 'small' },
        },
        productivityTools: {
          keyboardShortcuts: {
            'Ctrl+S': true,
            'Ctrl+N': true,
            'Ctrl+F': true,
            'Ctrl+Z': true,
            'Ctrl+Y': true,
          },
          autoSave: true,
          autoSaveInterval: 300,
          bulkOperations: true,
          quickFilters: true,
          smartSuggestions: true,
          templateLibrary: true,
        },
        grokAIEnabled: false,
        lastUpdated: Date.now(),
      };

      await expect(
        act(async () => {
          await result.current.savePreferences(mockPreferences);
        })
      ).rejects.toThrow(errorMessage);

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should throw error when userId or organizationId is missing', async () => {
      const { result } = renderHook(() => 
        useIntacctPreferences({}) // No userId or organizationId
      );

      const mockPreferences: IntacctPreferences = {
        userId: 'user1' as any,
        organizationId: 'org1' as any,
        userRole: { id: 'user', name: 'User', permissions: ['read', 'write'] },
        notifications: { email: true, sms: false, inApp: true, desktop: true },
        uiCustomizations: {
          theme: 'light',
          compactMode: false,
          sidebarCollapsed: false,
          showGridLines: true,
          highContrast: false,
          fontSize: 'medium',
          primaryColor: '#3B82F6',
        },
        dashboardWidgets: {
          cashFlow: { enabled: true, position: 0, size: 'large' },
          revenueChart: { enabled: true, position: 1, size: 'large' },
          expenseSummary: { enabled: true, position: 2, size: 'medium' },
          quickActions: { enabled: true, position: 3, size: 'small' },
          recentTransactions: { enabled: true, position: 4, size: 'medium' },
          alerts: { enabled: true, position: 5, size: 'small' },
        },
        productivityTools: {
          keyboardShortcuts: {
            'Ctrl+S': true,
            'Ctrl+N': true,
            'Ctrl+F': true,
            'Ctrl+Z': true,
            'Ctrl+Y': true,
          },
          autoSave: true,
          autoSaveInterval: 300,
          bulkOperations: true,
          quickFilters: true,
          smartSuggestions: true,
          templateLibrary: true,
        },
        grokAIEnabled: false,
        lastUpdated: Date.now(),
      };

      await expect(
        act(async () => {
          await result.current.savePreferences(mockPreferences);
        })
      ).rejects.toThrow('User ID and Organization ID are required');
    });
  });

  describe('Delete functionality', () => {
    it('should delete preferences successfully', async () => {
      mockDeletePreferences.mockResolvedValue({});

      const { result } = renderHook(() => 
        useIntacctPreferences({ userId: 'user1' as any, organizationId: 'org1' as any })
      );

      await act(async () => {
        await result.current.deletePreferences();
      });

      expect(mockDeletePreferences).toHaveBeenCalledWith({
        userId: 'user1',
        organizationId: 'org1',
      });
    });

    it('should handle delete errors', async () => {
      const errorMessage = 'Delete failed';
      mockDeletePreferences.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => 
        useIntacctPreferences({ userId: 'user1' as any, organizationId: 'org1' as any })
      );

      await expect(
        act(async () => {
          await result.current.deletePreferences();
        })
      ).rejects.toThrow(errorMessage);

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('Reset to defaults', () => {
    it('should reset to default preferences', async () => {
      const mockDefaults = {
        notifications: { email: true, sms: false, inApp: true, desktop: true },
        uiCustomizations: {
          theme: 'light',
          compactMode: false,
          sidebarCollapsed: false,
          showGridLines: true,
          highContrast: false,
          fontSize: 'medium',
          primaryColor: '#3B82F6',
        },
        dashboardWidgets: {
          cashFlow: { enabled: true, position: 0, size: 'large' },
          revenueChart: { enabled: true, position: 1, size: 'large' },
          expenseSummary: { enabled: true, position: 2, size: 'medium' },
          quickActions: { enabled: true, position: 3, size: 'small' },
          recentTransactions: { enabled: true, position: 4, size: 'medium' },
          alerts: { enabled: true, position: 5, size: 'small' },
        },
        productivityTools: {
          keyboardShortcuts: {
            'Ctrl+S': true,
            'Ctrl+N': true,
            'Ctrl+F': true,
            'Ctrl+Z': true,
            'Ctrl+Y': true,
          },
          autoSave: true,
          autoSaveInterval: 300,
          bulkOperations: true,
          quickFilters: true,
          smartSuggestions: true,
          templateLibrary: true,
        },
        grokAIEnabled: false,
      };

      mockGetDefaultPreferences.mockResolvedValue(mockDefaults);
      mockSavePreferences.mockResolvedValue({});

      const { result } = renderHook(() => 
        useIntacctPreferences({ userId: 'user1' as any, organizationId: 'org1' as any })
      );

      await act(async () => {
        await result.current.resetToDefaults('user');
      });

      expect(mockGetDefaultPreferences).toHaveBeenCalledWith({ roleName: 'user' });
      expect(mockSavePreferences).toHaveBeenCalled();
    });

    it('should handle reset errors', async () => {
      const errorMessage = 'Reset failed';
      mockGetDefaultPreferences.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => 
        useIntacctPreferences({ userId: 'user1' as any, organizationId: 'org1' as any })
      );

      await expect(
        act(async () => {
          await result.current.resetToDefaults('user');
        })
      ).rejects.toThrow(errorMessage);

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('Auto-load functionality', () => {
    it('should not auto-load when autoLoad is false', () => {
      const { result } = renderHook(() => 
        useIntacctPreferences({ 
          userId: 'user1' as any, 
          organizationId: 'org1' as any, 
          autoLoad: false 
        })
      );

      expect(useQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
    });

    it('should auto-load when userId and organizationId are provided', () => {
      const { result } = renderHook(() => 
        useIntacctPreferences({ 
          userId: 'user1' as any, 
          organizationId: 'org1' as any, 
          autoLoad: true 
        })
      );

      expect(useQuery).toHaveBeenCalledWith(
        expect.anything(),
        { userId: 'user1', organizationId: 'org1' }
      );
    });

    it('should skip loading when userId is missing', () => {
      const { result } = renderHook(() => 
        useIntacctPreferences({ 
          organizationId: 'org1' as any, 
          autoLoad: true 
        })
      );

      expect(useQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
    });
  });

  describe('Refetch functionality', () => {
    it('should reset error state when refetch is called', () => {
      mockSavePreferences.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => 
        useIntacctPreferences({ userId: 'user1' as any, organizationId: 'org1' as any })
      );

      // Set error state
      act(() => {
        result.current.savePreferences({} as IntacctPreferences).catch(() => {});
      });

      // Refetch should clear error
      act(() => {
        result.current.refetch();
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});