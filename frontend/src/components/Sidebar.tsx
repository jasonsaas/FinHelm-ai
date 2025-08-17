import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import classNames from 'classnames';
import { format } from 'date-fns';
import {
  PlusIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  DocumentTextIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface ChatSession {
  id: string;
  session_id: string;
  title: string;
  created_at: string;
  updated_at?: string;
  messages?: any[];
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  chatSessions: ChatSession[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
  loading?: boolean;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  chatSessions,
  currentSessionId,
  onSessionSelect,
  onNewChat,
  loading = false,
  className
}) => {
  const groupSessionsByDate = (sessions: ChatSession[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groups = {
      today: [] as ChatSession[],
      yesterday: [] as ChatSession[],
      lastWeek: [] as ChatSession[],
      older: [] as ChatSession[],
    };

    sessions.forEach((session) => {
      const sessionDate = new Date(session.updated_at || session.created_at);
      const sessionDay = new Date(
        sessionDate.getFullYear(),
        sessionDate.getMonth(),
        sessionDate.getDate()
      );

      if (sessionDay.getTime() === today.getTime()) {
        groups.today.push(session);
      } else if (sessionDay.getTime() === yesterday.getTime()) {
        groups.yesterday.push(session);
      } else if (sessionDay.getTime() >= lastWeek.getTime()) {
        groups.lastWeek.push(session);
      } else {
        groups.older.push(session);
      }
    });

    return groups;
  };

  const sessionGroups = groupSessionsByDate(chatSessions || []);

  const SessionGroup: React.FC<{
    title: string;
    sessions: ChatSession[];
    showIcon?: boolean;
  }> = ({ title, sessions, showIcon = false }) => {
    if (sessions.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3 flex items-center">
          {showIcon && <ClockIcon className="w-3 h-3 mr-2" />}
          {title}
        </h3>
        <div className="space-y-1">
          {sessions.map((session) => (
            <motion.button
              key={session.session_id}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSessionSelect(session.session_id)}
              className={classNames(
                'w-full text-left px-3 py-2 rounded-lg transition-all duration-200 group',
                currentSessionId === session.session_id
                  ? 'bg-blue-100 text-blue-900 border-l-4 border-blue-500'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className={classNames(
                    'w-2 h-2 rounded-full',
                    currentSessionId === session.session_id
                      ? 'bg-blue-500'
                      : 'bg-gray-300 group-hover:bg-gray-400'
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {session.title || 'New Chat'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {format(new Date(session.updated_at || session.created_at), 'MMM d, HH:mm')}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={classNames(
        'hidden lg:flex lg:flex-shrink-0',
        className
      )}>
        <div className="flex flex-col w-80">
          <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
            {/* Sidebar Header */}
            <div className="flex-shrink-0 px-4 py-6 border-b border-gray-200">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onNewChat}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                New Chat
              </motion.button>
            </div>

            {/* Chat Sessions */}
            <div className="flex-1 overflow-y-auto py-4">
              {loading ? (
                <div className="px-4 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                    </div>
                  ))}
                </div>
              ) : chatSessions.length === 0 ? (
                <div className="px-4 text-center py-8">
                  <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm mb-2">No chat sessions yet</p>
                  <p className="text-gray-400 text-xs">Start a conversation to see your history</p>
                </div>
              ) : (
                <>
                  <SessionGroup title="Today" sessions={sessionGroups.today} />
                  <SessionGroup title="Yesterday" sessions={sessionGroups.yesterday} />
                  <SessionGroup title="Last 7 days" sessions={sessionGroups.lastWeek} />
                  <SessionGroup title="Older" sessions={sessionGroups.older} showIcon />
                </>
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <SparklesIcon className="w-5 h-5 text-blue-600" />
                  <h4 className="text-sm font-medium text-gray-900">Pro Tip</h4>
                </div>
                <p className="text-xs text-gray-600">
                  Try asking about your cash flow, customer trends, or expense patterns for detailed insights.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="lg:hidden fixed inset-y-0 left-0 z-20 w-80 bg-white border-r border-gray-200 shadow-lg"
          >
            <div className="flex flex-col h-full">
              {/* Mobile Header */}
              <div className="flex-shrink-0 px-4 py-6 border-b border-gray-200">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onNewChat}
                  className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  New Chat
                </motion.button>
              </div>

              {/* Mobile Chat Sessions */}
              <div className="flex-1 overflow-y-auto py-4">
                {loading ? (
                  <div className="px-4 space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                      </div>
                    ))}
                  </div>
                ) : chatSessions.length === 0 ? (
                  <div className="px-4 text-center py-8">
                    <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm mb-2">No chat sessions yet</p>
                    <p className="text-gray-400 text-xs">Start a conversation to see your history</p>
                  </div>
                ) : (
                  <>
                    <SessionGroup title="Today" sessions={sessionGroups.today} />
                    <SessionGroup title="Yesterday" sessions={sessionGroups.yesterday} />
                    <SessionGroup title="Last 7 days" sessions={sessionGroups.lastWeek} />
                    <SessionGroup title="Older" sessions={sessionGroups.older} showIcon />
                  </>
                )}
              </div>

              {/* Mobile Footer */}
              <div className="flex-shrink-0 p-4 border-t border-gray-200">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <SparklesIcon className="w-5 h-5 text-blue-600" />
                    <h4 className="text-sm font-medium text-gray-900">Pro Tip</h4>
                  </div>
                  <p className="text-xs text-gray-600">
                    Try asking about your cash flow, customer trends, or expense patterns for detailed insights.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;