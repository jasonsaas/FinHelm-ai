'use client';

import React from 'react';
import { Download, FileText, Database, Activity, Archive } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';

export type ExportType = 'full' | 'financial' | 'insights' | 'audit';
export type ExportStatus = 'pending' | 'processing' | 'ready' | 'expired';

interface DataExportRequest {
  id: string;
  type: ExportType;
  status: ExportStatus;
  requestedAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  expiresAt?: Date;
  size?: string;
}

interface DataExportCardProps {
  exportType: {
    type: ExportType;
    title: string;
    description: string;
    size: string;
    formats: string;
  };
  onExport: (type: ExportType) => void;
  disabled?: boolean;
}

interface ExportHistoryCardProps {
  request: DataExportRequest;
  onDownload?: (url: string) => void;
}

const exportTypeIcons = {
  full: Database,
  financial: FileText,
  insights: Activity,
  audit: Archive
};

export function DataExportCard({ exportType, onExport, disabled = false }: DataExportCardProps) {
  const Icon = exportTypeIcons[exportType.type];

  return (
    <div className="p-6 border rounded-lg hover:shadow-md transition-shadow bg-white">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-sage-light rounded">
          <Icon className="w-5 h-5 text-sage-green" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sage-dark mb-2">{exportType.title}</h3>
          <p className="text-sage-gray text-sm">{exportType.description}</p>
        </div>
      </div>
      
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
        onClick={() => onExport(exportType.type)}
        disabled={disabled}
        className="btn-sage-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4" />
        Request Export
      </button>
    </div>
  );
}

export function ExportHistoryCard({ request, onDownload }: ExportHistoryCardProps) {
  const Icon = exportTypeIcons[request.type];
  const formatExportType = (type: ExportType) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ');
  };

  const isDownloadable = request.status === 'ready' && request.downloadUrl;
  const isExpiringSoon = request.expiresAt && request.expiresAt < new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-white">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-blue-50 rounded">
          <Icon className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h4 className="font-medium text-sage-dark">
            {formatExportType(request.type)} Export
          </h4>
          <div className="flex items-center gap-3 text-sage-gray text-sm">
            <span>Requested: {request.requestedAt.toLocaleDateString()}</span>
            {request.size && <span>• {request.size}</span>}
            {isExpiringSoon && request.status === 'ready' && (
              <span className="text-yellow-600 font-medium">• Expires soon</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <StatusBadge status={request.status} />
        
        {isDownloadable && (
          <button
            onClick={() => onDownload?.(request.downloadUrl!)}
            className="btn-sage-primary text-sm flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        )}
      </div>
    </div>
  );
}

export default DataExportCard;