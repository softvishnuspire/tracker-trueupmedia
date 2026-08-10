import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminDashboard from '../../components/admin/AdminDashboard';
import GMDashboard from '../../components/gm/GMDashboard';
import TLDashboard from '../../components/tl/TLDashboard';
import PHDashboard from '../../components/ph/PHDashboard';
import PostingDashboard from '../../components/posting/PostingDashboard';
import ContentHeadDashboard from '../../components/content-head/ContentHeadDashboard';
import EmployeeDashboard from '../../components/employee/EmployeeDashboard';
import RoleDashboard from '../../components/dashboard/RoleDashboard';

import { useTheme } from '../../hooks/use-theme';

export default function DashboardScreen() {
  const { userData } = useAuthStore();
  const role = userData?.role?.toLowerCase() || '';
  const theme = useTheme();

  if (role === 'admin') {
    return <AdminDashboard />;
  }

  if (role === 'gm' || role === 'general manager' || role === 'coo') {
    return <GMDashboard />;
  }

  if (role === 'tl' || role === 'team lead' || role.startsWith('tl')) {
    return <TLDashboard />;
  }

  if (role === 'ph' || role === 'production head') {
    return <PHDashboard />;
  }

  if (role === 'posting' || role === 'posting team') {
    return <PostingDashboard />;
  }

  if (role === 'content head') {
    return <ContentHeadDashboard />;
  }

  if (role === 'employee' || role === 'writer' || role === 'editor' || role === 'designer' || role === 'video editor') {
    return <EmployeeDashboard />;
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.background }}>
      <RoleDashboard />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scroll: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 16,
    color: '#6B7280',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  roleText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
  },
  cardText: {
    color: '#6B7280',
  },
});
