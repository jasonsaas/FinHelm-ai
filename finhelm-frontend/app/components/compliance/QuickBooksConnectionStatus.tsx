'use client';

import React from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Settings, 
  Unlink, 
  Clock,
  Database,
  Building,
  Calendar,
  Activity,
  Zap
} from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';

export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'syncing' | 'expired';
export type SyncStatus = 'healthy' | 'warning' | 'error' | 'syncing';

interface ConnectionInfo {
  status: ConnectionStatus;
  companyName?: string;
  connectedSince?: Date;
  lastSync?: Date;
  syncStatus: SyncStatus;
  recordsSynced?: number;
  permissions: {
    item: string;
    granted: boolean;
  }[];
}

interface QuickBooksConnectionStatusProps {
  connectionInfo: ConnectionInfo;
  onSync?: () => void;
  onDisconnect?: () => void;
  onSettings?: () => void;
  syncInProgress?: boolean;
}

interface SyncHistoryItem {
  date: Date;
  status: 'success' | 'partial' | 'error';
  recordsProcessed: number;
  duration: string;
  details?: string;
}

interface SyncHistoryProps {
  history: SyncHistoryItem[];
  maxItems?: number;
}

const connectionStatusConfig = {
  connected: {
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: CheckCircle,
    label: 'Connected'
  },
  disconnected: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    icon: XCircle,
    label: 'Disconnected'
  },
  error: {
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    icon: AlertTriangle,
    label: 'Connection Error'
  },
  syncing: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: RefreshCw,
    label: 'Syncing'
  },
  expired: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    icon: AlertTriangle,
    label: 'Auth Expired'
  }
};

export function QuickBooksConnectionStatus({
  connectionInfo,
  onSync,
  onDisconnect,
  onSettings,
  syncInProgress = false
}: QuickBooksConnectionStatusProps) {
  const config = connectionStatusConfig[connectionInfo.status];
  const StatusIcon = config.icon;

  const formatLastSync = (date?: Date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Connection Status Overview */}
      <div className="sage-card">
        <div className="sage-card-content">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-6 h-6 text-sage-green" />
            <h2 className="text-2xl font-bold text-sage-dark">QuickBooks Connection</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Status Information */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded ${config.bgColor}`}>
                  <StatusIcon className={`w-5 h-5 ${config.color} ${connectionInfo.status === 'syncing' ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-sage-dark">
                    Status: {config.label}
                  </h3>
                  {connectionInfo.status === 'connected' && connectionInfo.companyName && (
                    <p className="text-sage-gray">{connectionInfo.companyName}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                {connectionInfo.connectedSince && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-sage-gray" />
                      <span className="text-sage-gray">Connected Since:</span>
                    </div>
                    <span className="text-sage-dark font-medium">
                      {connectionInfo.connectedSince.toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sage-gray" />
                    <span className="text-sage-gray">Last Sync:</span>
                  </div>
                  <span className="text-sage-dark">
                    {formatLastSync(connectionInfo.lastSync)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sage-gray" />
                    <span className="text-sage-gray">Sync Status:</span>
                  </div>
                  <StatusBadge status={connectionInfo.syncStatus} />
                </div>
                
                {connectionInfo.recordsSynced && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-sage-gray" />
                      <span className="text-sage-gray">Records Synced:</span>
                    </div>
                    <span className="text-sage-dark">
                      {connectionInfo.recordsSynced.toLocaleString()} transactions
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Permissions */}
            <div>
              <h3 className="text-lg font-semibold text-sage-dark mb-4">Data Access Permissions</h3>
              <div className="space-y-3">
                {connectionInfo.permissions.map((permission, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sage-gray">{permission.item}</span>
                    {permission.granted ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {connectionInfo.status === 'connected' && (
            <div className="mt-8 pt-6 border-t flex flex-wrap gap-4">
              <button 
                onClick={onSync}
                disabled={syncInProgress}
                className="btn-sage-secondary flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncInProgress ? 'animate-spin' : ''}`} />
                {syncInProgress ? 'Syncing...' : 'Sync Now'}
              </button>
              
              <button 
                onClick={onSettings}
                className="btn-sage-secondary flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Sync Settings
              </button>
              
              <button 
                onClick={onDisconnect}
                className="btn-sage-orange flex items-center gap-2"
              >
                <Unlink className="w-4 h-4" />
                Disconnect QuickBooks
              </button>
            </div>
          )}

          {connectionInfo.status === 'disconnected' && (
            <div className="mt-8 pt-6 border-t">
              <button className="btn-sage-primary flex items-center gap-2">
                <Database className="w-4 h-4" />
                Connect QuickBooks
              </button>
            </div>
          )}

          {(connectionInfo.status === 'error' || connectionInfo.status === 'expired') && (
            <div className="mt-8 pt-6 border-t">
              <div className="flex gap-4">
                <button className="btn-sage-primary flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Reconnect
                </button>
                <button className="btn-sage-secondary">
                  View Error Details
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SyncHistory({ history, maxItems = 5 }: SyncHistoryProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'partial':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-700';
      case 'partial':
        return 'bg-yellow-100 text-yellow-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="sage-card">
      <div className="sage-card-content">
        <h3 className="text-xl font-semibold text-sage-dark mb-6">Sync History</h3>
        
        <div className="space-y-4">
          {history.slice(0, maxItems).map((sync, index) => (
            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                {getStatusIcon(sync.status)}
                <div>
                  <div className="font-medium text-sage-dark">
                    {sync.date.toLocaleDateString()} at {sync.date.toLocaleTimeString()}
                  </div>
                  <div className="text-sage-gray text-sm">
                    {sync.recordsProcessed} records • {sync.duration}
                  </div>
                  {sync.details && (
                    <div className="text-sage-gray text-xs mt-1">{sync.details}</div>
                  )}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(sync.status)}`}>
                {sync.status.charAt(0).toUpperCase() + sync.status.slice(1)}
              </span>
            </div>
          ))}

          {history.length === 0 && (
            <div className="text-center py-8 text-sage-gray">
              No sync history available yet.
            </div>
          )}

          {history.length > maxItems && (
            <div className="text-center pt-4">
              <button className="btn-sage-secondary text-sm">
                View All Sync History
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuickBooksConnectionStatus;