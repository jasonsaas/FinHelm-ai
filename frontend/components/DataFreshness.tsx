'use client'

import { useEffect, useState } from 'react'
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Loader2,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { formatDistanceToNow } from 'date-fns'

interface DataFreshnessProps {
  lastSyncAt: Date | null
  isSyncing: boolean
  syncError?: string | null
  onRefresh: () => Promise<void>
  onSync: () => Promise<void>
  autoRefreshInterval?: number // in seconds
  showDetails?: boolean
}

export function DataFreshness({
  lastSyncAt,
  isSyncing,
  syncError,
  onRefresh,
  onSync,
  autoRefreshInterval = 300, // 5 minutes default
  showDetails = true,
}: DataFreshnessProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [countdown, setCountdown] = useState(autoRefreshInterval)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [syncProgress, setSyncProgress] = useState(0)

  // Calculate data freshness
  const getDataFreshnessStatus = () => {
    if (!lastSyncAt) return 'unknown'
    
    const minutesSinceSync = (Date.now() - lastSyncAt.getTime()) / (1000 * 60)
    
    if (minutesSinceSync < 5) return 'fresh'
    if (minutesSinceSync < 30) return 'recent'
    if (minutesSinceSync < 60) return 'stale'
    return 'outdated'
  }

  const freshnessStatus = getDataFreshnessStatus()
  
  const statusConfig = {
    fresh: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-200',
      label: 'Fresh Data',
      description: 'Data is up to date',
    },
    recent: {
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      borderColor: 'border-blue-200',
      label: 'Recent Data',
      description: 'Data synced recently',
    },
    stale: {
      icon: AlertCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      borderColor: 'border-yellow-200',
      label: 'Stale Data',
      description: 'Consider refreshing data',
    },
    outdated: {
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-200',
      label: 'Outdated Data',
      description: 'Data needs refresh',
    },
    unknown: {
      icon: Info,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-200',
      label: 'No Sync Data',
      description: 'Never synced',
    },
  }

  const config = statusConfig[freshnessStatus]
  const StatusIcon = config.icon

  // Auto-refresh countdown
  useEffect(() => {
    if (!autoRefreshEnabled || isSyncing || isRefreshing) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleRefresh()
          return autoRefreshInterval
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [autoRefreshEnabled, isSyncing, isRefreshing, autoRefreshInterval])

  // Simulate sync progress
  useEffect(() => {
    if (isSyncing) {
      const progressInterval = setInterval(() => {
        setSyncProgress((prev) => {
          if (prev >= 90) return 90 // Cap at 90% until actually complete
          return prev + 10
        })
      }, 500)

      return () => {
        clearInterval(progressInterval)
        setSyncProgress(0)
      }
    } else {
      setSyncProgress(0)
    }
  }, [isSyncing])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
      setCountdown(autoRefreshInterval)
    }
  }

  const handleSync = async () => {
    setCountdown(autoRefreshInterval)
    await onSync()
  }

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!showDetails) {
    // Compact mode - just show a badge
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={`${config.borderColor} ${config.bgColor}`}
        >
          <StatusIcon className={`h-3 w-3 mr-1 ${config.color}`} />
          <span className={`text-xs ${config.color}`}>
            {lastSyncAt ? formatDistanceToNow(lastSyncAt, { addSuffix: true }) : 'Never synced'}
          </span>
        </Badge>
        
        <Button
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing || isSyncing}
        >
          {isRefreshing || isSyncing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
        </Button>
      </div>
    )
  }

  // Detailed mode
  return (
    <Card className={`${config.borderColor} border-2`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config.bgColor}`}>
                <StatusIcon className={`h-5 w-5 ${config.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{config.label}</h3>
                <p className="text-xs text-gray-600">
                  {config.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing || isSyncing}
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh View
                  </>
                )}
              </Button>
              
              <Button
                size="sm"
                variant="default"
                onClick={handleSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Data
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Sync Progress */}
          {isSyncing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Syncing with QuickBooks...</span>
                <span className="font-medium">{syncProgress}%</span>
              </div>
              <Progress value={syncProgress} className="h-2" />
            </div>
          )}

          {/* Error Alert */}
          {syncError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{syncError}</AlertDescription>
            </Alert>
          )}

          {/* Sync Details */}
          <div className="flex items-center justify-between text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-gray-500" />
                <span className="text-gray-600">Last sync:</span>
                <span className="font-medium">
                  {lastSyncAt ? formatDistanceToNow(lastSyncAt, { addSuffix: true }) : 'Never'}
                </span>
              </div>
              
              {autoRefreshEnabled && !isSyncing && !isRefreshing && (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-3 w-3 text-gray-500" />
                  <span className="text-gray-600">Auto-refresh in:</span>
                  <span className="font-medium">{formatCountdown(countdown)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">Auto-refresh</label>
              <input
                type="checkbox"
                checked={autoRefreshEnabled}
                onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
            </div>
          </div>

          {/* Data Sources */}
          <div className="pt-2 border-t">
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-gray-600">Accounts</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-gray-600">Invoices</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-gray-600">Bills</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span className="text-gray-600">Transactions</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}