import { renderHook, act, waitFor } from '@testing-library/react';
import { useAgents, useAgentVersions, useAgentExecutions } from '../../hooks/useAgents';

// Mock Convex hooks
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn()
}));

const mockAgents = [
  {
    _id: 'agent1',
    name: 'Financial Analyzer',
    category: 'financial_intelligence',
    isActive: true,
    createdAt: Date.now() - 86400000,
    config: { model: 'grok-beta', version: '1.0.0' }
  },
  {
    _id: 'agent2',
    name: 'Budget Tracker',
    category: 'financial_intelligence',
    isActive: false,
    createdAt: Date.now() - 172800000,
    config: { model: 'gpt-4', version: '2.0.0' }
  },
  {
    _id: 'agent3',
    name: 'Supply Chain Optimizer',
    category: 'supply_chain',
    isActive: true,
    createdAt: Date.now() - 259200000,
    config: { model: 'claude-3-sonnet', version: '1.5.0' }
  }
];

const mockVersions = [
  {
    id: 'v1',
    version: '2.0.0',
    createdAt: Date.now() - 86400000,
    isActive: true,
    config: { prompt: 'Latest prompt', model: 'grok-beta' }
  },
  {
    id: 'v2',
    version: '1.0.0',
    createdAt: Date.now() - 172800000,
    isActive: false,
    config: { prompt: 'Original prompt', model: 'gpt-4' }
  }
];

const mockExecutions = [
  {
    _id: 'exec1',
    agentId: 'agent1',
    status: 'completed',
    startedAt: Date.now() - 3600000,
    completedAt: Date.now() - 3500000,
    executionTime: 100000,
    tokensUsed: 500
  },
  {
    _id: 'exec2',
    agentId: 'agent1',
    status: 'failed',
    startedAt: Date.now() - 7200000,
    error: 'API timeout'
  },
  {
    _id: 'exec3',
    agentId: 'agent2',
    status: 'running',
    startedAt: Date.now() - 1800000
  }
];

