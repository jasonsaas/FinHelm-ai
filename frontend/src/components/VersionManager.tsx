import React, { useState, useCallback, useMemo } from 'react';
import { 
  History, 
  GitBranch, 
  Play, 
  Copy, 
  Compare, 
  Trash2, 
  Download, 
  Upload,
  Clock,
  Code,
  Tag,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Plus,
  RefreshCw
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAgentVersions } from '../hooks/useAgents';
import type { Id } from '../../../convex/_generated/dataModel';

interface VersionData {
  id: string;
  version: string;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  config: {
    prompt?: string;
    model?: string;
    userDefinedCalls?: Array<{
      id: string;
      name: string;
      description: string;
      prompt: string;
    }>;
    version?: string;
  };
  description: string;
}

interface VersionManagerProps {
  organizationId?: Id<"organizations">;
  userId?: Id<"users">;
  agentName?: string;
  currentVersion?: string;
  onVersionSelect?: (version: VersionData) => void;
}

interface VersionComparisonProps {
  version1: VersionData;
  version2: VersionData;
  onClose: () => void;
}

function VersionComparison({ version1, version2, onClose }: VersionComparisonProps) {
  const compareField = useCallback((field: string, value1: any, value2: any) => {
    if (JSON.stringify(value1) === JSON.stringify(value2)) {
      return 'unchanged';
    }
    return 'changed';
  }, []);

  const formatValue = useCallback((value: any): string => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return `${value.length} items`;
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }, []);

  const fields = [
    { key: 'prompt', label: 'Prompt', getValue: (v: VersionData) => v.config.prompt || '' },
    { key: 'model', label: 'Model', getValue: (v: VersionData) => v.config.model || '' },
    { key: 'userDefinedCalls', label: 'User-Defined Calls', getValue: (v: VersionData) => v.config.userDefinedCalls || [] },
    { key: 'description', label: 'Description', getValue: (v: VersionData) => v.description }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Compare className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Compare Versions: {version1.version} vs {version2.version}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-2 gap-6">
            {/* Version 1 Header */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <Tag className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-blue-900">Version {version1.version}</span>
              </div>
              <p className="text-sm text-blue-700">
                Created: {new Date(version1.createdAt).toLocaleString()}
              </p>
              {version1.isActive && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 mt-2">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </span>
              )}
            </div>

            {/* Version 2 Header */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <Tag className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-green-900">Version {version2.version}</span>
              </div>
              <p className="text-sm text-green-700">
                Created: {new Date(version2.createdAt).toLocaleString()}
              </p>
              {version2.isActive && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 mt-2">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </span>
              )}
            </div>
          </div>

          {/* Field Comparisons */}
          <div className="mt-6 space-y-6">
            {fields.map(field => {
              const value1 = field.getValue(version1);
              const value2 = field.getValue(version2);
              const status = compareField(field.key, value1, value2);

              return (
                <div key={field.key} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className={clsx(
                    'px-4 py-3 font-medium text-sm flex items-center justify-between',
                    status === 'changed' ? 'bg-yellow-50 text-yellow-900 border-b border-yellow-200' : 'bg-gray-50 text-gray-700'
                  )}>
                    <span>{field.label}</span>
                    {status === 'changed' ? (
                      <span className="text-xs px-2 py-1 bg-yellow-200 text-yellow-800 rounded-full">
                        Changed
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded-full">
                        Unchanged
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 divide-x divide-gray-200">
                    <div className="p-4">
                      {field.key === 'prompt' ? (
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                          {formatValue(value1)}
                        </pre>
                      ) : (
                        <div className="text-sm text-gray-700">
                          {formatValue(value1)}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      {field.key === 'prompt' ? (
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                          {formatValue(value2)}
                        </pre>
                      ) : (
                        <div className="text-sm text-gray-700">
                          {formatValue(value2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function VersionManager({
  organizationId,
  userId,
  agentName,
  currentVersion,
  onVersionSelect
}: VersionManagerProps) {
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const {
    versions,
    isLoading,
    getLatestVersion,
    getVersionByNumber,
    compareVersions
  } = useAgentVersions(organizationId, agentName);

  // Memoized version statistics
  const versionStats = useMemo(() => {
    if (!versions.length) return null;

    const activeVersions = versions.filter(v => v.isActive);
    const totalVersions = versions.length;
    const latestVersion = getLatestVersion();

    return {
      total: totalVersions,
      active: activeVersions.length,
      inactive: totalVersions - activeVersions.length,
      latest: latestVersion?.version,
      oldestDate: versions[versions.length - 1]?.createdAt,
      newestDate: versions[0]?.createdAt
    };
  }, [versions, getLatestVersion]);

  // Handle version selection for comparison
  const handleVersionToggle = useCallback((versionId: string) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      }
      if (prev.length >= 2) {
        return [prev[1], versionId]; // Keep last selected and add new one
      }
      return [...prev, versionId];
    });
  }, []);

  // Start comparison
  const startComparison = useCallback(() => {
    if (selectedVersions.length === 2) {
      setShowComparison(true);
    }
  }, [selectedVersions]);

  // Load version into form
  const loadVersion = useCallback((version: VersionData) => {
    if (onVersionSelect) {
      onVersionSelect(version);
    }
  }, [onVersionSelect]);

  // Generate next version number
  const generateNextVersion = useCallback((currentVer?: string): string => {
    if (!currentVer) return '1.0.0';
    
    const parts = currentVer.split('.').map(n => parseInt(n, 10));
    if (parts.length !== 3) return '1.0.0';
    
    // Increment patch version
    parts[2]++;
    return parts.join('.');
  }, []);

  // Create new version
  const createNewVersion = useCallback(() => {
    const nextVersion = generateNextVersion(currentVersion);
    const newVersion: VersionData = {
      id: `temp_${Date.now()}`,
      version: nextVersion,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: true,
      config: {
        prompt: '',
        model: 'grok-beta',
        userDefinedCalls: [],
        version: nextVersion
      },
      description: `New version ${nextVersion}`
    };
    
    loadVersion(newVersion);
  }, [currentVersion, generateNextVersion, loadVersion]);

  // Semantic version parsing for sorting
  const parseVersion = useCallback((version: string): number[] => {
    return version.split('.').map(n => parseInt(n, 10) || 0);
  }, []);

  // Sort versions by semantic version
  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => {
      const aVer = parseVersion(a.version);
      const bVer = parseVersion(b.version);
      
      // Compare major.minor.patch in descending order
      for (let i = 0; i < 3; i++) {
        if (bVer[i] !== aVer[i]) {
          return bVer[i] - aVer[i];
        }
      }
      return 0;
    });
  }, [versions, parseVersion]);

  if (!agentName) {
    return (
      <div className="text-center py-12 text-gray-500">
        <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="font-medium">Version History</p>
        <p className="text-sm mt-2">Enter an agent name to view version history</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Loading version history...</p>
      </div>
    );
  }

  if (!versions.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <div className="space-y-3">
          <p className="font-medium">No versions found for "{agentName}"</p>
          <p className="text-sm">Deploy your first agent to start tracking versions</p>
          <button
            onClick={createNewVersion}
            className="btn-primary flex items-center space-x-2 mx-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create Version 1.0.0</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Version Statistics */}
      {versionStats && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Version Overview</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{versionStats.total}</div>
              <div className="text-sm text-blue-700">Total Versions</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{versionStats.active}</div>
              <div className="text-sm text-green-700">Active</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-600">{versionStats.latest}</div>
              <div className="text-sm text-gray-700">Latest Version</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-sm font-bold text-purple-600">
                {versionStats.newestDate && new Date(versionStats.newestDate).toLocaleDateString()}
              </div>
              <div className="text-sm text-purple-700">Last Updated</div>
            </div>
          </div>
        </div>
      )}

      {/* Version Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Version History</h3>
          <p className="text-sm text-gray-600">
            {selectedVersions.length === 0 && 'Select versions to compare or load'}
            {selectedVersions.length === 1 && 'Select another version to compare'}
            {selectedVersions.length === 2 && 'Ready to compare selected versions'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {selectedVersions.length === 2 && (
            <button
              onClick={startComparison}
              className="btn-secondary flex items-center space-x-2 text-sm"
            >
              <Compare className="h-4 w-4" />
              <span>Compare Versions</span>
            </button>
          )}
          
          <button
            onClick={createNewVersion}
            className="btn-primary flex items-center space-x-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Version</span>
          </button>
        </div>
      </div>

      {/* Version List */}
      <div className="space-y-3">
        {sortedVersions.map(version => {
          const isSelected = selectedVersions.includes(version.id);
          const isCurrent = version.version === currentVersion;
          
          return (
            <div
              key={version.id}
              className={clsx(
                'card border transition-colors',
                isSelected ? 'border-blue-300 bg-blue-50' : 'hover:border-gray-300'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleVersionToggle(version.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Tag className="h-4 w-4 text-gray-500" />
                      <span className="font-semibold text-gray-900">{version.version}</span>
                      {version.isActive && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </span>
                      )}
                      {isCurrent && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          Current
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="text-right text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(version.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {version.config.model || 'No model'} • {version.config.userDefinedCalls?.length || 0} calls
                    </div>
                  </div>
                  
                  <button
                    onClick={() => loadVersion(version)}
                    className="btn-secondary text-sm flex items-center space-x-1"
                    title="Load this version"
                  >
                    <Download className="h-3 w-3" />
                    <span>Load</span>
                  </button>
                </div>
              </div>

              {/* Version Details */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Model:</span>
                    <span className="ml-2 text-gray-600">{version.config.model || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">User Calls:</span>
                    <span className="ml-2 text-gray-600">{version.config.userDefinedCalls?.length || 0}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Prompt Length:</span>
                    <span className="ml-2 text-gray-600">{version.config.prompt?.length || 0} chars</span>
                  </div>
                </div>
                
                {version.config.userDefinedCalls && version.config.userDefinedCalls.length > 0 && (
                  <div className="mt-2">
                    <span className="font-medium text-gray-700 text-sm">Defined Calls:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {version.config.userDefinedCalls.map((call, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                        >
                          <Code className="h-3 w-3 mr-1" />
                          {call.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Version Comparison Modal */}
      {showComparison && selectedVersions.length === 2 && (
        <VersionComparison
          version1={versions.find(v => v.id === selectedVersions[0])!}
          version2={versions.find(v => v.id === selectedVersions[1])!}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  );
}

export default VersionManager;