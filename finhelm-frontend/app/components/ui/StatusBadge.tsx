import React from 'react';
import { LucideIcon, CheckCircle, AlertTriangle, Clock, XCircle, Info } from 'lucide-react';

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'pending' | 'processing' | 'ready' | 'expired' | 'operational' | 'partial';

interface StatusBadgeProps {
  status: StatusType;
  text?: string;
  icon?: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function StatusBadge({ 
  status, 
  text, 
  icon: CustomIcon, 
  size = 'md',
  showIcon = true 
}: StatusBadgeProps) {
  const getStatusConfig = (status: StatusType) => {
    const configs = {
      success: {
        classes: 'text-green-700 bg-green-100 border-green-200',
        icon: CheckCircle,
        defaultText: 'Success'
      },
      operational: {
        classes: 'text-green-700 bg-green-100 border-green-200',
        icon: CheckCircle,
        defaultText: 'Operational'
      },
      ready: {
        classes: 'text-green-700 bg-green-100 border-green-200',
        icon: CheckCircle,
        defaultText: 'Ready'
      },
      warning: {
        classes: 'text-yellow-700 bg-yellow-100 border-yellow-200',
        icon: AlertTriangle,
        defaultText: 'Warning'
      },
      partial: {
        classes: 'text-yellow-700 bg-yellow-100 border-yellow-200',
        icon: AlertTriangle,
        defaultText: 'Partial'
      },
      error: {
        classes: 'text-red-700 bg-red-100 border-red-200',
        icon: XCircle,
        defaultText: 'Error'
      },
      expired: {
        classes: 'text-red-700 bg-red-100 border-red-200',
        icon: XCircle,
        defaultText: 'Expired'
      },
      info: {
        classes: 'text-blue-700 bg-blue-100 border-blue-200',
        icon: Info,
        defaultText: 'Info'
      },
      pending: {
        classes: 'text-blue-700 bg-blue-100 border-blue-200',
        icon: Clock,
        defaultText: 'Pending'
      },
      processing: {
        classes: 'text-yellow-700 bg-yellow-100 border-yellow-200',
        icon: Clock,
        defaultText: 'Processing'
      }
    };

    return configs[status] || configs.info;
  };

  const getSizeClasses = (size: string) => {
    const sizes = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-2 text-base'
    };
    return sizes[size as keyof typeof sizes] || sizes.md;
  };

  const config = getStatusConfig(status);
  const Icon = CustomIcon || config.icon;
  const displayText = text || config.defaultText;

  return (
    <span className={`
      inline-flex items-center gap-1.5 
      font-medium border rounded-full
      ${config.classes} 
      ${getSizeClasses(size)}
    `}>
      {showIcon && <Icon className={`${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'}`} />}
      <span className="capitalize">{displayText}</span>
    </span>
  );
}

export default StatusBadge;