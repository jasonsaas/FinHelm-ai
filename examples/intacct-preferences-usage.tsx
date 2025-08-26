/**
 * IntacctPreferences Component Usage Examples
 * 
 * This file demonstrates various usage patterns for the IntacctPreferences component
 * in different scenarios and configurations.
 */

import React, { useState, useEffect } from 'react';
import { ConvexProvider, useConvexAuth } from 'convex/react';
import { IntacctPreferences } from '../frontend/src/components/intacct-preferences';
import type { 
  IntacctPreferences as IIntacctPreferences,
  IntacctPreferencesProps 
} from '../frontend/src/components/intacct-preferences';

// Example 1: Basic Usage with Convex Integration
export function BasicPreferencesExample() {
  const { isAuthenticated, userId } = useConvexAuth();
  const [organizationId, setOrganizationId] = useState<string>('org-123');

  if (!isAuthenticated || !userId) {
    return <div className="p-4 text-center">Please log in to access preferences</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Intacct Preferences</h1>
        <IntacctPreferences
          userId={userId}
          organizationId={organizationId as any}
          useConvex={true}
          className="shadow-lg"
        />
      </div>
    </div>
  );
}

// Example 2: Standalone Mode with Custom Backend
export function StandalonePreferencesExample() {
  const [preferences, setPreferences] = useState<IIntacctPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePreferencesChange = (newPreferences: IIntacctPreferences) => {
    console.log('Preferences changed:', newPreferences);
    setPreferences(newPreferences);
  };

  const handleSave = async (preferencesToSave: IIntacctPreferences) => {
    setIsLoading(true);
    try {
      // Custom API call to your backend
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(preferencesToSave),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Preferences saved successfully:', result);
      
      // Show success notification
      showNotification('Preferences saved successfully!', 'success');
      
    } catch (error) {
      console.error('Failed to save preferences:', error);
      showNotification('Failed to save preferences. Please try again.', 'error');
      throw error; // Re-throw to let component handle error state
    } finally {
      setIsLoading(false);
    }
  };

  const initialPrefs: Partial<IIntacctPreferences> = {
    uiCustomizations: {
      theme: 'light',
      compactMode: false,
      sidebarCollapsed: false,
      showGridLines: true,
      highContrast: false,
      fontSize: 'medium',
      primaryColor: '#3B82F6',
    },
    grokAIEnabled: false,
    notifications: {
      email: true,
      sms: false,
      inApp: true,
      desktop: true,
    }
  };

  return (
    <div className="container mx-auto py-8">
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Saving preferences...</p>
          </div>
        </div>
      )}
      
      <IntacctPreferences
        userId="user-456" as any
        organizationId="org-789" as any
        useConvex={false}
        initialPreferences={initialPrefs}
        onPreferencesChange={handlePreferencesChange}
        onSave={handleSave}
      />
    </div>
  );
}

