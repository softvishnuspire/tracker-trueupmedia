'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  isExiting?: boolean;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, isExiting: true } : t));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200); // match toast-exit animation speed
  }, []);

  const triggerToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, type };
    setToasts((prev) => [...prev, newToast]);

    let duration = 3000;
    if (type === 'warning') duration = 5000;
    else if (type === 'error') duration = 6000;

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const success = useCallback((msg: string) => triggerToast(msg, 'success'), [triggerToast]);
  const warning = useCallback((msg: string) => triggerToast(msg, 'warning'), [triggerToast]);
  const error = useCallback((msg: string) => triggerToast(msg, 'error'), [triggerToast]);
  const info = useCallback((msg: string) => triggerToast(msg, 'info'), [triggerToast]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} className="text-emerald-500 shrink-0" style={{ color: 'var(--success)' }} />;
      case 'warning':
        return <AlertTriangle size={18} className="text-amber-500 shrink-0" style={{ color: 'var(--warning)' }} />;
      case 'error':
        return <XCircle size={18} className="text-red-500 shrink-0" style={{ color: 'var(--danger)' }} />;
      case 'info':
      default:
        return <Info size={18} className="text-indigo-500 shrink-0" style={{ color: 'var(--accent)' }} />;
    }
  };

  const value = useMemo(() => ({
    toast: triggerToast,
    success,
    warning,
    error,
    info
  }), [triggerToast, success, warning, error, info]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`premium-toast ${t.type} ${t.isExiting ? 'toast-exit' : ''}`}
          >
            {getIcon(t.type)}
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
