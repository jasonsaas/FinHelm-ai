import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import type { IntacctPreferences } from '../components/intacct-preferences';

export interface UseIntacctPreferencesOptions {
  userId?: Id<"users">;
  organizationId?: Id<"organizations">;
  autoLoad?: boolean;
}

export interface UseIntacctPreferencesResult {
  preferences: IntacctPreferences | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  savePreferences: (preferences: IntacctPreferences) => Promise<void>;
  deletePreferences: () => Promise<void>;
  resetToDefaults: (roleName: string) => Promise<void>;
  refetch: () => void;
}

/**
 * Custom hook for managing Intacct preferences with Convex backend
 */
export function useIntacctPreferences({
  userId,
  organizationId,
  autoLoad = true,
}: UseIntacctPreferencesOptions = {}): UseIntacctPreferencesResult {
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Query for getting preferences
  const preferencesQuery = useQuery(
    api.intacctPreferencesActions.getIntacctPreferences,
    autoLoad && userId && organizationId ? { userId, organizationId } : 'skip'
  );

  // Mutations
  const savePreferencesMutation = useMutation(api.intacctPreferencesActions.saveIntacctPreferences);
  const deletePreferencesMutation = useMutation(api.intacctPreferencesActions.deleteIntacctPreferences);
  const getDefaultPreferences = useMutation(api.intacctPreferencesActions.getDefaultPreferencesForRole);

  // Handle query errors
  useEffect(() => {
    if (preferencesQuery === undefined) {
      setIsError(false);
      setError(null);
    } else if (preferencesQuery === null) {
      // No preferences found - this is not an error
      setIsError(false);
      setError(null);
    }
  }, [preferencesQuery]);

  // Convert Convex document to IntacctPreferences format
  const convertToIntacctPreferences = useCallback((doc: any): IntacctPreferences | null => {
    if (!doc) return null;

    return {
      id: doc._id,
      userId: doc.userId,
      organizationId: doc.organizationId,
      userRole: doc.userRole,
      notifications: doc.notifications,
      uiCustomizations: doc.uiCustomizations,
      dashboardWidgets: doc.dashboardWidgets,
      productivityTools: doc.productivityTools,
      grokAIEnabled: doc.grokAIEnabled,
      lastUpdated: doc.lastUpdated,
    };
  }, []);

  // Save preferences
  const savePreferences = useCallback(async (preferences: IntacctPreferences) => {
    if (!userId || !organizationId) {
      throw new Error('User ID and Organization ID are required');
    }

    setIsError(false);
    setError(null);

    try {
      await savePreferencesMutation({
        userId,
        organizationId,
        userRole: preferences.userRole,
        notifications: preferences.notifications,
        uiCustomizations: preferences.uiCustomizations,
        dashboardWidgets: preferences.dashboardWidgets,
        productivityTools: preferences.productivityTools,
        grokAIEnabled: preferences.grokAIEnabled,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save preferences';
      setIsError(true);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [userId, organizationId, savePreferencesMutation]);

  // Delete preferences
  const deletePreferences = useCallback(async () => {
    if (!userId || !organizationId) {
      throw new Error('User ID and Organization ID are required');
    }

    setIsError(false);
    setError(null);

    try {
      await deletePreferencesMutation({
        userId,
        organizationId,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete preferences';
      setIsError(true);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [userId, organizationId, deletePreferencesMutation]);

  // Reset to default preferences
  const resetToDefaults = useCallback(async (roleName: string) => {
    if (!userId || !organizationId) {
      throw new Error('User ID and Organization ID are required');
    }

    setIsError(false);
    setError(null);

    try {
      const defaults = await getDefaultPreferences({ roleName });
      
      const defaultPreferences: IntacctPreferences = {
        userId,
        organizationId,
        userRole: { id: roleName, name: roleName, permissions: ['read', 'write'] },
        notifications: defaults.notifications,
        uiCustomizations: defaults.uiCustomizations,
        dashboardWidgets: defaults.dashboardWidgets,
        productivityTools: defaults.productivityTools,
        grokAIEnabled: defaults.grokAIEnabled,
        lastUpdated: Date.now(),
      };

      await savePreferences(defaultPreferences);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset to defaults';
      setIsError(true);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [userId, organizationId, getDefaultPreferences, savePreferences]);

  // Refetch function
  const refetch = useCallback(() => {
    // Note: With Convex, the query will automatically refetch when dependencies change
    // This function is provided for consistency with other hooks
    setIsError(false);
    setError(null);
  }, []);

  return {
    preferences: convertToIntacctPreferences(preferencesQuery),
    isLoading: preferencesQuery === undefined,
    isError,
    error,
    savePreferences,
    deletePreferences,
    resetToDefaults,
    refetch,
  };
}

/**
 * Hook for organization-level preferences management (admin only)
 */
export function useOrganizationIntacctPreferences(
  organizationId?: Id<"organizations">,
  requestingUserId?: Id<"users">
) {
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orgPreferencesQuery = useQuery(
    api.intacctPreferencesActions.getOrganizationIntacctPreferences,
    organizationId && requestingUserId ? { organizationId, requestingUserId } : 'skip'
  );

  // Handle query errors
  useEffect(() => {
    if (orgPreferencesQuery === undefined) {
      setIsError(false);
      setError(null);
    }
  }, [orgPreferencesQuery]);

  const convertToIntacctPreferencesArray = useCallback((docs: any[]): IntacctPreferences[] => {
    if (!docs || !Array.isArray(docs)) return [];

    return docs.map((doc) => ({
      id: doc._id,
      userId: doc.userId,
      organizationId: doc.organizationId,
      userRole: doc.userRole,
      notifications: doc.notifications,
      uiCustomizations: doc.uiCustomizations,
      dashboardWidgets: doc.dashboardWidgets,
      productivityTools: doc.productivityTools,
      grokAIEnabled: doc.grokAIEnabled,
      lastUpdated: doc.lastUpdated,
    }));
  }, []);

  return {
    preferences: convertToIntacctPreferencesArray(orgPreferencesQuery || []),
    isLoading: orgPreferencesQuery === undefined,
    isError,
    error,
  };
}