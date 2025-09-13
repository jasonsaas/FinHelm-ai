import { useState, useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import type { AgentResponse } from '../components/chatbot-ui';

/**
 * Configuration properties for the useChat hook
 */
export interface UseChatProps {
  /** Organization ID for chat context */
  organizationId?: Id<"organizations">;
  /** User ID for chat context */
  userId?: Id<"users">;
  /** Session ID for grouping messages */
  sessionId?: string;
  /** AI agent ID for handling conversations */
  agentId?: Id<"agents">;
}

/**
 * Chat message structure used throughout the application
 */
export interface ChatMessage {
  /** Unique message identifier */
  _id: Id<"chatMessages">;
  /** Message sender type */
  type: 'user' | 'assistant';
  /** Message content */
  content: string;
  /** Message creation timestamp */
  createdAt: number;
  /** AI agent response data */
  response?: AgentResponse;
}

/**
 * Chat management hook for handling real-time conversations with AI agents
 * 
 * This hook provides comprehensive chat functionality including:
 * - Real-time message sending and receiving
 * - AI agent integration with automatic fallback to default agent
 * - Session management and message history
 * - Error handling and loading states
 * - Chat statistics and analytics
 * 
 * @param props - Configuration options for the chat hook
 * @returns Chat interface with messages, actions, and state
 * 
 * @example
 * ```typescript
 * const {
 *   messages,
 *   sendMessage,
 *   isLoading,
 *   error,
 *   sessionId,
 *   startNewSession,
 * } = useChat({
 *   organizationId: 'org-123',
 *   userId: 'user-456',
 * });
 * 
 * // Send a message
 * const response = await sendMessage('What is my account balance?');
 * ```
 */
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

  /**
   * Sends a message to the AI agent and returns the response
   * 
   * @param content - The message content to send
   * @returns Promise resolving to the agent's response
   * @throws Will throw an error if message sending fails
   */
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

  /**
   * Starts a new chat session with a unique session ID
   * 
   * @returns The new session ID
   */
  const startNewSession = useCallback(() => {
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setCurrentSessionId(newSessionId);
    setError(null);
    return newSessionId;
  }, []);

  /**
   * Clears any current error state
   */
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

/**
 * Chat sessions management hook for handling multiple conversations
 * 
 * This hook provides functionality to:
 * - List all chat sessions for a user
 * - Delete chat sessions and their associated messages
 * - Manage session history and cleanup
 * 
 * @param props - Configuration options excluding sessionId and agentId
 * @returns Session management interface with list and delete operations
 * 
 * @example
 * ```typescript
 * const { sessions, deleteSession } = useChatSessions({
 *   organizationId: 'org-123',
 *   userId: 'user-456',
 * });
 * 
 * // Delete a session
 * await deleteSession('session-abc');
 * ```
 */
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

  /**
   * Deletes a chat session and all its associated messages
   * 
   * @param sessionId - The ID of the session to delete
   * @returns Promise resolving to the deletion result
   * @throws Will throw an error if session deletion fails
   */
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