describe('useAgents', () => {
  const { useQuery, useMutation } = require('convex/react');

  beforeEach(() => {
    jest.clearAllMocks();
    useQuery.mockReturnValue(mockAgents);
    useMutation.mockReturnValue(jest.fn());
  });

  describe('Basic Functionality', () => {
    it('should return agents data and loading states', () => {
      const { result } = renderHook(() => useAgents('org123' as any));

      expect(result.current.agents).toEqual(mockAgents);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.stats.totalAgents).toBe(3);
      expect(result.current.stats.activeAgents).toBe(2);
      expect(result.current.stats.inactiveAgents).toBe(1);
    });

    it('should handle loading state', () => {
      useQuery.mockReturnValue(undefined);

      const { result } = renderHook(() => useAgents('org123' as any));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.agents).toEqual([]);
    });

    it('should skip query when organizationId is not provided', () => {
      renderHook(() => useAgents());

      expect(useQuery).toHaveBeenCalledWith(
        expect.any(Object),
        'skip'
      );
    });
  });

  describe('Agent Statistics', () => {
    it('should calculate correct statistics', () => {
      const { result } = renderHook(() => useAgents('org123' as any));

      expect(result.current.stats).toEqual({
        totalAgents: 3,
        activeAgents: 2,
        inactiveAgents: 1,
        agentsByCategory: {
          financial_intelligence: 2,
          supply_chain: 1
        }
      });
    });

    it('should handle empty agents array', () => {
      useQuery.mockReturnValue([]);

      const { result } = renderHook(() => useAgents('org123' as any));

      expect(result.current.stats).toEqual({
        totalAgents: 0,
        activeAgents: 0,
        inactiveAgents: 0,
        agentsByCategory: {}
      });
    });
  });

  describe('Agent Filtering', () => {
    it('should filter agents by category', () => {
      const { result } = renderHook(() => useAgents('org123' as any));

      const financialAgents = result.current.getAgentsByCategory('financial_intelligence');
      expect(financialAgents).toHaveLength(2);
      expect(financialAgents.every(agent => agent.category === 'financial_intelligence')).toBe(true);
    });

    it('should return all agents when no category specified', () => {
      const { result } = renderHook(() => useAgents('org123' as any));

      const allAgents = result.current.getAgentsByCategory();
      expect(allAgents).toEqual(mockAgents);
    });

    it('should get only active agents', () => {
      const { result } = renderHook(() => useAgents('org123' as any));

      const activeAgents = result.current.getActiveAgents();
      expect(activeAgents).toHaveLength(2);
      expect(activeAgents.every(agent => agent.isActive)).toBe(true);
    });

    it('should get agent by ID', () => {
      const { result } = renderHook(() => useAgents('org123' as any));

      const agent = result.current.getAgentById('agent1' as any);
      expect(agent).toEqual(mockAgents[0]);

      const notFound = result.current.getAgentById('nonexistent' as any);
      expect(notFound).toBeNull();
    });
  });

  describe('Agent Mutations', () => {
    let mockCreateAgent: jest.Mock;
    let mockUpdateAgent: jest.Mock;
    let mockDeleteAgent: jest.Mock;
    let mockCloneAgent: jest.Mock;

    beforeEach(() => {
      mockCreateAgent = jest.fn().mockResolvedValue('new-agent-id');
      mockUpdateAgent = jest.fn().mockResolvedValue('agent1');
      mockDeleteAgent = jest.fn().mockResolvedValue('agent1');
      mockCloneAgent = jest.fn().mockResolvedValue('cloned-agent-id');

      useMutation
        .mockReturnValueOnce(mockCreateAgent)
        .mockReturnValueOnce(mockUpdateAgent)
        .mockReturnValueOnce(mockDeleteAgent)
        .mockReturnValueOnce(mockCloneAgent);
    });

    it('should create agent successfully', async () => {
      const { result } = renderHook(() => useAgents('org123' as any));

      const agentData = {
        userId: 'user123' as any,
        name: 'Test Agent',
        description: 'Test description',
        category: 'custom' as const,
        config: {
          prompt: 'Test prompt',
          model: 'grok-beta',
          dataSource: ['transactions']
        }
      };

      await act(async () => {
        const agentId = await result.current.createAgent(agentData);
        expect(agentId).toBe('new-agent-id');
      });

      expect(mockCreateAgent).toHaveBeenCalledWith({
        organizationId: 'org123',
        type: 'custom',
        ...agentData
      });
    });

    it('should handle create agent errors', async () => {
      mockCreateAgent.mockRejectedValue(new Error('Creation failed'));

      const { result } = renderHook(() => useAgents('org123' as any));

      await act(async () => {
        await expect(result.current.createAgent({
          userId: 'user123' as any,
          name: 'Test Agent',
          description: 'Test description',
          category: 'custom' as const,
          config: { dataSource: [] }
        })).rejects.toThrow('Creation failed');
      });
    });

    it('should update agent successfully', async () => {
      const { result } = renderHook(() => useAgents('org123' as any));

      const updates = {
        name: 'Updated Agent',
        isActive: false
      };

      await act(async () => {
        const agentId = await result.current.updateAgent('agent1' as any, updates);
        expect(agentId).toBe('agent1');
      });

      expect(mockUpdateAgent).toHaveBeenCalledWith({
        agentId: 'agent1',
        organizationId: 'org123',
        ...updates
      });
    });

    it('should delete agent successfully', async () => {
      const { result } = renderHook(() => useAgents('org123' as any));

      await act(async () => {
        const agentId = await result.current.deleteAgent('agent1' as any);
        expect(agentId).toBe('agent1');
      });

      expect(mockDeleteAgent).toHaveBeenCalledWith({
        agentId: 'agent1',
        organizationId: 'org123',
        hardDelete: false
      });
    });

    it('should clone agent successfully', async () => {
      const { result } = renderHook(() => useAgents('org123' as any));

      await act(async () => {
        const clonedId = await result.current.cloneAgent(
          'agent1' as any,
          'user123' as any,
          'Cloned Agent',
          '2.0.0'
        );
        expect(clonedId).toBe('cloned-agent-id');
      });

      expect(mockCloneAgent).toHaveBeenCalledWith({
        agentId: 'agent1',
        organizationId: 'org123',
        userId: 'user123',
        newName: 'Cloned Agent',
        newVersion: '2.0.0'
      });
    });

    it('should throw error when organizationId is missing', async () => {
      const { result } = renderHook(() => useAgents());

      await act(async () => {
        await expect(result.current.createAgent({
          userId: 'user123' as any,
          name: 'Test',
          description: 'Test',
          category: 'custom',
          config: { dataSource: [] }
        })).rejects.toThrow('Organization ID is required');
      });
    });
  });
});

