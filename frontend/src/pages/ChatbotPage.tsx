import React from 'react';
import { ChatbotUI } from '../components/chatbot-ui';

export function ChatbotPage() {
  return (
    <div className="h-full">
      <ChatbotUI 
        className="h-full"
        organizationId="demo-org" as any
        userId="demo-user" as any
      />
    </div>
  );
}

export default ChatbotPage;