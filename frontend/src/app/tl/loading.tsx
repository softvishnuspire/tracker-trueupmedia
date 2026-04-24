import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function TLLoading() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar Loading Area */}
      <div className="w-72 border-r border-border bg-surface/30 p-6 space-y-8 hidden md:block">
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="space-y-6">
          <Skeleton className="h-4 w-24 mb-4" />
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-4 flex-1 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Loading Area */}
      <div className="flex-1 p-8 space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64 rounded-2xl" />
            <Skeleton className="h-4 w-80 opacity-50" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-48 rounded-xl" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl glass-morphism p-8">
          <div className="grid grid-cols-7 gap-4">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="aspect-square border border-border/30 rounded-2xl p-2 space-y-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-12 w-full rounded-xl opacity-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
