import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLoading() {
  return (
    <div className="p-8 space-y-10">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="space-y-3">
          <Skeleton className="h-12 w-72 rounded-2xl" />
          <Skeleton className="h-4 w-96 opacity-60" />
        </div>
        <Skeleton className="h-12 w-48 rounded-xl" />
      </div>

      {/* Admin Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-8 rounded-[2rem] glass-morphism flex items-center gap-6">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Large Data Table Area */}
      <div className="rounded-[2.5rem] glass-morphism p-8 space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-10 w-64 rounded-xl" />
        </div>
        
        <div className="space-y-4">
          <div className="flex gap-4 border-b border-border pb-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-4 flex-1 rounded" />)}
          </div>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex gap-4 items-center">
              {[1, 2, 3, 4, 5].map(j => <Skeleton key={j} className="h-12 flex-1 rounded-xl opacity-80" />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
