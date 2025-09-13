import React from 'react';
import { Activity, User, Globe, Clock, Shield, Download, Database, LogIn } from 'lucide-react';

export type AuditActionType = 'DATA_ACCESS' | 'EXPORT_REQUEST' | 'QB_SYNC' | 'LOGIN' | 'LOGOUT' | 'SETTINGS_CHANGE' | 'ACCOUNT_DELETE' | 'QB_DISCONNECT';

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  action: AuditActionType;
  user: string;
  description: string;
  ipAddress: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

interface AuditLogEntryProps {
  entry: AuditLogEntry;
  showDetails?: boolean;
  onToggleDetails?: () => void;
}

const actionConfig: Record<AuditActionType, { 
  icon: React.ElementType; 
  color: string; 
  label: string;
  severity: 'low' | 'medium' | 'high';
}> = {
  DATA_ACCESS: { 
    icon: Database, 
    color: 'text-blue-600 bg-blue-50', 
    label: 'Data Access',
    severity: 'low'
  },
  EXPORT_REQUEST: { 
    icon: Download, 
    color: 'text-green-600 bg-green-50', 
    label: 'Export Request',
    severity: 'medium'
  },
  QB_SYNC: { 
    icon: Activity, 
    color: 'text-purple-600 bg-purple-50', 
    label: 'QuickBooks Sync',
    severity: 'low'
  },
  LOGIN: { 
    icon: LogIn, 
    color: 'text-gray-600 bg-gray-50', 
    label: 'Login',
    severity: 'low'
  },
  LOGOUT: { 
    icon: LogIn, 
    color: 'text-gray-600 bg-gray-50', 
    label: 'Logout',
    severity: 'low'
  },
  SETTINGS_CHANGE: { 
    icon: Shield, 
    color: 'text-yellow-600 bg-yellow-50', 
    label: 'Settings Change',
    severity: 'medium'
  },
  ACCOUNT_DELETE: { 
    icon: User, 
    color: 'text-red-600 bg-red-50', 
    label: 'Account Action',
    severity: 'high'
  },
  QB_DISCONNECT: { 
    icon: Database, 
    color: 'text-orange-600 bg-orange-50', 
    label: 'QB Disconnect',
    severity: 'high'
  }
};

export function AuditLogEntry({ entry, showDetails = false, onToggleDetails }: AuditLogEntryProps) {
  const config = actionConfig[entry.action] || actionConfig.DATA_ACCESS;
  const Icon = config.icon;

  const formatRelativeTime = (timestamp: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return timestamp.toLocaleDateString();
  };

  const getSeverityIndicator = (severity: string) => {
    const colors = {
      low: 'border-l-blue-400',
      medium: 'border-l-yellow-400',
      high: 'border-l-red-400'
    };
    return colors[severity as keyof typeof colors] || colors.low;
  };

  return (
    <div className={`border rounded-lg hover:bg-sage-light transition-colors border-l-4 ${getSeverityIndicator(config.severity)}`}>
      <div 
        className={`p-4 ${onToggleDetails ? 'cursor-pointer' : ''}`}
        onClick={onToggleDetails}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded ${config.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-medium text-sage-dark">{entry.description}</h4>
              <div className="flex items-center gap-2 text-sage-gray text-sm mt-1">
                <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                  {config.label}
                </span>
                <span>•</span>
                <span>{formatRelativeTime(entry.timestamp)}</span>
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-sage-gray">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {entry.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-3 h-3 text-sage-gray" />
            <span className="text-sage-gray">User:</span>
            <span className="text-sage-dark font-medium">{entry.user}</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-3 h-3 text-sage-gray" />
            <span className="text-sage-gray">IP:</span>
            <span className="text-sage-dark font-mono text-xs">{entry.ipAddress}</span>
          </div>
        </div>

        {showDetails && entry.metadata && (
          <div className="mt-4 pt-4 border-t bg-gray-50 -mx-4 px-4 pb-2">
            <h5 className="font-medium text-sage-dark mb-2 text-sm">Additional Details</h5>
            <div className="space-y-2">
              {Object.entries(entry.metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-sage-gray capitalize">{key.replace('_', ' ')}:</span>
                  <span className="text-sage-dark font-mono text-xs">{String(value)}</span>
                </div>
              ))}
              {entry.userAgent && (
                <div className="text-xs text-sage-gray mt-2">
                  <strong>User Agent:</strong> {entry.userAgent}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface AuditLogFilterProps {
  filters: {
    action?: AuditActionType;
    dateRange?: string;
    user?: string;
  };
  onFilterChange: (filters: any) => void;
}

export function AuditLogFilter({ filters, onFilterChange }: AuditLogFilterProps) {
  const handleFilterChange = (key: string, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value === 'all' ? undefined : value
    });
  };

  return (
    <div className="grid md:grid-cols-4 gap-4 p-6 bg-white border rounded-lg">
      <div>
        <label className="block text-sm font-medium text-sage-dark mb-2">Action Type</label>
        <select 
          value={filters.action || 'all'}
          onChange={(e) => handleFilterChange('action', e.target.value)}
          className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-sage-green focus:border-sage-green"
        >
          <option value="all">All Actions</option>
          {Object.entries(actionConfig).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-sage-dark mb-2">Date Range</label>
        <select 
          value={filters.dateRange || 'last7'}
          onChange={(e) => handleFilterChange('dateRange', e.target.value)}
          className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-sage-green focus:border-sage-green"
        >
          <option value="last7">Last 7 Days</option>
          <option value="last30">Last 30 Days</option>
          <option value="last90">Last 90 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-sage-dark mb-2">User</label>
        <select 
          value={filters.user || 'all'}
          onChange={(e) => handleFilterChange('user', e.target.value)}
          className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-sage-green focus:border-sage-green"
        >
          <option value="all">All Users</option>
          <option value="current">Current User</option>
          <option value="system">System</option>
        </select>
      </div>

      <div className="flex items-end">
        <button 
          onClick={() => onFilterChange({})}
          className="btn-sage-secondary w-full"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}

export default AuditLogEntry;