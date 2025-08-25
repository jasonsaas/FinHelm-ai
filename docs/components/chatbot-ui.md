# ChatbotUI Component Documentation

## Overview

The `ChatbotUI` component is a comprehensive conversational interface for FinHelm.ai's financial intelligence platform. It provides real-time chat capabilities with AI-powered financial analysis, segmented response display, and integrated Convex backend.

## Features

- 🤖 **AI-Powered Conversations**: Intelligent financial analysis using Grok integration
- 📊 **Segmented Responses**: Organized display with Summary, Data Overview, Patterns, and Actions
- ⚡ **Real-time Updates**: Live chat updates through Convex subscriptions
- 💬 **Multi-turn Conversations**: Context-aware dialogue with conversation history
- 🎯 **Financial Context**: Grounded responses using actual financial data
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🔄 **Loading States**: Clear feedback during AI processing
- ❌ **Error Handling**: Graceful error states and recovery

## Installation

```bash
npm install convex clsx lucide-react
```

## Basic Usage

```tsx
import React from 'react';
import { ChatbotUI } from './components/chatbot-ui';

function App() {
  return (
    <div className="h-screen">
      <ChatbotUI 
        organizationId="your-org-id"
        userId="your-user-id"
        className="h-full"
      />
    </div>
  );
}
```

## Props

### `ChatbotUIProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string?` | `undefined` | Additional CSS classes |
| `onSendMessage` | `(message: string) => Promise<AgentResponse>?` | `undefined` | Custom message handler (overrides Convex integration) |
| `organizationId` | `Id<"organizations">?` | `"demo-org"` | Organization identifier for data scoping |
| `userId` | `Id<"users">?` | `"demo-user"` | User identifier for personalization |
| `defaultAgentId` | `Id<"agents">?` | `undefined` | Specific agent to use for analysis |
| `sessionId` | `string?` | Auto-generated | Chat session identifier |

## Integration with Convex

### Setup ConvexProvider

```tsx
import { ConvexProvider, ConvexReactClient } from 'convex/react';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

function App() {
  return (
    <ConvexProvider client={convex}>
      <ChatbotUI 
        organizationId="org_123"
        userId="user_456"
      />
    </ConvexProvider>
  );
}
```

### Custom Hook Integration

```tsx
import { useChat } from '../hooks/useChat';

function CustomChatInterface() {
  const {
    messages,
    sendMessage,
    isLoading,
    error,
    sessionId,
    startNewSession,
  } = useChat({
    organizationId: 'org_123',
    userId: 'user_456',
  });

  return (
    <ChatbotUI 
      organizationId="org_123"
      userId="user_456"
      sessionId={sessionId}
    />
  );
}
```

## Segmented Response Display

The component displays AI responses in four organized segments:

### 1. Summary Tab
- Executive summary of the analysis
- Key insights and highlights
- Quick overview metrics

### 2. Data Overview Tab
- Key financial metrics with trend indicators
- Data range and record counts
- Visual indicators for performance changes

### 3. Patterns Tab
- Identified trends and patterns
- Confidence levels and impact ratings
- Detailed pattern descriptions

### 4. Actions Tab
- Recommended actions and next steps
- Priority levels and automation flags
- Due dates and assignee information

## Customization

### Styling

The component uses Tailwind CSS classes and can be customized:

```tsx
<ChatbotUI 
  className="custom-chatbot-styles"
  // Component automatically inherits your Tailwind theme
/>
```

### Custom Message Handler

Override the default Convex integration:

```tsx
const customMessageHandler = async (message: string): Promise<AgentResponse> => {
  // Your custom AI integration
  const response = await yourAIService.analyze(message);
  return {
    summary: response.summary,
    dataOverview: response.data,
    patterns: response.patterns,
    actions: response.actions,
  };
};

<ChatbotUI 
  onSendMessage={customMessageHandler}
/>
```

## TypeScript Interfaces

### ChatMessage

```typescript
interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  response?: AgentResponse;
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
    assignee?: string;
  }>;
}
```

## State Management

### Internal State

The component manages:
- Input text state
- Active segment tab
- Message history (via useChat hook)
- Loading and error states

### External State Integration

```tsx
function StatefulChatbot() {
  const [activeSession, setActiveSession] = useState<string>();
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const handleNewMessage = async (message: string) => {
    // Custom state updates
    setChatHistory(prev => [...prev, {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date(),
    }]);
  };

  return (
    <ChatbotUI 
      sessionId={activeSession}
      onSendMessage={handleNewMessage}
    />
  );
}
```

## Event Handling

### Keyboard Navigation

- **Enter**: Send message
- **Shift + Enter**: New line (in message input)
- **Tab**: Navigate between segments

### Mouse Interactions

- Click segment tabs to switch views
- Click send button or press Enter to submit
- Scroll through message history

## Accessibility

