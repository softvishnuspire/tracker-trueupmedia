import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { 
  Home, 
  Users, 
  Calendar, 
  User, 
  Menu, 
  X, 
  LogOut, 
  Sun, 
  Moon, 
  Settings2, 
  UserPlus, 
  Activity, 
  Trophy, 
  Globe, 
  ShieldAlert, 
  Clock 
} from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  ActivityIndicator, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Dimensions, 
  ScrollView,
  useColorScheme,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/use-theme';
import { supabase } from '../../utils/supabase';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(width * 0.8, 300);

export const DrawerContext = createContext<{
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}>({
  isOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
});

export const useDrawer = () => useContext(DrawerContext);

export default function TabLayout() {
  const { userData, isLoading, themePreference, setThemePreference } = useAuthStore();
  const themeColors = useTheme();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  const openDrawer = () => {
    setIsOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(slideAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setIsOpen(false);
    });
  };

  const handleLogout = async () => {
    closeDrawer();
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background }}>
        <ActivityIndicator size="large" color={themeColors.accent} />
      </View>
    );
  }

  const role = userData?.role?.toLowerCase() || '';

  const isAdmin = role === 'admin';
  const isGM = role === 'gm' || role === 'general manager';
  const isManager = role === 'manager';
  const isCOO = role === 'coo';
  const isEmployee = role === 'employee';
  const isTL = role === 'tl' || role === 'team lead' || role.startsWith('tl');

  // Define dynamic drawer links based on role
  const drawerLinks = [];

  if (isAdmin) {
    // Admin links matching the website
    drawerLinks.push(
      { name: 'Dashboard', icon: Home, route: '/' },
      { name: 'Clients', icon: Users, route: '/clients' },
      { name: 'Client Calendars', icon: Globe, route: '/client-calendars' },
      { name: 'Team Management', icon: Users, route: '/team' },
      { name: 'Master Calendar', icon: Calendar, route: '/calendar' },
      { name: 'Company Calendar', icon: Clock, route: '/company-calendar' },
      { name: 'System Toggles', icon: Settings2, route: '/system-toggles' },
      { name: 'Employee Tracking', icon: Activity, route: '/employee-tracking' },
      { name: 'Streak System', icon: Trophy, route: '/streak-system' }
    );
  } else {
    // Normal role links
    drawerLinks.push({ name: 'Dashboard', icon: Home, route: '/' });

    if (isAdmin || isGM || isManager || isCOO) {
      drawerLinks.push({ name: 'Clients', icon: Users, route: '/clients' });
    }

    if (isAdmin || isGM || isCOO || isTL || isManager) {
      drawerLinks.push({ name: 'Calendar', icon: Calendar, route: '/calendar' });
    }

    if (isAdmin || isCOO) {
      drawerLinks.push({ name: 'Team', icon: Users, route: '/team' });
    }
  }

  const navigateTo = (route: string) => {
    closeDrawer();
    // Route mapping
    if (route === '/') {
      router.replace('/(tabs)');
    } else {
      router.replace(`/(tabs)${route}` as any);
    }
  };

  const isRouteActive = (route: string) => {
    if (route === '/') {
      return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/';
    }
    return pathname.includes(route);
  };

  return (
    <DrawerContext.Provider value={{ isOpen, openDrawer, closeDrawer }}>
      <View style={{ flex: 1, backgroundColor: themeColors.background }}>
        
        {/* Main Tabs Area */}
        <View style={{ flex: 1 }}>
          <Tabs
            screenOptions={{
              headerShown: true,
              headerLeft: () => (
                <TouchableOpacity onPress={openDrawer} style={{ marginLeft: 16, padding: 4 }}>
                  <Menu size={24} color={themeColors.text} />
                </TouchableOpacity>
              ),
              headerStyle: {
                backgroundColor: themeColors.surface,
                shadowColor: 'transparent',
                elevation: 0,
                borderBottomWidth: 1,
                borderBottomColor: themeColors.border,
              },
              headerTitleStyle: {
                color: themeColors.text,
                fontWeight: 'bold',
                fontSize: 18,
              },
              headerTintColor: themeColors.text,
              tabBarStyle: {
                display: 'none', // completely hide the bottom tabs!
              }
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: 'Dashboard',
              }}
            />
            <Tabs.Screen
              name="clients"
              options={{
                title: 'Clients',
                href: (isAdmin || isGM || isManager || isCOO) ? '/clients' : null,
              }}
            />
            <Tabs.Screen
              name="calendar"
              options={{
                title: 'Master Calendar',
                href: (isAdmin || isGM || isCOO || isTL || isManager) ? '/calendar' : null,
              }}
            />
            <Tabs.Screen
              name="team"
              options={{
                title: 'Team Management',
                href: (isAdmin || isCOO) ? '/team' : null,
              }}
            />

            <Tabs.Screen
              name="profile"
              options={{
                title: 'Profile',
                href: null,
              }}
            />
            {/* New Admin screens routes (href: null to keep hidden from default routing linkers if any) */}
            <Tabs.Screen
              name="client-calendars"
              options={{
                title: 'Client Calendars',
                href: null,
              }}
            />
            <Tabs.Screen
              name="company-calendar"
              options={{
                title: 'Company Calendar',
                href: null,
              }}
            />
            <Tabs.Screen
              name="system-toggles"
              options={{
                title: 'System Toggles',
                href: null,
              }}
            />
            <Tabs.Screen
              name="employee-tracking"
              options={{
                title: 'Employee Tracking',
                href: null,
              }}
            />
            <Tabs.Screen
              name="streak-system"
              options={{
                title: 'Streak System',
                href: null,
              }}
            />
          </Tabs>
        </View>

        {/* Custom Slide-Out Left Drawer */}
        {isOpen && (
          <TouchableOpacity
            activeOpacity={1}
            onPress={closeDrawer}
            style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }, { zIndex: 1000 }]}
          >
            <Animated.View 
              style={[
                styles.backdrop, 
                {
                  opacity: slideAnim.interpolate({
                    inputRange: [-DRAWER_WIDTH, 0],
                    outputRange: [0, 0.5]
                  })
                }
              ]} 
            />
          </TouchableOpacity>
        )}

        <Animated.View
          style={[
            styles.drawerContainer,
            {
              width: DRAWER_WIDTH,
              backgroundColor: themeColors.surface,
              borderRightColor: themeColors.border,
              transform: [{ translateX: slideAnim }],
              zIndex: 1001,
            }
          ]}
        >
          <SafeAreaView style={{ flex: 1 }}>
            {/* Logo and close button */}
            <View style={[styles.drawerHeader, { borderBottomColor: themeColors.border }]}>
              <View style={styles.logoBox}>
                <Image 
                  source={require('../../../assets/images/logo.png')} 
                  style={{ width: 110, height: 32, resizeMode: 'contain' }} 
                />
                {role && (
                  <View style={[styles.roleBadge, { backgroundColor: themeColors.elevated, borderColor: themeColors.border, marginLeft: 8 }]}>
                    <Text style={[styles.roleBadgeText, { color: themeColors.accent }]}>
                      {role.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={closeDrawer} style={{ padding: 4 }}>
                <X size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Navigation links list */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 12 }}>
              <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>NAVIGATION</Text>
              {drawerLinks.map((link, idx) => {
                const Icon = link.icon;
                const active = isRouteActive(link.route);
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => navigateTo(link.route)}
                    style={[
                      styles.navItem,
                      active && { 
                        backgroundColor: themeColors.elevated, 
                        borderLeftColor: themeColors.accent 
                      }
                    ]}
                  >
                    <Icon 
                      size={20} 
                      color={active ? themeColors.accent : themeColors.textSecondary} 
                      style={{ marginRight: 12 }} 
                    />
                    <Text 
                      style={[
                        styles.navItemText, 
                        { color: active ? themeColors.text : themeColors.textSecondary }
                      ]}
                    >
                      {link.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Footer with Appearance, User Info & Logout */}
            <View style={[styles.drawerFooter, { borderTopColor: themeColors.border }]}>
              {/* Appearance row */}
              <TouchableOpacity 
                style={styles.footerRow}
                onPress={() => setThemePreference(themePreference === 'dark' ? 'light' : 'dark')}
              >
                <Text style={[styles.footerLabel, { color: themeColors.textMuted }]}>APPEARANCE</Text>
                <View style={styles.themeToggleBox}>
                  {themePreference === 'dark' ? (
                    <Moon size={16} color={themeColors.accent} />
                  ) : (
                    <Sun size={16} color={themeColors.accent} />
                  )}
                  <Text style={[styles.themeToggleText, { color: themeColors.textSecondary }]}>
                    {themePreference === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* User details */}
              <View style={[styles.userInfoContainer, { backgroundColor: themeColors.elevated }]}>
                <View style={[styles.avatar, { backgroundColor: themeColors.background }]}>
                  <User size={18} color={themeColors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userName, { color: themeColors.text }]} numberOfLines={1}>
                    {userData?.name || 'Administrator'}
                  </Text>
                  <Text style={[styles.userEmail, { color: themeColors.textMuted }]} numberOfLines={1}>
                    {userData?.email || 'admin@trueupmedia.com'}
                  </Text>
                </View>
              </View>

              {/* Logout button */}
              <TouchableOpacity 
                onPress={handleLogout}
                style={[styles.logoutBtn, { borderColor: themeColors.danger + '40' }]}
              >
                <LogOut size={16} color={themeColors.danger} style={{ marginRight: 8 }} />
                <Text style={[styles.logoutText, { color: themeColors.danger }]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>

      </View>
    </DrawerContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRightWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  logoBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  logoSub: {
    fontSize: 20,
    fontWeight: '300',
    marginRight: 8,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  navItemText: {
    fontSize: 14,
    fontWeight: '600',
  },
  drawerFooter: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  footerLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  themeToggleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  themeToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 11,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
