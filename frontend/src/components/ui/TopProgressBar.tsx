'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface PageLoadingContextType {
  startLoading: () => void;
  stopLoading: () => void;
  isLoading: boolean;
}

const PageLoadingContext = createContext<PageLoadingContextType | undefined>(undefined);

export function usePageLoading() {
  const context = useContext(PageLoadingContext);
  if (!context) {
    throw new Error('usePageLoading must be used within a PageLoadingProvider');
  }
  return context;
}

export function PageLoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'finished'>('idle');

  const startLoading = () => {
    setStatus('loading');
    setIsLoading(true);
  };

  const stopLoading = () => {
    setStatus('finished');
    setTimeout(() => {
      setStatus('idle');
      setIsLoading(false);
    }, 500); // Allow time for exit/fade animation
  };

  return (
    <PageLoadingContext.Provider value={{ startLoading, stopLoading, isLoading }}>
      {children}
      {status !== 'idle' && (
        <div className="top-progress-bar-container">
          <div className={`top-progress-bar ${status}`} />
        </div>
      )}
    </PageLoadingContext.Provider>
  );
}