The component implements WCAG 2.1 AA standards:

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- High contrast color support
- Focus management

```tsx
// Accessibility features are built-in
<ChatbotUI 
  // Automatically includes proper ARIA attributes
  // Supports keyboard navigation
  // Compatible with screen readers
/>
```

## Performance Optimization

### Message Virtualization

For large chat histories:

```tsx
// The component automatically handles large message lists
// No additional configuration needed for performance
```

### Lazy Loading

Messages are loaded incrementally:

```typescript
const { messages } = useChat({
  // Automatically manages message pagination
  // Loads more messages as user scrolls
});
```

## Error States

### Network Errors

```tsx
// Component automatically displays network errors
// Provides retry functionality
// Graceful degradation when offline
```

### Validation Errors

```tsx
// Input validation is built-in
// Empty messages are prevented
// Provides user feedback for invalid inputs
```

## Testing

### Unit Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatbotUI } from './chatbot-ui';

test('renders chatbot interface', () => {
  render(<ChatbotUI />);
  expect(screen.getByText('FinHelm AI Assistant')).toBeInTheDocument();
});

test('sends message on button click', async () => {
  const mockSendMessage = jest.fn();
  render(<ChatbotUI onSendMessage={mockSendMessage} />);
  
  const input = screen.getByPlaceholderText('Ask about your financial data...');
  const button = screen.getByRole('button');
  
  fireEvent.change(input, { target: { value: 'Test message' } });
  fireEvent.click(button);
  
  expect(mockSendMessage).toHaveBeenCalledWith('Test message');
});
```

### Integration Tests

```typescript
// Test with Convex provider
const TestWrapper = ({ children }) => (
  <ConvexProvider client={testConvex}>
    {children}
  </ConvexProvider>
);

test('integrates with Convex backend', () => {
  render(<ChatbotUI />, { wrapper: TestWrapper });
  // Test real-time message updates
});
```

## Examples

### Basic Financial Analysis

```tsx
function BasicFinancialChat() {
  return (
    <div className="h-screen bg-gray-50">
      <ChatbotUI 
        organizationId="acme-corp"
        userId="john-doe"
        className="h-full"
      />
    </div>
  );
}
```

### Advanced Configuration

```tsx
function AdvancedChatbot() {
  const [currentAgent, setCurrentAgent] = useState('agent_financial');
  
  const handleAgentChange = (agentId: string) => {
    setCurrentAgent(agentId);
  };

  return (
    <div className="flex h-screen">
      <AgentSelector 
        onAgentChange={handleAgentChange}
        currentAgent={currentAgent}
      />
      <ChatbotUI 
        organizationId="enterprise-client"
        userId="financial-analyst"
        defaultAgentId={currentAgent}
        className="flex-1"
      />
    </div>
  );
}
```

### Multi-session Management

```tsx
function MultiSessionChat() {
  const [sessions, setSessions] = useState<string[]>([]);
  const [activeSession, setActiveSession] = useState<string>();

  const createNewSession = () => {
    const newSession = `session-${Date.now()}`;
    setSessions(prev => [...prev, newSession]);
    setActiveSession(newSession);
  };

  return (
    <div className="flex h-screen">
      <SessionSidebar 
        sessions={sessions}
        activeSession={activeSession}
        onSessionSelect={setActiveSession}
        onNewSession={createNewSession}
      />
      <ChatbotUI 
        sessionId={activeSession}
        organizationId="multi-session-org"
        userId="power-user"
        className="flex-1"
      />
    </div>
  );
}
```

## Migration Guide

### From Version 1.x to 2.x

1. Update prop names:
```tsx
// Old
<ChatbotUI orgId="123" />

// New  
<ChatbotUI organizationId="123" />
```

2. Update response interfaces:
```typescript
// Old
interface Response {
  text: string;
  data: any;
}

// New
interface AgentResponse {
  summary: string;
  dataOverview: DataOverview;
  patterns: Pattern[];
  actions: Action[];
}
```

## Troubleshooting

### Common Issues

1. **Messages not updating**: Ensure ConvexProvider is properly configured
2. **Styling issues**: Check Tailwind CSS installation and configuration
3. **TypeScript errors**: Update to latest type definitions

### Debug Mode

```tsx
// Enable debug logging
<ChatbotUI 
  organizationId="debug-org"
  userId="debug-user"
  // Add data-debug attribute for development
  data-debug={process.env.NODE_ENV === 'development'}
/>
```

## Browser Support

- Chrome 90+
- Firefox 88+  
- Safari 14+
- Edge 90+

## Dependencies

- React 18.2+
- Convex 1.26+
- Tailwind CSS 3.3+
- Lucide React 0.292+
- clsx 2.0+

## Contributing

To contribute to the ChatbotUI component:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Update documentation
5. Submit a pull request

## License

MIT License - see LICENSE file for details