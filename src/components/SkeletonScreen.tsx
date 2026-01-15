import React from 'react';

interface SkeletonProps {
  type?: 'card' | 'list' | 'detail' | 'header' | 'quote';
  className?: string;
}

export function SkeletonScreen({ type = 'card', className = '' }: SkeletonProps) {
  if (type === 'card') {
    return (
      <div className={`bg-white rounded-2xl border border-gray-100 p-5 animate-pulse ${className}`}>
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-gray-200 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
        <div className="h-20 bg-gray-100 rounded-xl mb-3" />
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 rounded-full w-20" />
          <div className="h-6 bg-gray-200 rounded-full w-16" />
        </div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className={`space-y-3 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
              <div className="h-6 bg-gray-200 rounded-full w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'header') {
    return (
      <div className={`bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-4 animate-pulse ${className}`}>
        <div className="w-10 h-10 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
        <div className="h-6 bg-gray-200 rounded-full w-20" />
      </div>
    );
  }

  if (type === 'quote') {
    return (
      <div className={`bg-white rounded-2xl border border-gray-100 p-5 animate-pulse ${className}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-3 bg-gray-200 rounded w-24" />
            </div>
          </div>
          <div className="space-y-2 text-right">
            <div className="h-5 bg-gray-200 rounded w-24 ml-auto" />
            <div className="h-3 bg-gray-200 rounded w-16 ml-auto" />
          </div>
        </div>
        <div className="h-4 bg-gray-200 rounded-full w-20 mb-4" />
        <div className="space-y-2 mb-4">
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-5/6" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 bg-gray-200 rounded-xl flex-1" />
          <div className="h-10 bg-gray-200 rounded-xl w-24" />
        </div>
      </div>
    );
  }

  // Default: detail page skeleton
  return (
    <div className={`animate-pulse space-y-6 ${className}`}>
      {/* Header Skeleton */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
        <div className="h-6 bg-gray-200 rounded-full w-20" />
      </div>

      {/* Content Skeleton */}
      <div className="max-w-lg mx-auto px-4 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="h-6 bg-gray-200 rounded w-2/3 mb-4" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-5/6" />
            <div className="h-4 bg-gray-100 rounded w-4/6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="h-5 bg-gray-200 rounded w-1/2 mb-3" />
          <div className="space-y-3">
            <div className="h-20 bg-gray-100 rounded-xl" />
            <div className="h-20 bg-gray-100 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant pour loader simple
export function LoadingSpinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`${sizeClasses[size]} border-4 border-brand-500 border-t-transparent rounded-full animate-spin ${className}`} />
  );
}
