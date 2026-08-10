import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme, View, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../utils/supabase';
import { useAuthStore } from '../store/useAuthStore';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#6366F1',
    background: '#060A0F',
    card: '#0C1220',
    text: '#F1F5F9',
    border: 'rgba(255, 255, 255, 0.08)',
    notification: '#6366F1',
  },
};

const CustomDefaultTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6366F1',
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    border: 'rgba(0, 0, 0, 0.08)',
    notification: '#6366F1',
  },
};

import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const loaded = true;

  const { session, setSession, setUserData, setLoading, themePreference } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();


  useEffect(() => {
    const handleSession = async (currentSession: any) => {
      setSession(currentSession);
      if (currentSession?.user) {
        setLoading(true);
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('name, email, role, role_identifier')
            .eq('user_id', currentSession.user.id)
            .single();

          if (userData && !userError) {
            setUserData(userData);
          } else {
            const metadata = currentSession.user.user_metadata;
            setUserData({
              name: metadata?.full_name || currentSession.user.email,
              email: currentSession.user.email,
              role: metadata?.role || 'employee',
              role_identifier: metadata?.role_identifier,
            });
          }
        } catch (err) {
          console.error('Error fetching auto-login user details:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setUserData(null);
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      handleSession(session);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    if (!navigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Redirect to main tabs if authenticated
      router.replace('/(tabs)');
    }
  }, [session, segments, navigationState?.key]);

  if (!loaded) {
    return null;
  }



  const isDark = themePreference === 'system' ? colorScheme === 'dark' : themePreference === 'dark';
  const statusBg = isDark ? '#060A0F' : '#F8FAFC';
  const statusStyle = isDark ? 'light' : 'dark';

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider value={isDark ? CustomDarkTheme : CustomDefaultTheme}>
          <View style={{ flex: 1 }}>
            {/* @ts-ignore */}
            <StatusBar style={statusStyle} backgroundColor={statusBg} translucent={false} />
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
            </Stack>
          </View>
        </ThemeProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
