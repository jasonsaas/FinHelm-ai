# FinHelm.ai Chatbot UI

A sophisticated conversational AI interface for financial intelligence and analysis, built with React, Convex, and Grok integration.

## 🚀 Features

### 🤖 AI-Powered Financial Analysis
- **Conversational Interface**: Natural language queries for financial insights
- **Multi-turn Conversations**: Context-aware dialogue with conversation history
- **Grok Integration**: Advanced AI analysis using xAI's Grok for financial intelligence

### 📊 Segmented Response Display
- **Summary Tab**: Executive overview and key insights
- **Data Overview**: Financial metrics with trend indicators
- **Patterns Tab**: Identified trends with confidence levels
- **Actions Tab**: Recommended actions with priority levels

### ⚡ Real-time Capabilities
- **Live Updates**: Real-time chat using Convex subscriptions
- **Instant Sync**: Messages sync across devices and sessions
- **Connection Recovery**: Automatic reconnection handling

### 💼 Enterprise-Ready
- **Multi-tenant Support**: Organization-scoped data and conversations
- **User Management**: Role-based access and personalization
- **Financial Data Integration**: Connected to accounts, transactions, and analytics

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ChatbotUI     │───▶│   Convex API    │───▶│   Grok AI       │
│   React Component│    │   Backend       │    │   Analysis      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   useChat Hook  │    │   Financial     │    │   Text          │
│   State Mgmt    │    │   Data Store    │    │   Enhancement   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📦 Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Convex account
- Grok API key (optional, includes fallback)

### Setup

1. **Install Dependencies**
   ```bash
   # Frontend dependencies
   cd frontend && npm install
   
   # Install Convex CLI globally
   npm install -g convex
   ```

2. **Configure Convex**
   ```bash
   # Initialize Convex (if not already done)
   npx convex dev
   
   # Set up environment variables
   echo "VITE_CONVEX_URL=your_convex_url" > frontend/.env.local
   ```

3. **Optional: Configure Grok**
   ```bash
   # Add Grok API key for enhanced AI features
   echo "GROK_API_KEY=your_grok_api_key" >> frontend/.env.local
   ```

## 🎯 Quick Start

### Basic Usage

```tsx
import React from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ChatbotUI } from './components/chatbot-ui';

const convex = new ConvexReactClient(process.env.VITE_CONVEX_URL);

function App() {
  return (
    <ConvexProvider client={convex}>
      <div className="h-screen">
        <ChatbotUI 
          organizationId="your-org-id"
          userId="your-user-id"
          className="h-full"
        />
      </div>
    </ConvexProvider>
  );
}

export default App;
```

### Using the Chat Hook

```tsx
import { useChat } from './hooks/useChat';

function CustomChatInterface() {
  const {
    messages,
    sendMessage,
    isLoading,
    error,
    sessionId,
    startNewSession,
  } = useChat({
    organizationId: 'acme-corp',
    userId: 'john-doe',
  });

  const handleSendMessage = async (content: string) => {
    try {
      const response = await sendMessage(content);
      console.log('AI Analysis:', response);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div>
      {/* Your custom UI */}
      <MessageList messages={messages} />
      <MessageInput onSend={handleSendMessage} disabled={isLoading} />
      {error && <ErrorMessage error={error} />}
    </div>
  );
}
```

## 🛠️ Development

### Project Structure

```
├── frontend/src/
│   ├── components/
│   │   ├── chatbot-ui.tsx         # Main chat component
│   │   ├── TextEnhancer.tsx       # Text enhancement UI
│   │   └── Layout.tsx             # App layout
│   ├── hooks/
│   │   └── useChat.ts             # Chat state management
│   ├── lib/
│   │   └── grok-client.ts         # Grok API integration
│   └── pages/
│       ├── ChatbotPage.tsx        # Chat page component
│       └── ...
├── convex/
│   ├── chatActions.ts             # Chat-related actions
│   ├── agentActions.ts            # AI agent management
│   ├── textEnhancementActions.ts  # Text enhancement
│   └── schema.ts                  # Database schema
└── docs/
    ├── api/                       # API documentation
    ├── components/                # Component docs
    └── ...
```

### Running Locally

1. **Start Convex Development Server**
   ```bash
   npx convex dev
   ```

2. **Start Frontend Development Server**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Visit the Application**
   ```
   http://localhost:5173
   ```

