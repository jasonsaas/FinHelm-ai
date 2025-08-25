import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConvexTestingHelper } from 'convex/testing';
import { api } from '../_generated/api';
import schema from '../schema';

describe('Chat Actions', () => {
  let t: ConvexTestingHelper<typeof schema>;

  beforeEach(async () => {
    t = new ConvexTestingHelper(schema);
    await t.withDb(async (db) => {
      // Set up test data
      const orgId = await db.insert('organizations', {
        name: 'Test Org',
        slug: 'test-org',
        erpType: 'quickbooks',
        erpSettings: {
          features: [],
        },
        isActive: true,
        subscriptionTier: 'premium',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const userId = await db.insert('users', {
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const agentId = await db.insert('agents', {
        organizationId: orgId,
        userId: userId,
        name: 'Test Agent',
        description: 'Test financial agent',
        category: 'financial_intelligence',
        type: 'multivariate_prediction',
        isActive: true,
        isPremium: false,
        config: {
          model: 'grok-beta',
          temperature: 0.3,
          maxTokens: 2000,
          dataSource: ['transactions', 'accounts'],
          schedule: { frequency: 'manual' },
        },
        lastRunAt: null,
        runCount: 0,
        averageExecutionTime: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return { orgId, userId, agentId };
    });
  });

  it('creates chat message successfully', async () => {
    await t.withDb(async (db) => {
      const orgId = (await db.query('organizations').first())!._id;
      const userId = (await db.query('users').first())!._id;

      const messageId = await t.mutation(api.chatActions.createChatMessage, {
        organizationId: orgId,
        userId: userId,
        sessionId: 'test-session',
        type: 'user',
        content: 'What is my revenue?',
      });

      const message = await db.get(messageId);
      expect(message).toBeTruthy();
      expect(message?.content).toBe('What is my revenue?');
      expect(message?.type).toBe('user');
      expect(message?.sessionId).toBe('test-session');
    });
  });

  it('retrieves chat messages by session', async () => {
    await t.withDb(async (db) => {
      const orgId = (await db.query('organizations').first())!._id;
      const userId = (await db.query('users').first())!._id;
      const sessionId = 'test-session-retrieve';

      // Create test messages
      await db.insert('chatMessages', {
        organizationId: orgId,
        userId: userId,
        sessionId: sessionId,
        type: 'user',
        content: 'First message',
        createdAt: Date.now() - 2000,
        updatedAt: Date.now() - 2000,
      });

      await db.insert('chatMessages', {
        organizationId: orgId,
        userId: userId,
        sessionId: sessionId,
        type: 'assistant',
        content: 'Response message',
        createdAt: Date.now() - 1000,
        updatedAt: Date.now() - 1000,
      });

      const messages = await t.query(api.chatActions.getChatMessages, {
        sessionId: sessionId,
        organizationId: orgId,
        limit: 10,
      });

      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('First message');
      expect(messages[1].content).toBe('Response message');
    });
  });

  it('gets chat sessions for user', async () => {
    await t.withDb(async (db) => {
      const orgId = (await db.query('organizations').first())!._id;
      const userId = (await db.query('users').first())!._id;

      // Create messages in different sessions
      await db.insert('chatMessages', {
        organizationId: orgId,
        userId: userId,
        sessionId: 'session-1',
        type: 'user',
        content: 'Session 1 message',
        createdAt: Date.now() - 3000,
        updatedAt: Date.now() - 3000,
      });

      await db.insert('chatMessages', {
        organizationId: orgId,
        userId: userId,
        sessionId: 'session-2',
        type: 'user',
        content: 'Session 2 message',
        createdAt: Date.now() - 1000,
        updatedAt: Date.now() - 1000,
      });

      const sessions = await t.query(api.chatActions.getChatSessions, {
        organizationId: orgId,
        userId: userId,
        limit: 10,
      });

      expect(sessions).toHaveLength(2);
      // Should be ordered by most recent activity
      expect(sessions[0].sessionId).toBe('session-2');
      expect(sessions[1].sessionId).toBe('session-1');
    });
  });

  it('deletes chat session successfully', async () => {
    await t.withDb(async (db) => {
      const orgId = (await db.query('organizations').first())!._id;
      const userId = (await db.query('users').first())!._id;
      const sessionId = 'session-to-delete';

      // Create messages to delete
      await db.insert('chatMessages', {
        organizationId: orgId,
        userId: userId,
        sessionId: sessionId,
        type: 'user',
        content: 'Message 1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await db.insert('chatMessages', {
        organizationId: orgId,
        userId: userId,
        sessionId: sessionId,
        type: 'assistant',
        content: 'Message 2',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await t.mutation(api.chatActions.deleteChatSession, {
        sessionId: sessionId,
        organizationId: orgId,
        userId: userId,
      });

      expect(result.deleted).toBe(2);

      // Verify messages are deleted
      const remainingMessages = await t.query(api.chatActions.getChatMessages, {
        sessionId: sessionId,
        organizationId: orgId,
      });

      expect(remainingMessages).toHaveLength(0);
    });
  });

  it('gets default agent successfully', async () => {
    await t.withDb(async (db) => {
      const orgId = (await db.query('organizations').first())!._id;

      const agent = await t.query(api.chatActions.getDefaultAgent, {
        organizationId: orgId,
      });

      expect(agent).toBeTruthy();
      expect(agent?.name).toBe('Test Agent');
      expect(agent?.category).toBe('financial_intelligence');
    });
  });

  it('creates default agent when none exists', async () => {
    await t.withDb(async (db) => {
      // Create new organization without agent
      const newOrgId = await db.insert('organizations', {
        name: 'New Org',
        slug: 'new-org',
        erpType: 'quickbooks',
        erpSettings: { features: [] },
        isActive: true,
        subscriptionTier: 'basic',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const userId = (await db.query('users').first())!._id;

      const agentId = await t.mutation(api.chatActions.createDefaultAgent, {
        organizationId: newOrgId,
        userId: userId,
      });

      const agent = await db.get(agentId);
      expect(agent).toBeTruthy();
      expect(agent?.name).toBe('FinHelm AI Assistant');
      expect(agent?.type).toBe('multivariate_prediction');
      expect(agent?.isActive).toBe(true);
    });
  });

  it('calculates chat stats correctly', async () => {
    await t.withDb(async (db) => {
      const orgId = (await db.query('organizations').first())!._id;
      const userId = (await db.query('users').first())!._id;
      const now = Date.now();
      const dayAgo = now - (24 * 60 * 60 * 1000);

      // Create test messages within the last 30 days
      await db.insert('chatMessages', {
        organizationId: orgId,
        userId: userId,
        sessionId: 'stats-session-1',
        type: 'user',
        content: 'User message 1',
        createdAt: dayAgo,
        updatedAt: dayAgo,
      });

      await db.insert('chatMessages', {
        organizationId: orgId,
        userId: userId,
        sessionId: 'stats-session-1',
        type: 'assistant',
        content: 'Assistant message 1',
        createdAt: dayAgo + 1000,
        updatedAt: dayAgo + 1000,
      });

      await db.insert('chatMessages', {
        organizationId: orgId,
        userId: userId,
        sessionId: 'stats-session-2',
        type: 'user',
        content: 'User message 2',
        createdAt: now - 1000,
        updatedAt: now - 1000,
      });

      const stats = await t.query(api.chatActions.getChatStats, {
        organizationId: orgId,
        userId: userId,
        days: 30,
      });

      expect(stats?.totalMessages).toBe(3);
      expect(stats?.userMessages).toBe(2);
      expect(stats?.assistantMessages).toBe(1);
      expect(stats?.uniqueSessions).toBe(2);
      expect(stats?.period).toBe(30);
      expect(stats?.averageMessagesPerSession).toBe(2); // 4 messages / 2 sessions = 2 (rounded)
    });
  });

  it('handles empty message retrieval', async () => {
    await t.withDb(async (db) => {
      const orgId = (await db.query('organizations').first())!._id;

      const messages = await t.query(api.chatActions.getChatMessages, {
        sessionId: 'non-existent-session',
        organizationId: orgId,
        limit: 10,
      });

      expect(messages).toHaveLength(0);
    });
  });

  it('respects message limit parameter', async () => {
    await t.withDb(async (db) => {
      const orgId = (await db.query('organizations').first())!._id;
      const userId = (await db.query('users').first())!._id;
      const sessionId = 'limit-test-session';

      // Create 5 test messages
      for (let i = 0; i < 5; i++) {
        await db.insert('chatMessages', {
          organizationId: orgId,
          userId: userId,
          sessionId: sessionId,
          type: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          createdAt: Date.now() + i * 1000,
          updatedAt: Date.now() + i * 1000,
        });
      }

      const messages = await t.query(api.chatActions.getChatMessages, {
        sessionId: sessionId,
        organizationId: orgId,
        limit: 3,
      });

      expect(messages).toHaveLength(3);
    });
  });
});