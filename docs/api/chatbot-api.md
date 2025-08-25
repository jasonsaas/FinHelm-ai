# FinHelm AI Chatbot API Documentation

## Overview

The FinHelm AI Chatbot provides conversational financial intelligence through a comprehensive API built on Convex. This documentation covers all endpoints, data models, and integration patterns.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │───▶│   Convex API    │───▶│   Grok AI       │
│   ChatbotUI     │    │   chatActions   │    │   Analysis      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Real-time     │    │   Financial     │    │   Text          │
│   Updates       │    │   Data          │    │   Enhancement   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Data Models

### ChatMessage

```typescript
interface ChatMessage {
  _id: Id<"chatMessages">;
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  sessionId: string;
  type: 'user' | 'assistant';
  content: string;
  agentExecutionId?: Id<"agentExecutions">;
  response?: AgentResponse;
  createdAt: number;
  updatedAt: number;
}
```

### AgentResponse

```typescript
interface AgentResponse {
  summary: string;
  dataOverview: {
    totalRecords: number;
    dateRange: {
      start: number;
      end: number;
    };
    keyMetrics: Array<{
      name: string;
      value: any;
      change?: number;
      trend?: 'up' | 'down' | 'flat';
    }>;
  };
  patterns: Array<{
    type: string;
    description: string;
    confidence: number;
    impact: 'high' | 'medium' | 'low';
    data?: any[];
  }>;
  actions: Array<{
    type: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    automated: boolean;
    dueDate?: number;
    assignee?: Id<"users">;
  }>;
}
```

## API Endpoints

### Chat Management

#### `sendChatMessage`
**Type:** Action  
**Description:** Send a chat message and receive AI-powered financial analysis

**Parameters:**
```typescript
{
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  sessionId: string;
  content: string;
  agentId?: Id<"agents">;
}
```

**Response:**
```typescript
{
  userMessageId: Id<"chatMessages">;
  assistantMessageId: Id<"chatMessages">;
  response: AgentResponse;
  executionTime: number;
}
```

**Example:**
```typescript
const result = await convex.action(api.chatActions.sendChatMessage, {
  organizationId: "org123",
  userId: "user456",
  sessionId: "session789",
  content: "What is my revenue this quarter?",
});
```

#### `getChatMessages`
**Type:** Query  
**Description:** Retrieve chat messages for a session

**Parameters:**
```typescript
{
  sessionId: string;
  organizationId: Id<"organizations">;
  limit?: number;
  offset?: number;
}
```

**Response:**
```typescript
ChatMessage[]
```

#### `createChatMessage`
**Type:** Mutation  
**Description:** Create a new chat message

**Parameters:**
```typescript
{
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  sessionId: string;
  type: 'user' | 'assistant';
  content: string;
  response?: AgentResponse;
  agentExecutionId?: Id<"agentExecutions">;
}
```

#### `getChatSessions`
**Type:** Query  
**Description:** Get recent chat sessions for a user

**Parameters:**
```typescript
{
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  limit?: number;
}
```

**Response:**
```typescript
Array<{
  sessionId: string;
  lastMessage: ChatMessage;
  lastActivity: number;
}>
```

#### `deleteChatSession`
**Type:** Mutation  
**Description:** Delete all messages in a chat session

**Parameters:**
```typescript
{
  sessionId: string;
  organizationId: Id<"organizations">;
  userId: Id<"users">;
}
```

**Response:**
```typescript
{
  deleted: number;
}
```

### Agent Management

#### `getDefaultAgent`
**Type:** Query  
**Description:** Get or find the default financial intelligence agent

**Parameters:**
```typescript
{
  organizationId: Id<"organizations">;
}
```

#### `createDefaultAgent`
**Type:** Mutation  
**Description:** Create a default financial intelligence agent

**Parameters:**
```typescript
{
  organizationId: Id<"organizations">;
  userId: Id<"users">;
}
```

### Analytics

#### `getChatStats`
**Type:** Query  
**Description:** Get chat statistics for a user

**Parameters:**
```typescript
{
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  days?: number; // Default: 30
}
```

**Response:**
```typescript
{
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  uniqueSessions: number;
  period: number;
  averageMessagesPerSession: number;
}
```

## Text Enhancement API

### `enhanceText`
**Type:** Action  
**Description:** Enhance text using AI for professional financial communications

**Parameters:**
```typescript
{
  text: string;
  enhancementType: 'email' | 'document' | 'summary' | 'analysis' | 'presentation';
  context?: {
    organizationId?: Id<"organizations">;
    userId?: Id<"users">;
    financialData?: any;
    audience?: string;
    tone?: 'professional' | 'casual' | 'formal' | 'persuasive';
    purpose?: string;
  };
}
```

**Response:**
```typescript
{
  originalText: string;
  enhancedText: string;
  enhancementType: string;
  suggestions: string[];
  wordCount: {
    original: number;
    enhanced: number;
  };
  enhancedAt: number;
}
```

