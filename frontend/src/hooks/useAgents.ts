import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useCallback } from 'react';

/**
 * Custom hook for managing agents with Convex backend
 * Provides CRUD operations and real-time updates
 */
export function useAgents(organizationId?: Id<"organizations">) {
  // Queries
  const agents = useQuery(
    api.agentActions.getAgents,
    organizationId ? { organizationId } : 'skip'
  );

  const deploymentStats = useQuery(
    api.agentActions.getDeploymentStats,
    organizationId ? { organizationId } : 'skip'
  );

  const realtimeUpdates = useQuery(
    api.agentActions.subscribeToAgentUpdates,
    organizationId ? { organizationId } : 'skip'
  );

  // Mutations
  const createAgentMutation = useMutation(api.agentActions.createAgent);
  const updateAgentMutation = useMutation(api.agentActions.updateAgent);
  const deleteAgentMutation = useMutation(api.agentActions.deleteAgent);
  const cloneAgentMutation = useMutation(api.agentActions.cloneAgent);

  // Wrapped mutation functions with error handling
  const createAgent = useCallback(async (agentData: {
    userId: Id<"users">;
    name: string;
    description: string;
    category: 'financial_intelligence' | 'supply_chain' | 'revenue_customer' | 'it_operations' | 'custom';
    config: {
      prompt?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
      dataSource: string[];
      userDefinedCalls?: Array<{
        id: string;
        name: string;
        description: string;
        prompt: string;
      }>;
      version?: string;
    };
    userDefinedCalls?: Array<{
      id: string;
      name: string;
      description: string;
      prompt: string;
    }>;
    version?: string;
  }) => {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    try {
      const agentId = await createAgentMutation({
        organizationId,
        ...agentData,
        type: 'custom', // Default type for custom agents
      });
      return agentId;
    } catch (error) {
      console.error('Failed to create agent:', error);
      throw error;
    }
  }, [organizationId, createAgentMutation]);

  const updateAgent = useCallback(async (
    agentId: Id<"agents">,
    updates: {
      name?: string;
      description?: string;
      category?: 'financial_intelligence' | 'supply_chain' | 'revenue_customer' | 'it_operations' | 'custom';
      config?: {
        prompt?: string;
        model?: string;
        temperature?: number;
        maxTokens?: number;
        dataSource: string[];
        userDefinedCalls?: Array<{
          id: string;
          name: string;
          description: string;
          prompt: string;
        }>;
        version?: string;
      };
      isActive?: boolean;
    }
  ) => {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    try {
      await updateAgentMutation({
        agentId,
        organizationId,
        ...updates,
      });
      return agentId;
    } catch (error) {
      console.error('Failed to update agent:', error);
      throw error;
    }
  }, [organizationId, updateAgentMutation]);

  const deleteAgent = useCallback(async (
    agentId: Id<"agents">,
    hardDelete: boolean = false
  ) => {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    try {
      await deleteAgentMutation({
        agentId,
        organizationId,
        hardDelete,
      });
      return agentId;
    } catch (error) {
      console.error('Failed to delete agent:', error);
      throw error;
    }
  }, [organizationId, deleteAgentMutation]);

  const cloneAgent = useCallback(async (
    agentId: Id<"agents">,
    userId: Id<"users">,
    newName: string,
    newVersion?: string
  ) => {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    try {
      const clonedAgentId = await cloneAgentMutation({
        agentId,
        organizationId,
        userId,
        newName,
        newVersion,
      });
      return clonedAgentId;
    } catch (error) {
      console.error('Failed to clone agent:', error);
      throw error;
    }
  }, [organizationId, cloneAgentMutation]);

  // Utility functions
  const getAgentsByCategory = useCallback((category?: string) => {
    if (!agents) return [];
    if (!category) return agents;
    return agents.filter(agent => agent.category === category);
  }, [agents]);

  const getActiveAgents = useCallback(() => {
    if (!agents) return [];
    return agents.filter(agent => agent.isActive);
  }, [agents]);

  const getAgentById = useCallback((agentId: Id<"agents">) => {
    if (!agents) return null;
    return agents.find(agent => agent._id === agentId) || null;
  }, [agents]);

  // Calculate statistics
  const stats = {
    totalAgents: agents?.length || 0,
    activeAgents: agents?.filter(a => a.isActive).length || 0,
    inactiveAgents: agents?.filter(a => !a.isActive).length || 0,
    agentsByCategory: agents?.reduce((acc, agent) => {
      acc[agent.category] = (acc[agent.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {},
  };

  return {
    // Data
    agents: agents || [],
    deploymentStats,
    realtimeUpdates,
    stats,

    // Loading states
    isLoading: agents === undefined,
    isLoadingStats: deploymentStats === undefined,

    // Mutations
    createAgent,
    updateAgent,
    deleteAgent,
    cloneAgent,

    // Utilities
    getAgentsByCategory,
    getActiveAgents,
    getAgentById,
  };
}

/**
 * Custom hook for managing agent versions and history
 */
export function useAgentVersions(organizationId?: Id<"organizations">, agentName?: string) {
  const versions = useQuery(
    api.agentActions.getAgentVersions,
    organizationId && agentName ? { organizationId, agentName } : 'skip'
  );

  const getLatestVersion = useCallback(() => {
    if (!versions || versions.length === 0) return null;
    return versions[0]; // Already sorted by creation date (newest first)
  }, [versions]);

  const getVersionByNumber = useCallback((versionNumber: string) => {
    if (!versions) return null;
    return versions.find(v => v.version === versionNumber) || null;
  }, [versions]);

  const compareVersions = useCallback((version1: string, version2: string) => {
    const v1 = versions?.find(v => v.version === version1);
    const v2 = versions?.find(v => v.version === version2);
    
    if (!v1 || !v2) return null;
    
    return {
      version1: v1,
      version2: v2,
      changes: {
        prompt: v1.config.prompt !== v2.config.prompt,
        model: v1.config.model !== v2.config.model,
        userDefinedCalls: JSON.stringify(v1.config.userDefinedCalls) !== JSON.stringify(v2.config.userDefinedCalls),
        description: v1.description !== v2.description,
      }
    };
  }, [versions]);

  return {
    versions: versions || [],
    isLoading: versions === undefined,
    getLatestVersion,
    getVersionByNumber,
    compareVersions,
  };
}

/**
 * Custom hook for managing agent executions
 */
export function useAgentExecutions(organizationId?: Id<"organizations">, agentId?: Id<"agents">) {
  const executions = useQuery(
    api.agentActions.getAgentExecutions,
    organizationId ? { 
      organizationId, 
      agentId,
      limit: 50 
    } : 'skip'
  );

  const getExecutionStats = useCallback(() => {
    if (!executions) return null;
    
    const total = executions.length;
    const completed = executions.filter(e => e.status === 'completed').length;
    const failed = executions.filter(e => e.status === 'failed').length;
    const running = executions.filter(e => e.status === 'running').length;

    const avgExecutionTime = executions
      .filter(e => e.status === 'completed' && e.executionTime)
      .reduce((sum, e) => sum + (e.executionTime || 0), 0) / completed || 0;

    return {
      total,
      completed,
      failed,
      running,
      successRate: total > 0 ? (completed / total) * 100 : 0,
      avgExecutionTime,
    };
  }, [executions]);

  const getRecentExecutions = useCallback((limit: number = 10) => {
    if (!executions) return [];
    return executions.slice(0, limit);
  }, [executions]);

  return {
    executions: executions || [],
    isLoading: executions === undefined,
    getExecutionStats,
    getRecentExecutions,
  };
}

export default useAgents;