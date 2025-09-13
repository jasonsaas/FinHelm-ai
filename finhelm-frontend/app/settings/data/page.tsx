'use client';

import { Metadata } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { 
  Database, 
  Download, 
  Trash2, 
  AlertTriangle, 
  Shield, 
  Eye,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Unlink,
  RefreshCw,
  Settings,
  Lock,
  Activity,
  User,
  Building,
  CreditCard,
  HardDrive,
  CloudDownload,
  Archive,
  Zap
} from 'lucide-react';

// Since we can't export metadata from client components, we'll handle SEO differently
const pageTitle = 'Data Management - FinHelm.ai | Control Your QuickBooks Data';

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  action: string;
  user: string;
  description: string;
  ipAddress: string;
  userAgent?: string;
}

interface DataExportRequest {
  id: string;
  type: 'full' | 'financial' | 'insights' | 'audit';
  status: 'pending' | 'processing' | 'ready' | 'expired';
  requestedAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  expiresAt?: Date;
  size?: string;
}

export default function DataManagementPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [exportRequests, setExportRequests] = useState<DataExportRequest[]>([
    {
      id: '1',
      type: 'full',
      status: 'ready',
      requestedAt: new Date('2024-01-15T10:30:00'),
      completedAt: new Date('2024-01-15T10:35:00'),
      downloadUrl: '/api/exports/full-data-2024-01-15.zip',
      expiresAt: new Date('2024-01-22T10:35:00'),
      size: '15.2 MB'
    }
  ]);

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: '1',
      timestamp: new Date('2024-01-15T14:30:00'),
      action: 'DATA_ACCESS',
      user: 'john@company.com',
      description: 'Accessed QuickBooks financial data for AI analysis',
      ipAddress: '192.168.1.100'
    },
    {
      id: '2', 
      timestamp: new Date('2024-01-15T14:25:00'),
      action: 'EXPORT_REQUEST',
      user: 'john@company.com',
      description: 'Requested full data export',
      ipAddress: '192.168.1.100'
    },
    {
      id: '3',
      timestamp: new Date('2024-01-15T10:35:00'),
      action: 'QB_SYNC',
      user: 'system',
      description: 'QuickBooks data synchronization completed successfully',
      ipAddress: 'N/A'
    }
  ]);

  const handleDisconnectQuickBooks = () => {
    // Implement QuickBooks disconnection logic
    setConfirmAction(null);
    alert('QuickBooks has been disconnected successfully.');
  };

  const handleDeleteAccount = () => {
    // Implement account deletion logic
    setConfirmAction(null);
    alert('Account deletion initiated. You will receive a confirmation email.');
  };

  const handleExportData = (type: 'full' | 'financial' | 'insights' | 'audit') => {
    // Implement data export logic
    const newExport: DataExportRequest = {
      id: Date.now().toString(),
      type,
      status: 'pending',
      requestedAt: new Date()
    };
    setExportRequests([newExport, ...exportRequests]);
    alert(`${type} data export request submitted. You'll be notified when ready.`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-green-600 bg-green-50 border-green-200';
      case 'processing': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'pending': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'expired': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'DATA_ACCESS': return 'text-blue-600 bg-blue-50';
      case 'EXPORT_REQUEST': return 'text-green-600 bg-green-50';
      case 'QB_SYNC': return 'text-purple-600 bg-purple-50';
      case 'LOGIN': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-8 h-8 text-sage-green" />
            <h1 className="text-3xl font-bold text-sage-dark">Data Management</h1>
          </div>
          <p className="text-sage-gray text-lg">
            Control your data, manage QuickBooks connections, and exercise your privacy rights
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b">
          {[
            { id: 'overview', label: 'Overview', icon: Eye },
            { id: 'quickbooks', label: 'QuickBooks Connection', icon: Unlink },
            { id: 'exports', label: 'Data Exports', icon: Download },
            { id: 'audit', label: 'Audit Logs', icon: Activity },
            { id: 'account', label: 'Account Deletion', icon: Trash2 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-sage-green text-sage-green bg-green-50'
                  : 'border-transparent text-sage-gray hover:text-sage-dark hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Data Summary Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="sage-card">
                <div className="sage-card-content">
                  <div className="flex items-center gap-3 mb-3">
                    <Database className="w-6 h-6 text-blue-500" />
                    <h3 className="font-semibold text-sage-dark">QuickBooks Data</h3>
                  </div>
                  <p className="text-2xl font-bold text-sage-dark mb-1">Connected</p>
                  <p className="text-sm text-sage-gray">Last sync: 2 hours ago</p>
                </div>
              </div>

              <div className="sage-card">
                <div className="sage-card-content">
                  <div className="flex items-center gap-3 mb-3">
                    <HardDrive className="w-6 h-6 text-green-500" />
                    <h3 className="font-semibold text-sage-dark">Storage Used</h3>
                  </div>
                  <p className="text-2xl font-bold text-sage-dark mb-1">2.4 GB</p>
                  <p className="text-sm text-sage-gray">of 10 GB limit</p>
                </div>
              </div>

              <div className="sage-card">
                <div className="sage-card-content">
                  <div className="flex items-center gap-3 mb-3">
                    <Activity className="w-6 h-6 text-purple-500" />
                    <h3 className="font-semibold text-sage-dark">Data Retention</h3>
                  </div>
                  <p className="text-2xl font-bold text-sage-dark mb-1">7 Years</p>
                  <p className="text-sm text-sage-gray">Financial compliance</p>
                </div>
              </div>

              <div className="sage-card">
                <div className="sage-card-content">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="w-6 h-6 text-sage-green" />
                    <h3 className="font-semibold text-sage-dark">Encryption</h3>
                  </div>
                  <p className="text-2xl font-bold text-sage-dark mb-1">AES-256</p>
                  <p className="text-sm text-sage-gray">At rest & in transit</p>
                </div>
              </div>
            </div>

            {/* Your Rights */}
            <div className="sage-card">
              <div className="sage-card-content">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-6 h-6 text-sage-green" />
                  <h2 className="text-2xl font-bold text-sage-dark">Your Data Rights</h2>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                       onClick={() => setActiveTab('exports')}>
                    <div className="flex items-center gap-3 mb-3">
                      <Download className="w-5 h-5 text-blue-500" />
                      <h3 className="font-semibold text-sage-dark">Right to Access</h3>
                    </div>
                    <p className="text-sage-gray text-sm mb-3">
                      Download all your data in a machine-readable format
                    </p>
                    <div className="flex items-center gap-2 text-sage-green text-sm font-medium">
                      Export Data <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                       onClick={() => setActiveTab('quickbooks')}>
                    <div className="flex items-center gap-3 mb-3">
                      <Unlink className="w-5 h-5 text-yellow-500" />
                      <h3 className="font-semibold text-sage-dark">Right to Restriction</h3>
                    </div>
                    <p className="text-sage-gray text-sm mb-3">
                      Disconnect QuickBooks and stop data processing
                    </p>
                    <div className="flex items-center gap-2 text-sage-green text-sm font-medium">
                      Manage Connection <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                       onClick={() => setActiveTab('account')}>
                    <div className="flex items-center gap-3 mb-3">
                      <Trash2 className="w-5 h-5 text-red-500" />
                      <h3 className="font-semibold text-sage-dark">Right to Erasure</h3>
                    </div>
                    <p className="text-sage-gray text-sm mb-3">
                      Delete your account and all associated data
                    </p>
                    <div className="flex items-center gap-2 text-sage-green text-sm font-medium">
                      Delete Account <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="sage-card">
              <div className="sage-card-content">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-sage-dark">Recent Activity</h3>
                  <button
                    onClick={() => setActiveTab('audit')}
                    className="text-sage-green hover:text-sage-green-hover text-sm font-medium"
                  >
                    View All Logs
                  </button>
                </div>

                <div className="space-y-3">
                  {auditLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-start gap-4 p-3 border rounded-lg">
                      <div className={`p-2 rounded ${getActionColor(log.action)}`}>
                        <Activity className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sage-dark text-sm">{log.description}</h4>
                          <span className="text-xs text-sage-gray">
                            {log.timestamp.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sage-gray text-xs">
                          {log.user} • {log.ipAddress}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* QuickBooks Connection Tab */}
        {activeTab === 'quickbooks' && (
          <div className="space-y-8">
            {/* Connection Status */}
            <div className="sage-card">
              <div className="sage-card-content">
                <div className="flex items-center gap-3 mb-6">
                  <Zap className="w-6 h-6 text-sage-green" />
                  <h2 className="text-2xl font-bold text-sage-dark">QuickBooks Connection</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <h3 className="text-lg font-semibold text-sage-dark">Status: Connected</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sage-gray">Company:</span>
                        <span className="text-sage-dark font-medium">Acme Corporation</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sage-gray">Connected Since:</span>
                        <span className="text-sage-dark">January 15, 2024</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sage-gray">Last Sync:</span>
                        <span className="text-sage-dark">2 hours ago</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sage-gray">Sync Status:</span>
                        <span className="text-green-600 font-medium">Healthy</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sage-gray">Records Synced:</span>
                        <span className="text-sage-dark">12,847 transactions</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-sage-dark mb-4">Data Access Permissions</h3>
                    <div className="space-y-3">
                      {[
                        { item: 'Chart of Accounts', granted: true },
                        { item: 'Transaction History', granted: true },
                        { item: 'Customer Information', granted: true },
                        { item: 'Vendor Information', granted: true },
                        { item: 'Financial Reports', granted: true },
                        { item: 'Tax Information', granted: false },
                        { item: 'Employee Data', granted: false },
                        { item: 'Bank Account Details', granted: false }
                      ].map((permission) => (
                        <div key={permission.item} className="flex items-center justify-between">
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

                <div className="mt-8 pt-6 border-t flex gap-4">
                  <button className="btn-sage-secondary flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Sync Now
                  </button>
                  <button className="btn-sage-secondary flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Sync Settings
                  </button>
                  <button 
                    onClick={() => setConfirmAction('disconnect')}
                    className="btn-sage-orange flex items-center gap-2"
                  >
                    <Unlink className="w-4 h-4" />
                    Disconnect QuickBooks
                  </button>
                </div>
              </div>
            </div>

            {/* Sync History */}
            <div className="sage-card">
              <div className="sage-card-content">
                <h3 className="text-xl font-semibold text-sage-dark mb-6">Sync History</h3>
                
                <div className="space-y-4">
                  {[
                    { date: '2024-01-15 16:30', status: 'Success', records: '47 new', duration: '2m 15s' },
                    { date: '2024-01-15 12:30', status: 'Success', records: '23 new', duration: '1m 42s' },
                    { date: '2024-01-15 08:30', status: 'Success', records: '156 new', duration: '3m 28s' },
                    { date: '2024-01-15 04:30', status: 'Partial', records: '12 new', duration: '5m 10s' },
                    { date: '2024-01-15 00:30', status: 'Success', records: '0 new', duration: '45s' }
                  ].map((sync, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        {sync.status === 'Success' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        )}
                        <div>
                          <div className="font-medium text-sage-dark">{sync.date}</div>
                          <div className="text-sage-gray text-sm">{sync.records} • {sync.duration}</div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        sync.status === 'Success' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {sync.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Exports Tab */}
        {activeTab === 'exports' && (
          <div className="space-y-8">
            {/* Export Options */}
            <div className="sage-card">
              <div className="sage-card-content">
                <div className="flex items-center gap-3 mb-6">
                  <CloudDownload className="w-6 h-6 text-sage-green" />
                  <h2 className="text-2xl font-bold text-sage-dark">Data Export</h2>
                </div>

                <p className="text-sage-gray mb-6">
                  Export your data in machine-readable formats. All exports are encrypted and available for 7 days.
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  {[
                    {
                      type: 'full' as const,
                      title: 'Complete Data Export',
                      description: 'All your data including QuickBooks sync, AI insights, and account settings',
                      size: '~15-50 MB',
                      formats: 'JSON, CSV'
                    },
                    {
                      type: 'financial' as const,
                      title: 'Financial Data Only',
                      description: 'QuickBooks transactions, accounts, and financial reports',
                      size: '~5-20 MB',
                      formats: 'CSV, Excel'
                    },
                    {
                      type: 'insights' as const,
                      title: 'AI Insights & Reports',
                      description: 'All AI-generated insights, forecasts, and custom reports',
                      size: '~2-10 MB',
                      formats: 'PDF, JSON'
                    },
                    {
                      type: 'audit' as const,
                      title: 'Audit Logs',
                      description: 'Complete audit trail of all data access and modifications',
                      size: '~1-5 MB',
                      formats: 'JSON, CSV'
                    }
                  ].map((exportType) => (
                    <div key={exportType.type} className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                      <h3 className="font-semibold text-sage-dark mb-2">{exportType.title}</h3>
                      <p className="text-sage-gray text-sm mb-4">{exportType.description}</p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-sage-gray">Estimated Size:</span>
                          <span className="text-sage-dark">{exportType.size}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-sage-gray">Formats:</span>
                          <span className="text-sage-dark">{exportType.formats}</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleExportData(exportType.type)}
                        className="btn-sage-primary w-full flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Request Export
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Export History */}
            <div className="sage-card">
              <div className="sage-card-content">
                <h3 className="text-xl font-semibold text-sage-dark mb-6">Export History</h3>
                
                <div className="space-y-4">
                  {exportRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-50 rounded">
                          <Archive className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sage-dark capitalize">
                            {request.type.replace('-', ' ')} Export
                          </h4>
                          <p className="text-sage-gray text-sm">
                            Requested: {request.requestedAt.toLocaleDateString()}
                            {request.size && ` • ${request.size}`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                        
                        {request.status === 'ready' && request.downloadUrl && (
                          <a
                            href={request.downloadUrl}
                            className="btn-sage-primary text-sm flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                  ))}

                  {exportRequests.length === 0 && (
                    <div className="text-center py-8 text-sage-gray">
                      No export requests yet. Request an export above to get started.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audit Logs Tab */}
        {activeTab === 'audit' && (
          <div className="space-y-8">
            {/* Audit Log Filters */}
            <div className="sage-card">
              <div className="sage-card-content">
                <div className="flex items-center gap-3 mb-6">
                  <Activity className="w-6 h-6 text-sage-green" />
                  <h2 className="text-2xl font-bold text-sage-dark">Audit Logs</h2>
                </div>

                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-sage-dark mb-2">Action Type</label>
                    <select className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-sage-green focus:border-sage-green">
                      <option>All Actions</option>
                      <option>Data Access</option>
                      <option>Export Requests</option>
                      <option>QB Sync</option>
                      <option>Login/Logout</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-sage-dark mb-2">Date Range</label>
                    <select className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-sage-green focus:border-sage-green">
                      <option>Last 7 Days</option>
                      <option>Last 30 Days</option>
                      <option>Last 90 Days</option>
                      <option>All Time</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sage-dark mb-2">User</label>
                    <select className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-sage-green focus:border-sage-green">
                      <option>All Users</option>
                      <option>john@company.com</option>
                      <option>System</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button className="btn-sage-primary w-full">Filter Logs</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Audit Log Entries */}
            <div className="sage-card">
              <div className="sage-card-content">
                <div className="space-y-4">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-4 border rounded-lg hover:bg-sage-light">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded ${getActionColor(log.action)}`}>
                            <Activity className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-medium text-sage-dark">{log.description}</h4>
                            <p className="text-sage-gray text-sm">
                              Action: {log.action.replace('_', ' ').toLowerCase()}
                            </p>
                          </div>
                        </div>
                        <span className="text-sage-gray text-sm">
                          {log.timestamp.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4 mt-3 pt-3 border-t text-sm">
                        <div>
                          <span className="text-sage-gray">User: </span>
                          <span className="text-sage-dark">{log.user}</span>
                        </div>
                        <div>
                          <span className="text-sage-gray">IP Address: </span>
                          <span className="text-sage-dark">{log.ipAddress}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-center">
                  <button className="btn-sage-secondary">Load More Logs</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Deletion Tab */}
        {activeTab === 'account' && (
          <div className="space-y-8">
            {/* Warning Section */}
            <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-400">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <h2 className="text-2xl font-bold text-red-700">Account Deletion</h2>
              </div>
              <p className="text-red-700 mb-4">
                <strong>Warning:</strong> Account deletion is permanent and cannot be undone. 
                All your data will be permanently deleted after a 30-day grace period.
              </p>
              <p className="text-red-600 text-sm">
                Please consider downloading your data before proceeding with account deletion.
              </p>
            </div>

            {/* What Will Be Deleted */}
            <div className="sage-card">
              <div className="sage-card-content">
                <h3 className="text-xl font-semibold text-sage-dark mb-6">What Will Be Deleted</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-sage-dark mb-3 text-red-600">Immediately Removed</h4>
                    <ul className="space-y-2">
                      {[
                        'Access to FinHelm.ai platform',
                        'QuickBooks integration disconnected',
                        'AI insights and reports',
                        'Custom dashboards and settings',
                        'Billing and subscription cancelled'
                      ].map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sage-gray text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sage-dark mb-3 text-yellow-600">Retained for 30 Days</h4>
                    <ul className="space-y-2">
                      {[
                        'Financial data (for recovery)',
                        'Account information (for reactivation)',
                        'Audit logs (for compliance)',
                        'Support ticket history',
                        'Billing records (as required by law)'
                      ].map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Clock className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sage-gray text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Deletion Process */}
            <div className="sage-card">
              <div className="sage-card-content">
                <h3 className="text-xl font-semibold text-sage-dark mb-6">Deletion Process</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <h4 className="font-semibold text-sage-dark mb-2">Initiate Deletion</h4>
                      <p className="text-sage-gray text-sm">
                        Click the delete button below and confirm your decision via email verification.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <h4 className="font-semibold text-sage-dark mb-2">30-Day Grace Period</h4>
                      <p className="text-sage-gray text-sm">
                        Your account is deactivated but data is retained. You can reactivate by contacting support.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <h4 className="font-semibold text-sage-dark mb-2">Permanent Deletion</h4>
                      <p className="text-sage-gray text-sm">
                        After 30 days, all data is permanently deleted from our systems and backups.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Deletion Actions */}
            <div className="sage-card">
              <div className="sage-card-content">
                <h3 className="text-xl font-semibold text-sage-dark mb-6">Before You Delete</h3>
                
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2">Download Your Data</h4>
                    <p className="text-sage-gray text-sm mb-3">
                      Export all your data before deletion to keep a local copy.
                    </p>
                    <button 
                      onClick={() => setActiveTab('exports')}
                      className="btn-sage-primary text-sm"
                    >
                      Export Data First
                    </button>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-semibold text-sage-dark mb-2">Cancel Subscription</h4>
                    <p className="text-sage-gray text-sm mb-3">
                      You may want to just cancel your subscription instead of full deletion.
                    </p>
                    <Link href="/settings/billing" className="btn-sage-secondary text-sm">
                      Manage Billing
                    </Link>
                  </div>
                </div>

                <div className="p-6 bg-red-50 rounded-lg border">
                  <h4 className="font-semibold text-red-700 mb-3">Ready to Delete Your Account?</h4>
                  <p className="text-red-600 text-sm mb-4">
                    This action cannot be undone. All your data will be permanently deleted after 30 days.
                  </p>
                  <button 
                    onClick={() => setConfirmAction('delete')}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded font-medium transition-colors"
                  >
                    Delete My Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modals */}
        {confirmAction === 'disconnect' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                <h3 className="text-lg font-semibold text-sage-dark">Disconnect QuickBooks?</h3>
              </div>
              <p className="text-sage-gray mb-6">
                This will disconnect your QuickBooks account and stop all data synchronization. 
                You can reconnect later, but you'll lose access to AI insights until then.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDisconnectQuickBooks}
                  className="btn-sage-orange flex-1"
                >
                  Disconnect
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  className="btn-sage-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmAction === 'delete' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-semibold text-sage-dark">Delete Account?</h3>
              </div>
              <p className="text-sage-gray mb-4">
                <strong>This action cannot be undone.</strong> Your account and all data will be 
                permanently deleted after 30 days.
              </p>
              <p className="text-sage-gray mb-6 text-sm">
                Type "DELETE" to confirm this action:
              </p>
              <input
                type="text"
                placeholder="Type DELETE"
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-6"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded font-medium transition-colors flex-1"
                >
                  Delete Forever
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  className="btn-sage-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}