### Running Tests

```bash
# Unit tests
cd frontend && npm test

# Integration tests  
cd convex && npm test

# E2E tests
npm run test:e2e
```

## 📖 API Reference

### Core Components

#### `<ChatbotUI />`

Main chat interface component with full functionality.

```tsx
<ChatbotUI 
  organizationId="org_123"
  userId="user_456"
  sessionId="session_789"
  defaultAgentId="agent_financial"
  className="h-full"
  onSendMessage={customHandler}
/>
```

#### `useChat()` Hook

React hook for chat state management and Convex integration.

```tsx
const {
  messages,           // ChatMessage[]
  sendMessage,        // (content: string) => Promise<AgentResponse>
  isLoading,          // boolean
  error,              // string | null
  clearError,         // () => void
  sessionId,          // string
  startNewSession,    // () => string
  stats,              // ChatStats | null
  hasDefaultAgent,    // boolean
} = useChat(config);
```

### Convex Actions

#### Chat Management

- `api.chatActions.sendChatMessage` - Send message and get AI response
- `api.chatActions.getChatMessages` - Retrieve chat history
- `api.chatActions.getChatSessions` - Get user's chat sessions
- `api.chatActions.deleteChatSession` - Delete chat session

#### Agent Management  

- `api.agentActions.getAgentInsights` - Get AI financial insights
- `api.chatActions.getDefaultAgent` - Get default financial agent
- `api.chatActions.createDefaultAgent` - Create default agent

#### Text Enhancement

- `api.textEnhancementActions.enhanceText` - Enhance text with AI
- `api.textEnhancementActions.generateFinancialReport` - Generate reports

## 🎨 Customization

### Theming

The component uses Tailwind CSS and respects your theme configuration:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          600: '#2563eb',
          // ... your brand colors
        },
      },
    },
  },
};
```

### Custom Styling

```tsx
<ChatbotUI 
  className="custom-chat-theme"
  // Add your custom CSS classes
/>
```

```css
.custom-chat-theme {
  @apply bg-gradient-to-br from-blue-50 to-indigo-50;
}

.custom-chat-theme .message-bubble {
  @apply shadow-lg border-l-4 border-blue-500;
}
```

### Custom AI Integration

Replace the default Grok integration:

```tsx
const customAIHandler = async (message: string): Promise<AgentResponse> => {
  const response = await yourAIService.analyze(message);
  
  return {
    summary: response.summary,
    dataOverview: {
      totalRecords: response.recordCount,
      dateRange: response.period,
      keyMetrics: response.metrics,
    },
    patterns: response.patterns,
    actions: response.recommendations,
  };
};

<ChatbotUI onSendMessage={customAIHandler} />
```

## 🔒 Security

### Authentication

All chat operations require proper user authentication:

```tsx
// Ensure user is authenticated before rendering
const { user } = useAuth();

if (!user) {
  return <LoginPage />;
}

return (
  <ChatbotUI 
    userId={user.id}
    organizationId={user.organizationId}
  />
);
```

### Data Privacy

- All chat messages are scoped to organization and user
- Financial data is encrypted in transit and at rest
- Session data is automatically cleaned up

### Rate Limiting

- 100 messages per minute per user
- 10 AI analysis requests per minute per organization
- Automatic backoff and retry logic

## 📊 Analytics & Monitoring

### Built-in Analytics

```tsx
const { stats } = useChat();

console.log(`User activity:`, {
  totalMessages: stats?.totalMessages,
  sessionsThisWeek: stats?.uniqueSessions,
  averageSession: stats?.averageMessagesPerSession,
});
```

### Custom Metrics

```typescript
// Track custom events
const trackChatEvent = (event: string, data: any) => {
  analytics.track('chat_' + event, {
    userId: userId,
    organizationId: organizationId,
    ...data,
  });
};

// Usage
trackChatEvent('message_sent', { content: message });
trackChatEvent('insight_viewed', { segmentType: 'patterns' });
```

## 🧪 Testing

### Unit Tests

```typescript
// Component testing
import { render, screen } from '@testing-library/react';
import { ChatbotUI } from './chatbot-ui';

