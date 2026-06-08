import { useToast } from '@/components/ui/ToastProvider';
import { useDebouncedRefresh } from './useDebouncedRefresh';
import { useCallback } from 'react';

interface OptimisticActionOptions<TState> {
    backup: () => TState;
    update: () => void;
    action: () => Promise<any>;
    rollback: (backupState: TState) => void;
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: (result: any) => void;
    refresh?: () => void;
    refreshDelay?: number;
}

export function useOptimisticAction() {
    const { success: toastSuccess, error: toastError } = useToast();
    const debounceRefresh = useDebouncedRefresh();

    const performAction = useCallback(async <TState>(options: OptimisticActionOptions<TState>) => {
        const backupState = options.backup();
        
        // Execute optimistic update on UI state immediately
        options.update();
        
        if (options.successMessage) {
            toastSuccess(options.successMessage);
        }
        
        try {
            const result = await options.action();
            if (options.onSuccess) {
                options.onSuccess(result);
            }
            if (options.refresh) {
                debounceRefresh(options.refresh, options.refreshDelay ?? 500);
            }
            return result;
        } catch (err: any) {
            console.error('Optimistic action failed:', err);
            
            // Revert state if action fails
            options.rollback(backupState);
            
            const errMsg = err.response?.data?.error || err.message || options.errorMessage || 'Action failed';
            toastError(errMsg);
            throw err;
        }
    }, [toastSuccess, toastError, debounceRefresh]);

    return performAction;
}
