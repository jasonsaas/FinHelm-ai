import { useState, useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import type { AgentResponse } from '../components/chatbot-ui';

export interface UseChatProps {
  organizationId?: Id<"organizations">;
  userId?: Id<"users">;
  sessionId?: string;
  agentId?: Id<"agents">;
}

export interface ChatMessage {
  _id: Id<"chatMessages">;
  type: 'user' | 'assistant';
  content: string;
  createdAt: number;
  response?: AgentResponse;
}

export function useChat({
  organizationId = "demo-org" as Id<"organizations">,
  userId = "demo-user" as Id<"users">,
  sessionId = `session-${Date.now()}`,
  agentId,
}: UseChatProps = {}) {
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convex mutations and queries
  const sendChatMessage = useMutation(api.chatActions.sendChatMessage);
  const createDefaultAgent = useMutation(api.chatActions.createDefaultAgent);
  
  const messages = useQuery(api.chatActions.getChatMessages, {
    sessionId: currentSessionId,
    organizationId,
    limit: 100,
  }) || [];

  const defaultAgent = useQuery(api.chatActions.getDefaultAgent, {
    organizationId,
  });

  const chatStats = useQuery(api.chatActions.getChatStats, {
    organizationId,
    userId,
    days: 30,
  });

  // Convert Convex messages to our ChatMessage format
  const formattedMessages: ChatMessage[] = messages.map(msg => ({
    _id: msg._id,
    type: msg.type,
    content: msg.content,
    createdAt: msg.createdAt,
    response: msg.response as AgentResponse | undefined,
  }));

  const sendMessage = useCallback(async (content: string): Promise<AgentResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      // Ensure we have a default agent
      let currentAgentId = agentId || defaultAgent?._id;
      
      if (!currentAgentId) {
        // Create default agent if none exists
        currentAgentId = await createDefaultAgent({
          organizationId,
          userId,
        });
      }

      // Send the message
      const result = await sendChatMessage({
        organizationId,
        userId,
        sessionId: currentSessionId,
        content,
        agentId: currentAgentId,
      });

      return result.response;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [
    organizationId,
    userId,
    currentSessionId,
    agentId,
    defaultAgent?._id,
    sendChatMessage,
    createDefaultAgent,
  ]);

  const startNewSession = useCallback(() => {
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setCurrentSessionId(newSessionId);
    setError(null);
    return newSessionId;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages: formattedMessages,
    sendMessage,
    isLoading,
    error,
    clearError,
    sessionId: currentSessionId,
    startNewSession,
    stats: chatStats,
    hasDefaultAgent: !!defaultAgent,
  };
}

// Helper hook for managing multiple chat sessions
export function useChatSessions({
  organizationId = "demo-org" as Id<"organizations">,
  userId = "demo-user" as Id<"users">,
}: Omit<UseChatProps, 'sessionId' | 'agentId'> = {}) {
  
  const sessions = useQuery(api.chatActions.getChatSessions, {
    organizationId,
    userId,
    limit: 20,
  }) || [];

  const deleteChatSession = useMutation(api.chatActions.deleteChatSession);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      const result = await deleteChatSession({
        sessionId,
        organizationId,
        userId,
      });
      return result;
    } catch (err) {
      console.error('Failed to delete session:', err);
      throw err;
    }
  }, [deleteChatSession, organizationId, userId]);

  return {
    sessions,
    deleteSession,
  };
}