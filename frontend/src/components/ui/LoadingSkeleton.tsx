import React from 'react';
import { cn } from '../../lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  className, 
  lines = 1 
}) => {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-4 bg-gray-200 rounded',
            i === lines - 1 && lines > 1 && 'w-3/4',
            className
          )}
        />
      ))}
    </div>
  );
};