'use client';

import React, { useState, useEffect } from 'react';
import { Id } from '../../../convex/_generated/dataModel';
import { useIntacctPreferences } from '../hooks/useIntacctPreferences';
import { useGrokSuggestions, useOptimizationTips } from '../hooks/useGrokSuggestions';
import { 
  Settings, 
  Palette, 
  Layout, 
  Bell, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Keyboard, 
  Zap, 
  Save, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Toggle,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  X,
  TrendingUp,
  Star,
  Zap as ZapIcon,
  Brain,
  Target,
  Refresh
} from 'lucide-react';
import { clsx } from 'clsx';

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  inApp: boolean;
  desktop: boolean;
}

export interface UICustomizations {
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
  sidebarCollapsed: boolean;
  showGridLines: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  primaryColor: string;
}

export interface DashboardWidgets {
  cashFlow: { enabled: boolean; position: number; size: 'small' | 'medium' | 'large' };
  revenueChart: { enabled: boolean; position: number; size: 'small' | 'medium' | 'large' };
  expenseSummary: { enabled: boolean; position: number; size: 'small' | 'medium' | 'large' };
  quickActions: { enabled: boolean; position: number; size: 'small' | 'medium' | 'large' };
  recentTransactions: { enabled: boolean; position: number; size: 'small' | 'medium' | 'large' };
  alerts: { enabled: boolean; position: number; size: 'small' | 'medium' | 'large' };
}

export interface ProductivityTools {
  keyboardShortcuts: { [key: string]: boolean };
  autoSave: boolean;
  autoSaveInterval: number;
  bulkOperations: boolean;
  quickFilters: boolean;
  smartSuggestions: boolean;
  templateLibrary: boolean;
}

export interface IntacctPreferences {
  id?: string;
  userId: string;
  organizationId: string;
  userRole: UserRole;
  notifications: NotificationSettings;
  uiCustomizations: UICustomizations;
  dashboardWidgets: DashboardWidgets;
  productivityTools: ProductivityTools;
  grokAIEnabled: boolean;
  lastUpdated: number;
}

export interface IntacctPreferencesProps {
  userId?: Id<"users">;
  organizationId?: Id<"organizations">;
  userRole?: UserRole;
  initialPreferences?: Partial<IntacctPreferences>;
  onPreferencesChange?: (preferences: IntacctPreferences) => void;
  onSave?: (preferences: IntacctPreferences) => Promise<void>;
  readOnly?: boolean;
  className?: string;
  useConvex?: boolean;
}

const defaultPreferences: Omit<IntacctPreferences, 'userId' | 'organizationId'> = {
  userRole: { id: 'user', name: 'User', permissions: ['read', 'write'] },
  notifications: {
    email: true,
    sms: false,
    inApp: true,
    desktop: true,
  },
  uiCustomizations: {
    theme: 'light',
    compactMode: false,
    sidebarCollapsed: false,
    showGridLines: true,
    highContrast: false,
    fontSize: 'medium',
    primaryColor: '#3B82F6',
  },
  dashboardWidgets: {
    cashFlow: { enabled: true, position: 0, size: 'large' },
    revenueChart: { enabled: true, position: 1, size: 'large' },
    expenseSummary: { enabled: true, position: 2, size: 'medium' },
    quickActions: { enabled: true, position: 3, size: 'small' },
    recentTransactions: { enabled: true, position: 4, size: 'medium' },
    alerts: { enabled: true, position: 5, size: 'small' },
  },
  productivityTools: {
    keyboardShortcuts: {
      'Ctrl+S': true,
      'Ctrl+N': true,
      'Ctrl+F': true,
      'Ctrl+Z': true,
      'Ctrl+Y': true,
    },
    autoSave: true,
    autoSaveInterval: 300,
    bulkOperations: true,
    quickFilters: true,
    smartSuggestions: true,
    templateLibrary: true,
  },
  grokAIEnabled: false,
  lastUpdated: Date.now(),
};

