import { useRef, useCallback, useEffect } from 'react';

export function useDebouncedRefresh() {
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const debounceRefresh = useCallback((callback: () => void, delay = 500) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            callback();
        }, delay);
    }, []);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return debounceRefresh;
}
