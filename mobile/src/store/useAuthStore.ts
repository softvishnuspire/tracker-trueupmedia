import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';

interface UserData {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    role_identifier?: string;
}

interface AuthState {
    session: Session | null;
    userData: UserData | null;
    isLoading: boolean;
    themePreference: 'light' | 'dark' | 'system';
    setSession: (session: Session | null) => void;
    setUserData: (userData: UserData | null) => void;
    setLoading: (isLoading: boolean) => void;
    setThemePreference: (theme: 'light' | 'dark' | 'system') => void;
    clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    userData: null,
    isLoading: true,
    themePreference: 'dark',
    setSession: (session) => set({ session }),
    setUserData: (userData) => set({ userData }),
    setLoading: (isLoading) => set({ isLoading }),
    setThemePreference: (themePreference) => set({ themePreference }),
    clearAuth: () => set({ session: null, userData: null }),
}));