describe('useAgentVersions', () => {
  const { useQuery } = require('convex/react');

  beforeEach(() => {
    jest.clearAllMocks();
    useQuery.mockReturnValue(mockVersions);
  });

  describe('Basic Functionality', () => {
    it('should return versions data', () => {
      const { result } = renderHook(() => 
        useAgentVersions('org123' as any, 'Test Agent')
      );

      expect(result.current.versions).toEqual(mockVersions);
      expect(result.current.isLoading).toBe(false);
    });

    it('should skip query when parameters are missing', () => {
      renderHook(() => useAgentVersions());

      expect(useQuery).toHaveBeenCalledWith(
        expect.any(Object),
        'skip'
      );
    });

    it('should get latest version', () => {
      const { result } = renderHook(() => 
        useAgentVersions('org123' as any, 'Test Agent')
      );

      const latest = result.current.getLatestVersion();
      expect(latest).toEqual(mockVersions[0]);
    });

    it('should get version by number', () => {
      const { result } = renderHook(() => 
        useAgentVersions('org123' as any, 'Test Agent')
      );

      const version = result.current.getVersionByNumber('1.0.0');
      expect(version).toEqual(mockVersions[1]);

      const notFound = result.current.getVersionByNumber('99.0.0');
      expect(notFound).toBeNull();
    });

    it('should compare versions', () => {
      const { result } = renderHook(() => 
        useAgentVersions('org123' as any, 'Test Agent')
      );

      const comparison = result.current.compareVersions('2.0.0', '1.0.0');
      expect(comparison).toEqual({
        version1: mockVersions[0],
        version2: mockVersions[1],
        changes: expect.objectContaining({
          prompt: true,
          model: true
        })
      });
    });

    it('should handle empty versions', () => {
      useQuery.mockReturnValue([]);

      const { result } = renderHook(() => 
        useAgentVersions('org123' as any, 'Test Agent')
      );

      expect(result.current.getLatestVersion()).toBeNull();
      expect(result.current.getVersionByNumber('1.0.0')).toBeNull();
      expect(result.current.compareVersions('1.0.0', '2.0.0')).toBeNull();
    });
  });
});

describe('useAgentExecutions', () => {
  const { useQuery } = require('convex/react');

  beforeEach(() => {
    jest.clearAllMocks();
    useQuery.mockReturnValue(mockExecutions);
  });

  describe('Basic Functionality', () => {
    it('should return executions data', () => {
      const { result } = renderHook(() => 
        useAgentExecutions('org123' as any, 'agent1' as any)
      );

      expect(result.current.executions).toEqual(mockExecutions);
      expect(result.current.isLoading).toBe(false);
    });

    it('should calculate execution statistics', () => {
      const { result } = renderHook(() => 
        useAgentExecutions('org123' as any, 'agent1' as any)
      );

      const stats = result.current.getExecutionStats();
      expect(stats).toEqual({
        total: 3,
        completed: 1,
        failed: 1,
        running: 1,
        successRate: 33.333333333333336,
        avgExecutionTime: 100000
      });
    });

    it('should get recent executions', () => {
      const { result } = renderHook(() => 
        useAgentExecutions('org123' as any, 'agent1' as any)
      );

      const recent = result.current.getRecentExecutions(2);
      expect(recent).toHaveLength(2);
      expect(recent).toEqual(mockExecutions.slice(0, 2));
    });

    it('should handle empty executions', () => {
      useQuery.mockReturnValue([]);

      const { result } = renderHook(() => 
        useAgentExecutions('org123' as any, 'agent1' as any)
      );

      const stats = result.current.getExecutionStats();
      expect(stats).toEqual({
        total: 0,
        completed: 0,
        failed: 0,
        running: 0,
        successRate: 0,
        avgExecutionTime: 0
      });

      expect(result.current.getRecentExecutions()).toEqual([]);
    });

    it('should skip query when organizationId is missing', () => {
      renderHook(() => useAgentExecutions());

      expect(useQuery).toHaveBeenCalledWith(
        expect.any(Object),
        'skip'
      );
    });
  });

  describe('Statistics Edge Cases', () => {
    it('should handle executions without execution time', () => {
      const executionsWithoutTime = [
        { ...mockExecutions[0], executionTime: undefined },
        { ...mockExecutions[1], status: 'completed', executionTime: undefined }
      ];

      useQuery.mockReturnValue(executionsWithoutTime);

      const { result } = renderHook(() => 
        useAgentExecutions('org123' as any, 'agent1' as any)
      );

      const stats = result.current.getExecutionStats();
      expect(stats?.avgExecutionTime).toBe(0);
    });

    it('should calculate success rate correctly', () => {
      const mixedExecutions = [
        { ...mockExecutions[0], status: 'completed' },
        { ...mockExecutions[0], status: 'completed' },
        { ...mockExecutions[0], status: 'failed' },
        { ...mockExecutions[0], status: 'running' }
      ];

      useQuery.mockReturnValue(mixedExecutions);

      const { result } = renderHook(() => 
        useAgentExecutions('org123' as any, 'agent1' as any)
      );

      const stats = result.current.getExecutionStats();
      expect(stats?.successRate).toBe(50); // 2 completed out of 4 total
    });
  });
});