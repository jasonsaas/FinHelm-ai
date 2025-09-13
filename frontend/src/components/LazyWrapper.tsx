import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

const DefaultFallback = ({ className }: { className?: string }) => (
  <div className={`flex items-center justify-center p-8 ${className}`}>
    <div className="flex items-center space-x-2">
      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      <span className="text-gray-500">Loading component...</span>
    </div>
  </div>
);

export const LazyWrapper = React.memo<LazyWrapperProps>(function LazyWrapper({ 
  children, 
  fallback,
  className 
}) {
  return (
    <Suspense fallback={fallback || <DefaultFallback className={className} />}>
      {children}
    </Suspense>
  );
});

export default LazyWrapper;