export function IntacctPreferences({
  userId,
  organizationId,
  userRole,
  initialPreferences = {},
  onPreferencesChange,
  onSave,
  readOnly = false,
  className,
  useConvex = true,
}: IntacctPreferencesProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'ui' | 'dashboard' | 'productivity' | 'ai'>('general');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Use Convex hook if enabled and IDs are provided
  const convexResult = useIntacctPreferences({
    userId: useConvex ? userId : undefined,
    organizationId: useConvex ? organizationId : undefined,
    autoLoad: useConvex && !!userId && !!organizationId,
  });

  // Local state for preferences
  const [localPreferences, setLocalPreferences] = useState<IntacctPreferences>(() => ({
    ...defaultPreferences,
    userId: userId || 'current-user' as any,
    organizationId: organizationId || 'current-org' as any,
    userRole: userRole || defaultPreferences.userRole,
    ...initialPreferences,
  }));

  // Use Convex preferences if available, otherwise use local state
  const preferences = useConvex && convexResult.preferences ? convexResult.preferences : localPreferences;
  const setPreferences = useConvex ? (prefs: IntacctPreferences) => {
    // For Convex mode, we update local state but rely on Convex for persistence
    setLocalPreferences(prefs);
  } : setLocalPreferences;

  const isLoading = useConvex ? convexResult.isLoading : false;
  const convexError = useConvex ? convexResult.error : null;

  // Grok AI suggestions
  const grokSuggestions = useGrokSuggestions({
    enabled: preferences.grokAIEnabled,
    autoRefresh: false
  });
  
  const optimizationTips = useOptimizationTips();

  // Update local preferences when Convex data loads
  useEffect(() => {
    if (useConvex && convexResult.preferences && !hasUnsavedChanges) {
      setLocalPreferences(convexResult.preferences);
    }
  }, [convexResult.preferences, useConvex, hasUnsavedChanges]);

  // Generate suggestions when Grok AI is enabled
  useEffect(() => {
    if (preferences.grokAIEnabled && !grokSuggestions.isLoading && grokSuggestions.suggestions.length === 0) {
      grokSuggestions.generateSuggestions(preferences);
      optimizationTips.getTips(preferences);
    }
  }, [preferences.grokAIEnabled]);

  useEffect(() => {
    if (onPreferencesChange) {
      onPreferencesChange(preferences);
    }
  }, [preferences, onPreferencesChange]);

  const updatePreferences = <T extends keyof IntacctPreferences>(
    section: T,
    updates: Partial<IntacctPreferences[T]>
  ) => {
    if (readOnly) return;

    setPreferences(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates },
      lastUpdated: Date.now(),
    }));
    setHasUnsavedChanges(true);
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    if (readOnly) return;

    setIsSaving(true);
    setSaveStatus('idle');
    setErrors({});

    try {
      // Basic validation
      const validationErrors: { [key: string]: string } = {};
      
      if (preferences.productivityTools.autoSaveInterval < 60) {
        validationErrors.autoSaveInterval = 'Auto-save interval must be at least 60 seconds';
      }
      
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        setSaveStatus('error');
        return;
      }

      // Use Convex save if available, otherwise use custom onSave
      if (useConvex && convexResult.savePreferences) {
        await convexResult.savePreferences(preferences);
      } else if (onSave) {
        await onSave(preferences);
      } else {
        throw new Error('No save method available');
      }

      setHasUnsavedChanges(false);
      setSaveStatus('success');
    } catch (error) {
      setSaveStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Failed to save preferences';
      setErrors({ save: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (readOnly) return;
    
    setPreferences({
      ...defaultPreferences,
      userId,
      organizationId,
      userRole: userRole || defaultPreferences.userRole,
      ...initialPreferences,
    });
    setHasUnsavedChanges(false);
    setSaveStatus('idle');
    setErrors({});
  };

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Settings },
    { id: 'ui' as const, label: 'UI Customization', icon: Palette },
    { id: 'dashboard' as const, label: 'Dashboard', icon: Layout },
    { id: 'productivity' as const, label: 'Productivity', icon: Zap },
    { id: 'ai' as const, label: 'AI Features', icon: Sparkles },
  ];

  const renderGeneralTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">User Information</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">User ID</label>
              <p className="mt-1 text-sm text-gray-500">{preferences.userId}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Organization</label>
              <p className="mt-1 text-sm text-gray-500">{preferences.organizationId}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <p className="mt-1 text-sm text-gray-500">{preferences.userRole.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
        <div className="space-y-4">
          {Object.entries(preferences.notifications).map(([key, enabled]) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center">
                {key === 'email' && <Bell className="w-4 h-4 mr-2 text-gray-500" />}
                {key === 'sms' && <Smartphone className="w-4 h-4 mr-2 text-gray-500" />}
                {key === 'inApp' && <Monitor className="w-4 h-4 mr-2 text-gray-500" />}
                {key === 'desktop' && <Tablet className="w-4 h-4 mr-2 text-gray-500" />}
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {key === 'inApp' ? 'In-App' : key === 'sms' ? 'SMS' : key}
                </span>
              </div>
              <button
                type="button"
                className={clsx(
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2',
                  enabled ? 'bg-blue-600' : 'bg-gray-200',
                  readOnly && 'opacity-50 cursor-not-allowed'
                )}
                onClick={() => updatePreferences('notifications', { [key]: !enabled })}
                disabled={readOnly}
              >
                <span
                  className={clsx(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    enabled ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderUITab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Theme Settings</h3>
        <div className="grid grid-cols-3 gap-3">
          {(['light', 'dark', 'auto'] as const).map((theme) => (
            <button
              key={theme}
              type="button"
              className={clsx(
                'p-3 border rounded-lg text-center transition-colors',
                preferences.uiCustomizations.theme === theme
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400',
                readOnly && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => updatePreferences('uiCustomizations', { theme })}
              disabled={readOnly}
            >
              <span className="capitalize">{theme}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Display Options</h3>
        <div className="space-y-4">
          {[
            { key: 'compactMode', label: 'Compact Mode', icon: Monitor },
            { key: 'sidebarCollapsed', label: 'Collapsed Sidebar', icon: Layout },
            { key: 'showGridLines', label: 'Show Grid Lines', icon: Eye },
            { key: 'highContrast', label: 'High Contrast', icon: Toggle },
          ].map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center">
                <Icon className="w-4 h-4 mr-2 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </div>
              <button
                type="button"
                className={clsx(
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2',
                  preferences.uiCustomizations[key as keyof UICustomizations] ? 'bg-blue-600' : 'bg-gray-200',
                  readOnly && 'opacity-50 cursor-not-allowed'
                )}
                onClick={() => updatePreferences('uiCustomizations', { [key]: !preferences.uiCustomizations[key as keyof UICustomizations] })}
                disabled={readOnly}
              >
                <span
                  className={clsx(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    preferences.uiCustomizations[key as keyof UICustomizations] ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Font Size</h3>
        <div className="grid grid-cols-3 gap-3">
          {(['small', 'medium', 'large'] as const).map((size) => (
            <button
              key={size}
              type="button"
              className={clsx(
                'p-3 border rounded-lg text-center transition-colors',
                preferences.uiCustomizations.fontSize === size
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400',
                readOnly && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => updatePreferences('uiCustomizations', { fontSize: size })}
              disabled={readOnly}
            >
              <span className="capitalize">{size}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Primary Color</h3>
        <input
          type="color"
          value={preferences.uiCustomizations.primaryColor}
          onChange={(e) => updatePreferences('uiCustomizations', { primaryColor: e.target.value })}
          className="w-20 h-10 border border-gray-300 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={readOnly}
        />
      </div>
    </div>
  );

  const renderDashboardTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Dashboard Widgets</h3>
        <div className="space-y-4">
          {Object.entries(preferences.dashboardWidgets).map(([key, widget]) => (
            <div key={key} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
                <button
                  type="button"
                  className={clsx(
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2',
                    widget.enabled ? 'bg-blue-600' : 'bg-gray-200',
                    readOnly && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => updatePreferences('dashboardWidgets', { 
                    [key]: { ...widget, enabled: !widget.enabled }
                  })}
                  disabled={readOnly}
                >
                  <span
                    className={clsx(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      widget.enabled ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
              
              {widget.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Position</label>
                    <input
                      type="number"
                      min="0"
                      value={widget.position}
                      onChange={(e) => updatePreferences('dashboardWidgets', {
                        [key]: { ...widget, position: parseInt(e.target.value) }
                      })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Size</label>
                    <select
                      value={widget.size}
                      onChange={(e) => updatePreferences('dashboardWidgets', {
                        [key]: { ...widget, size: e.target.value as 'small' | 'medium' | 'large' }
                      })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={readOnly}
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderProductivityTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Keyboard Shortcuts</h3>
        <div className="space-y-3">
          {Object.entries(preferences.productivityTools.keyboardShortcuts).map(([shortcut, enabled]) => (
            <div key={shortcut} className="flex items-center justify-between">
              <div className="flex items-center">
                <Keyboard className="w-4 h-4 mr-2 text-gray-500" />
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">{shortcut}</code>
              </div>
              <button
                type="button"
                className={clsx(
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2',
                  enabled ? 'bg-blue-600' : 'bg-gray-200',
                  readOnly && 'opacity-50 cursor-not-allowed'
                )}
                onClick={() => updatePreferences('productivityTools', {
                  keyboardShortcuts: { ...preferences.productivityTools.keyboardShortcuts, [shortcut]: !enabled }
                })}
                disabled={readOnly}
              >
                <span
                  className={clsx(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    enabled ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Automation Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Save className="w-4 h-4 mr-2 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Auto Save</span>
            </div>
            <button
              type="button"
              className={clsx(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2',
                preferences.productivityTools.autoSave ? 'bg-blue-600' : 'bg-gray-200',
                readOnly && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => updatePreferences('productivityTools', { autoSave: !preferences.productivityTools.autoSave })}
              disabled={readOnly}
            >
              <span
                className={clsx(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  preferences.productivityTools.autoSave ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {preferences.productivityTools.autoSave && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto Save Interval (seconds)
              </label>
              <input
                type="number"
                min="60"
                max="3600"
                value={preferences.productivityTools.autoSaveInterval}
                onChange={(e) => updatePreferences('productivityTools', { autoSaveInterval: parseInt(e.target.value) })}
                className={clsx(
                  'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  errors.autoSaveInterval && 'border-red-300 focus:ring-red-500',
                  readOnly && 'opacity-50 cursor-not-allowed'
                )}
                disabled={readOnly}
              />
              {errors.autoSaveInterval && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.autoSaveInterval}
                </p>
              )}
            </div>
          )}

          {[
            { key: 'bulkOperations', label: 'Bulk Operations' },
            { key: 'quickFilters', label: 'Quick Filters' },
            { key: 'smartSuggestions', label: 'Smart Suggestions' },
            { key: 'templateLibrary', label: 'Template Library' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center">
                <Zap className="w-4 h-4 mr-2 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </div>
              <button
                type="button"
                className={clsx(
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2',
                  preferences.productivityTools[key as keyof ProductivityTools] ? 'bg-blue-600' : 'bg-gray-200',
                  readOnly && 'opacity-50 cursor-not-allowed'
                )}
                onClick={() => updatePreferences('productivityTools', { [key]: !preferences.productivityTools[key as keyof ProductivityTools] })}
                disabled={readOnly}
              >
                <span
                  className={clsx(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    preferences.productivityTools[key as keyof ProductivityTools] ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAITab = () => (
    <div className="space-y-6">
      {/* Grok AI Toggle */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Grok AI Integration</h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">AI-Powered Suggestions</h4>
              <p className="text-sm text-blue-700 mt-1">
                Enable Grok AI to get intelligent suggestions for UI optimizations, 
                productivity improvements, and personalized recommendations based on your usage patterns.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <div className="flex items-center mb-1">
              <Sparkles className="w-5 h-5 text-purple-500 mr-2" />
              <h4 className="text-sm font-medium text-gray-900">Enable Grok AI</h4>
            </div>
            <p className="text-sm text-gray-500">
              Get smart suggestions and UX optimization recommendations
            </p>
          </div>
          <button
            type="button"
            className={clsx(
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2',
              preferences.grokAIEnabled ? 'bg-purple-600' : 'bg-gray-200',
              readOnly && 'opacity-50 cursor-not-allowed'
            )}
            onClick={() => updatePreferences('grokAIEnabled', !preferences.grokAIEnabled)}
            disabled={readOnly}
          >
            <span
              className={clsx(
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                preferences.grokAIEnabled ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>
      </div>

      {/* AI Features Active */}
      {preferences.grokAIEnabled && (
        <>
          {/* Status Section */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Brain className="w-6 h-6 text-purple-600 mr-2" />
                <h4 className="text-lg font-medium text-gray-900">AI Features Active</h4>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => grokSuggestions.generateSuggestions(preferences)}
                  disabled={grokSuggestions.isLoading}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Refresh className={clsx("w-3 h-3 mr-1", grokSuggestions.isLoading && "animate-spin")} />
                  Refresh
                </button>
              </div>
            </div>

            {grokSuggestions.overallScore > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-700">Optimization Score</span>
                  <span className="font-medium text-gray-900">{grokSuggestions.overallScore}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={clsx(
                      "h-2 rounded-full transition-all duration-300",
                      grokSuggestions.overallScore >= 80 ? "bg-green-500" :
                      grokSuggestions.overallScore >= 60 ? "bg-yellow-500" : "bg-red-500"
                    )}
                    style={{ width: `${grokSuggestions.overallScore}%` }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-md shadow-sm">
                <div className="flex items-center mb-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500 mr-2" />
                  <h5 className="font-medium text-gray-900">Smart Suggestions</h5>
                </div>
                <p className="text-sm text-gray-600">
                  {grokSuggestions.suggestions.length} active recommendations
                </p>
              </div>
              <div className="bg-white p-4 rounded-md shadow-sm">
                <div className="flex items-center mb-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
                  <h5 className="font-medium text-gray-900">Usage Analytics</h5>
                </div>
                <p className="text-sm text-gray-600">
                  Confidence: {Math.round(grokSuggestions.confidenceLevel * 100)}%
                </p>
              </div>
            </div>
          </div>

          {/* Suggestions Panel */}
          {grokSuggestions.suggestions.length > 0 && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Target className="w-5 h-5 text-purple-600 mr-2" />
                Smart Suggestions
              </h4>
              <div className="space-y-4">
                {grokSuggestions.suggestions.map((suggestion) => (
                  <div key={suggestion.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start">
                        <div className={clsx(
                          "flex items-center justify-center w-8 h-8 rounded-full mr-3",
                          suggestion.impact === 'high' ? "bg-red-100 text-red-600" :
                          suggestion.impact === 'medium' ? "bg-yellow-100 text-yellow-600" :
                          "bg-green-100 text-green-600"
                        )}>
                          {suggestion.type === 'ui_optimization' && <Palette className="w-4 h-4" />}
                          {suggestion.type === 'productivity_enhancement' && <ZapIcon className="w-4 h-4" />}
                          {suggestion.type === 'dashboard_layout' && <Layout className="w-4 h-4" />}
                          {suggestion.type === 'workflow_improvement' && <TrendingUp className="w-4 h-4" />}
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900">{suggestion.title}</h5>
                          <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                          <div className="flex items-center mt-2 space-x-4">
                            <span className={clsx(
                              "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                              suggestion.impact === 'high' ? "bg-red-100 text-red-800" :
                              suggestion.impact === 'medium' ? "bg-yellow-100 text-yellow-800" :
                              "bg-green-100 text-green-800"
                            )}>
                              {suggestion.impact} impact
                            </span>
                            <span className="inline-flex items-center text-xs text-gray-500">
                              <Star className="w-3 h-3 mr-1" />
                              {Math.round(suggestion.confidence * 100)}% confidence
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => grokSuggestions.dismissSuggestion(suggestion.id)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="ml-11">
                      <div className="bg-gray-50 rounded p-3 mb-3">
                        <h6 className="text-xs font-medium text-gray-700 mb-2">Implementation Steps</h6>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {suggestion.implementationSteps.map((step, index) => (
                            <li key={index} className="flex items-start">
                              <span className="inline-block w-4 text-center">{index + 1}.</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={async () => {
                              const updatedPreferences = grokSuggestions.applySuggestion(suggestion, preferences);
                              setPreferences(updatedPreferences);
                              setHasUnsavedChanges(true);
                              await grokSuggestions.submitFeedback({
                                suggestionId: suggestion.id,
                                rating: 5,
                                implemented: true,
                                helpful: true
                              });
                            }}
                            disabled={readOnly}
                            className={clsx(
                              "inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500",
                              readOnly && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Apply
                          </button>
                          <button
                            onClick={async () => {
                              await grokSuggestions.submitFeedback({
                                suggestionId: suggestion.id,
                                rating: 4,
                                implemented: false,
                                helpful: true
                              });
                            }}
                            className="inline-flex items-center px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                          >
                            <ThumbsUp className="w-3 h-3 mr-1" />
                            Helpful
                          </button>
                          <button
                            onClick={async () => {
                              await grokSuggestions.submitFeedback({
                                suggestionId: suggestion.id,
                                rating: 2,
                                implemented: false,
                                helpful: false
                              });
                              grokSuggestions.dismissSuggestion(suggestion.id);
                            }}
                            className="inline-flex items-center px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                          >
                            <ThumbsDown className="w-3 h-3 mr-1" />
                            Not helpful
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optimization Tips */}
          {optimizationTips.tips.length > 0 && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Lightbulb className="w-5 h-5 text-yellow-600 mr-2" />
                Quick Tips
              </h4>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <ul className="space-y-2">
                  {optimizationTips.tips.map((tip, index) => (
                    <li key={index} className="flex items-start text-sm text-yellow-800">
                      <Lightbulb className="w-4 h-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* General Recommendations */}
          {grokSuggestions.generalRecommendations.length > 0 && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">General Recommendations</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <ul className="space-y-2">
                  {grokSuggestions.generalRecommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start text-sm text-blue-800">
                      <Info className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Loading State */}
          {grokSuggestions.isLoading && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <Loader2 className="w-8 h-8 text-purple-600 mx-auto mb-4 animate-spin" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Analyzing Your Preferences</h4>
              <p className="text-sm text-gray-600">
                Grok AI is generating personalized suggestions based on your configuration...
              </p>
            </div>
          )}

          {/* Error State */}
          {grokSuggestions.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-800">Unable to Load Suggestions</h4>
                  <p className="text-sm text-red-700 mt-1">{grokSuggestions.error}</p>
                  <button
                    onClick={grokSuggestions.retry}
                    className="mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Refresh className="w-3 h-3 mr-1" />
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className={clsx('bg-white shadow-sm rounded-lg', className)}>
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Intacct Preferences</h2>
            <p className="text-sm text-gray-500 mt-1">
              Customize your Sage Intacct experience with personalized settings and AI-powered features
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {saveStatus === 'success' && (
              <div className="flex items-center text-green-600">
                <CheckCircle className="w-4 h-4 mr-1" />
                <span className="text-sm">Saved</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center text-red-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                <span className="text-sm">Error</span>
              </div>
            )}
            {hasUnsavedChanges && (
              <span className="text-sm text-amber-600">Unsaved changes</span>
            )}
            
            <button
              type="button"
              onClick={handleReset}
              className={clsx(
                'inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                readOnly && 'opacity-50 cursor-not-allowed'
              )}
              disabled={readOnly || isSaving}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </button>
            
            <button
              type="button"
              onClick={handleSave}
              className={clsx(
                'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                readOnly && 'opacity-50 cursor-not-allowed',
                isSaving && 'opacity-75 cursor-not-allowed'
              )}
              disabled={readOnly || isSaving || !hasUnsavedChanges}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center',
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="px-6 py-6">
        {/* Loading State */}
        {isLoading && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center">
              <Loader2 className="w-5 h-5 text-blue-600 mr-2 animate-spin" />
              <p className="text-sm text-blue-700">Loading preferences...</p>
            </div>
          </div>
        )}

        {/* Error States */}
        {(errors.save || convexError) && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <p className="text-sm text-red-700">{errors.save || convexError}</p>
            </div>
          </div>
        )}

        {activeTab === 'general' && renderGeneralTab()}
        {activeTab === 'ui' && renderUITab()}
        {activeTab === 'dashboard' && renderDashboardTab()}
        {activeTab === 'productivity' && renderProductivityTab()}
        {activeTab === 'ai' && renderAITab()}
      </div>
    </div>
  );
}

export default IntacctPreferences;