import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rect' }) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'text':
        return 'h-4 w-3/4 rounded';
      case 'circle':
        return 'h-10 w-10 rounded-full';
      case 'rect':
      default:
        return 'h-24 w-full rounded-xl';
    }
  };

  return (
    <div 
      className={`bg-slate-200 dark:bg-slate-800 animate-pulse ${getVariantClass()} ${className}`} 
    />
  );
};

export const CardSkeleton: React.FC = () => (
  <div className="p-5 bg-white dark:bg-[#111723] border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
    <Skeleton className="h-5 w-1/3 mb-4" variant="text" />
    <Skeleton className="h-8 w-1/2 mb-2" variant="text" />
    <Skeleton className="h-4 w-2/3" variant="text" />
  </div>
);

export const TableSkeleton: React.FC = () => (
  <div className="space-y-3">
    <div className="flex gap-4">
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  </div>
);