// Example 3: Role-Based Configuration
export function RoleBasedPreferencesExample() {
  const [userRole, setUserRole] = useState<'admin' | 'user' | 'viewer'>('user');
  const [organizationId] = useState<string>('org-456');

  const getRoleConfiguration = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          id: 'admin',
          name: 'Administrator',
          permissions: ['read', 'write', 'admin', 'delete', 'bulk_operations']
        };
      case 'viewer':
        return {
          id: 'viewer',
          name: 'Viewer',
          permissions: ['read']
        };
      default:
        return {
          id: 'user',
          name: 'User',
          permissions: ['read', 'write']
        };
    }
  };

  const getInitialPreferencesForRole = (role: string): Partial<IIntacctPreferences> => {
    const basePrefs: Partial<IIntacctPreferences> = {
      grokAIEnabled: false,
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
        bulkOperations: false,
        quickFilters: true,
        smartSuggestions: false,
        templateLibrary: true,
      }
    };

    if (role === 'admin') {
      return {
        ...basePrefs,
        grokAIEnabled: true,
        productivityTools: {
          ...basePrefs.productivityTools!,
          bulkOperations: true,
          smartSuggestions: true,
        }
      };
    }

    if (role === 'viewer') {
      return {
        ...basePrefs,
        productivityTools: {
          ...basePrefs.productivityTools!,
          bulkOperations: false,
          quickFilters: false,
        }
      };
    }

    return basePrefs;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8">
        {/* Role Selector */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Select User Role</h2>
          <div className="flex space-x-4">
            {['viewer', 'user', 'admin'].map((role) => (
              <button
                key={role}
                onClick={() => setUserRole(role as any)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  userRole === role
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-md">
            <h3 className="font-medium text-blue-900">Current Role: {userRole}</h3>
            <p className="text-sm text-blue-700 mt-1">
              Permissions: {getRoleConfiguration(userRole).permissions.join(', ')}
            </p>
          </div>
        </div>

        {/* Preferences Component */}
        <IntacctPreferences
          userId="demo-user" as any
          organizationId={organizationId as any}
          userRole={getRoleConfiguration(userRole)}
          initialPreferences={getInitialPreferencesForRole(userRole)}
          useConvex={false}
          onPreferencesChange={(prefs) => {
            console.log(`Preferences changed for ${userRole}:`, prefs);
          }}
        />
      </div>
    </div>
  );
}

// Example 4: Read-Only Mode for Review
export function ReadOnlyPreferencesExample() {
  const [selectedUser, setSelectedUser] = useState<string>('user-1');
  const [userPreferences, setUserPreferences] = useState<Partial<IIntacctPreferences>>({});

  const mockUsers = [
    { id: 'user-1', name: 'John Smith', role: 'Admin' },
    { id: 'user-2', name: 'Jane Doe', role: 'User' },
    { id: 'user-3', name: 'Bob Johnson', role: 'Viewer' },
  ];

  // Mock data for demonstration
  const mockPreferences: Record<string, Partial<IIntacctPreferences>> = {
    'user-1': {
      uiCustomizations: {
        theme: 'dark',
        compactMode: true,
        sidebarCollapsed: false,
        showGridLines: true,
        highContrast: false,
        fontSize: 'large',
        primaryColor: '#1E40AF',
      },
      grokAIEnabled: true,
      notifications: {
        email: true,
        sms: true,
        inApp: true,
        desktop: false,
      }
    },
    'user-2': {
      uiCustomizations: {
        theme: 'light',
        compactMode: false,
        sidebarCollapsed: true,
        showGridLines: false,
        highContrast: true,
        fontSize: 'medium',
        primaryColor: '#059669',
      },
      grokAIEnabled: false,
      notifications: {
        email: true,
        sms: false,
        inApp: true,
        desktop: true,
      }
    },
    'user-3': {
      uiCustomizations: {
        theme: 'auto',
        compactMode: false,
        sidebarCollapsed: false,
        showGridLines: true,
        highContrast: false,
        fontSize: 'small',
        primaryColor: '#DC2626',
      },
      grokAIEnabled: false,
      notifications: {
        email: false,
        sms: false,
        inApp: true,
        desktop: false,
      }
    },
  };

  useEffect(() => {
    setUserPreferences(mockPreferences[selectedUser] || {});
  }, [selectedUser]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8">
        {/* User Selector */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">View User Preferences</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user.id)}
                className={`p-4 text-left rounded-lg border-2 transition-colors ${
                  selectedUser === user.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <h3 className="font-medium text-gray-900">{user.name}</h3>
                <p className="text-sm text-gray-600">{user.role}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Read-Only Preferences */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-yellow-800">
              Read-Only Mode: You are viewing another user's preferences
            </span>
          </div>
        </div>

        <IntacctPreferences
          userId={selectedUser as any}
          organizationId="demo-org" as any
          initialPreferences={userPreferences}
          readOnly={true}
          useConvex={false}
        />
      </div>
    </div>
  );
}

// Example 5: Integration with Layout and Navigation
export function FullAppIntegrationExample() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', current: false },
    { name: 'Preferences', href: '/preferences', current: true },
    { name: 'Settings', href: '/settings', current: false },
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} fixed inset-0 z-40 lg:block lg:static lg:inset-auto`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 lg:hidden" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex flex-col flex-1 w-64 bg-white border-r border-gray-200">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <h1 className="text-xl font-bold text-gray-900">FinHelm AI</h1>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={`${
                    item.current
                      ? 'bg-blue-50 border-r-2 border-blue-500 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                >
                  {item.name}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex items-center">
              <h2 className="text-xl font-semibold text-gray-900">Intacct Preferences</h2>
            </div>
            <div className="flex items-center space-x-4">
              <button className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Preferences Component */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <IntacctPreferences
                userId="current-user" as any
                organizationId="current-org" as any
                useConvex={false}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Utility functions used in examples
function getAuthToken(): string {
  // Mock implementation - replace with your auth logic
  return 'mock-auth-token';
}

function showNotification(message: string, type: 'success' | 'error'): void {
  // Mock implementation - replace with your notification system
  console.log(`${type.toUpperCase()}: ${message}`);
  
  // Example with a simple toast
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 p-4 rounded-lg z-50 ${
    type === 'success' 
      ? 'bg-green-500 text-white' 
      : 'bg-red-500 text-white'
  }`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    document.body.removeChild(toast);
  }, 3000);
}

// Export all examples for easy importing
export const IntacctPreferencesExamples = {
  BasicPreferencesExample,
  StandalonePreferencesExample,
  RoleBasedPreferencesExample,
  ReadOnlyPreferencesExample,
  FullAppIntegrationExample,
};