### `generateFinancialReport`
**Type:** Action  
**Description:** Generate comprehensive financial reports

**Parameters:**
```typescript
{
  organizationId: Id<"organizations">;
  reportType: 'executive_summary' | 'board_presentation' | 'investor_update' | 'monthly_report' | 'quarterly_review';
  dateRange: {
    start: number;
    end: number;
  };
  includeMetrics: string[];
  audience?: string;
  customPrompt?: string;
}
```

## Integration Examples

### React Hook Integration

```typescript
import { useChat } from './hooks/useChat';

function ChatInterface() {
  const {
    messages,
    sendMessage,
    isLoading,
    error,
    sessionId,
    startNewSession,
  } = useChat({
    organizationId: 'org123',
    userId: 'user456',
  });

  const handleSend = async (content: string) => {
    try {
      const response = await sendMessage(content);
      console.log('AI Response:', response);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <ChatbotUI 
      messages={messages}
      onSendMessage={handleSend}
      isLoading={isLoading}
      error={error}
    />
  );
}
```

### Direct Convex Integration

```typescript
import { ConvexReactClient } from 'convex/react';
import { api } from './convex/_generated/api';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

// Send a message
const sendMessage = async () => {
  const result = await convex.action(api.chatActions.sendChatMessage, {
    organizationId: 'org123',
    userId: 'user456',
    sessionId: 'session789',
    content: 'Analyze my cash flow for the last month',
  });
  
  console.log('Analysis:', result.response);
};

// Get chat history
const getChatHistory = async () => {
  const messages = await convex.query(api.chatActions.getChatMessages, {
    sessionId: 'session789',
    organizationId: 'org123',
    limit: 50,
  });
  
  return messages;
};
```

## Error Handling

### Common Error Codes

- **`AGENT_NOT_FOUND`** - No suitable agent found for the request
- **`INVALID_SESSION`** - Session ID is invalid or expired  
- **`RATE_LIMIT_EXCEEDED`** - Too many requests in a short period
- **`INVALID_ORGANIZATION`** - Organization not found or access denied
- **`ANALYSIS_FAILED`** - AI analysis engine encountered an error

### Error Response Format

```typescript
{
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### Handling Errors in React

```typescript
const { error, clearError } = useChat();

useEffect(() => {
  if (error) {
    console.error('Chat error:', error);
    // Show user-friendly error message
    showNotification(`Error: ${error}`, 'error');
    
    // Clear error after showing
    setTimeout(() => clearError(), 5000);
  }
}, [error, clearError]);
```

## Performance Optimization

### Query Optimization

1. **Limit Message History**: Use `limit` parameter to avoid loading excessive chat history
2. **Pagination**: Use `offset` for pagination in large chat sessions
3. **Session Management**: Clean up old sessions regularly using `deleteChatSession`

### Real-time Updates

The chat system uses Convex's real-time subscriptions for instant message updates:

```typescript
// Messages automatically update when new messages arrive
const messages = useQuery(api.chatActions.getChatMessages, {
  sessionId: currentSessionId,
  organizationId: orgId,
});
```

### Caching Strategy

- Chat messages are cached automatically by Convex
- Agent responses include execution metadata for performance monitoring
- Session data is optimized for quick retrieval

## Security Considerations

### Authentication

All API calls require proper user authentication through Convex's authentication system.

### Data Privacy

- Chat messages are scoped to organization and user
- Financial data is encrypted in transit and at rest
- User sessions are isolated and secure

### Rate Limiting

- 100 messages per minute per user
- 10 agent executions per minute per organization
- Bulk operations limited to 1000 records

## Monitoring and Analytics

### Built-in Metrics

- Message volume and response times
- Agent execution success rates
- User engagement statistics
- Error rates and types

### Custom Analytics

Use the `getChatStats` endpoint to build custom analytics:

```typescript
const stats = await convex.query(api.chatActions.getChatStats, {
  organizationId: 'org123',
  userId: 'user456',
  days: 7, // Last week
});

console.log(`User sent ${stats.userMessages} messages this week`);
```

## Troubleshooting

### Common Issues

1. **Messages Not Appearing**: Check session ID consistency
2. **Slow Responses**: Monitor agent execution times and optimize queries
3. **Connection Issues**: Verify Convex URL and authentication
4. **Missing Context**: Ensure proper organization and user IDs

### Debug Mode

Enable debug logging for development:

```typescript
const convex = new ConvexReactClient(url, {
  verbose: process.env.NODE_ENV === 'development',
});
```

## Migration Guide

When upgrading to new API versions:

1. Check breaking changes in release notes
2. Update TypeScript types
3. Test message compatibility
4. Update error handling logic
5. Verify agent configurations

## Support

For additional support:
- API Documentation: `/docs/api/`
- Component Docs: `/docs/components/`
- Integration Guide: `/docs/integration/`
- Troubleshooting: `/docs/troubleshooting/`