test('renders chat interface', () => {
  render(<ChatbotUI />);
  expect(screen.getByText('FinHelm AI Assistant')).toBeInTheDocument();
});
```

### Integration Tests

```typescript
// Convex integration testing
import { ConvexTestingHelper } from 'convex/testing';
import schema from '../convex/schema';

const t = new ConvexTestingHelper(schema);

test('sends chat message', async () => {
  const result = await t.action(api.chatActions.sendChatMessage, {
    organizationId: 'test-org',
    userId: 'test-user', 
    sessionId: 'test-session',
    content: 'Test message',
  });
  
  expect(result.response.summary).toBeDefined();
});
```

### E2E Tests

```typescript
// Cypress E2E testing
describe('Chatbot Interface', () => {
  it('completes full conversation flow', () => {
    cy.visit('/chat');
    cy.get('[data-testid="message-input"]').type('What is my revenue?');
    cy.get('[data-testid="send-button"]').click();
    cy.get('[data-testid="ai-response"]').should('be.visible');
    cy.get('[data-testid="segment-data"]').click();
    cy.get('[data-testid="revenue-metric"]').should('contain', '$');
  });
});
```

## 🚀 Deployment

### Environment Variables

```bash
# Frontend (.env.local)
VITE_CONVEX_URL=https://your-convex-deployment.convex.cloud
VITE_APP_ENV=production

# Backend (Convex environment)
GROK_API_KEY=your-grok-api-key
OPENAI_API_KEY=fallback-ai-key
```

### Build Commands

```bash
# Build frontend
cd frontend && npm run build

# Deploy Convex functions  
npx convex deploy

# Deploy frontend (example with Vercel)
npm run deploy
```

### Performance Optimization

1. **Message Virtualization**: Automatic for large chat histories
2. **Code Splitting**: Components are lazy-loaded  
3. **CDN Optimization**: Static assets served via CDN
4. **Database Indexing**: Optimized queries for chat retrieval

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/finhelm-ai`
3. Install dependencies: `npm install`
4. Set up environment variables
5. Start development: `npm run dev`

### Contribution Guidelines

- Follow TypeScript best practices
- Add tests for new features
- Update documentation
- Use conventional commit messages
- Ensure all tests pass

### Code Style

```bash
# Format code
npm run format

# Lint code
npm run lint

# Type check
npm run type-check
```

## 📚 Documentation

- [API Documentation](./docs/api/chatbot-api.md)
- [Component Documentation](./docs/components/chatbot-ui.md)
- [Integration Guide](./docs/integration/getting-started.md)
- [Deployment Guide](./docs/deployment/production.md)

## 🐛 Troubleshooting

### Common Issues

1. **Convex Connection Issues**
   ```bash
   # Check Convex status
   npx convex status
   
   # Restart development server
   npx convex dev --clear
   ```

2. **Missing Environment Variables**
   ```bash
   # Verify environment setup
   npm run check-env
   ```

3. **TypeScript Errors**
   ```bash
   # Regenerate Convex types
   npx convex dev
   
   # Check TypeScript config
   npx tsc --noEmit
   ```

### Debug Mode

```tsx
// Enable debug logging
<ChatbotUI 
  organizationId="debug-org"
  userId="debug-user"
  // Component logs additional info in development
/>
```

## 📈 Roadmap

### Upcoming Features

- [ ] Voice-to-text message input
- [ ] Rich text formatting in responses  
- [ ] File upload and analysis
- [ ] Custom agent creation UI
- [ ] Advanced analytics dashboard
- [ ] Mobile app integration
- [ ] Multilingual support

### Performance Improvements

- [ ] WebSocket optimization
- [ ] Response streaming
- [ ] Offline mode support
- [ ] Enhanced caching strategies

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Convex](https://convex.dev) for real-time backend infrastructure
- [xAI Grok](https://grok.x.ai) for advanced AI capabilities
- [Tailwind CSS](https://tailwindcss.com) for styling system
- [Lucide](https://lucide.dev) for beautiful icons
- [React](https://reactjs.org) for the UI framework

## 📞 Support

- 📧 Email: support@finhelm.ai
- 💬 Discord: [FinHelm Community](https://discord.gg/finhelm)
- 📖 Docs: [docs.finhelm.ai](https://docs.finhelm.ai)
- 🐛 Issues: [GitHub Issues](https://github.com/jasonsaas/finhelm-ai/issues)

---

**Built with ❤️ by the FinHelm.ai team**