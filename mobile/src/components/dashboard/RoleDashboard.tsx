import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { tlApi, employeeApi, postingApi, phApi, ContentItem } from '../../services/api';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, Circle, FileText, Video, ChevronRight, Calendar } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function RoleDashboard() {
  const { userData } = useAuthStore();
  const role = userData?.role?.toLowerCase() || '';
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<ContentItem[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      let data: ContentItem[] = [];
      const currentMonthStr = format(new Date(), 'yyyy-MM');

      if (role.includes('tl') || role.includes('team lead')) {
        const res = await tlApi.getMasterCalendar(currentMonthStr, userData?.id || '');
        data = res.data || [];
      } else if (role.includes('employee') || role.includes('writer') || role.includes('editor')) {
        const res = await employeeApi.getTasks(currentMonthStr);
        data = res.data || [];
      } else if (role.includes('posting')) {
        const res = await postingApi.getToday();
        data = res.data || [];
      } else if (role.includes('ph') || role.includes('production')) {
        const res = await phApi.getToday();
        data = res.data || [];
      } else {
        // Fallback generic tasks
        const res = await phApi.getToday();
        data = res.data || [];
      }

      setTasks(data);

      // Calculate stats
      const total = data.length;
      const completed = data.filter(t => {
        const s = (t.status || '').toUpperCase();
        return s === 'POSTED' || s === 'WAITING FOR POSTING' || s === 'COMPLETED';
      }).length;

      setStats({ total, completed, pending: total - completed });
    } catch (err) {
      console.error('Failed to load role dashboard data', err);
    } finally {
      setLoading(false);
    }
  }, [role, userData?.id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const getStatusIcon = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'POSTED' || s === 'COMPLETED' || s === 'WAITING FOR POSTING') {
      return <CheckCircle2 size={20} color="#10B981" />;
    }
    return <Circle size={20} color="#9CA3AF" />;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome, {userData?.name?.split(' ')[0] || 'User'}</Text>
        <Text style={styles.roleText}>{userData?.role?.toUpperCase()}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Tasks</Text>
          <Text style={styles.statValue}>{stats.total}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Completed</Text>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.completed}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Pending</Text>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pending}</Text>
        </View>
      </View>

      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/calendar')}>
          <View style={styles.actionIconBox}>
            <Calendar size={20} color="#4F46E5" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>View Calendar</Text>
            <Text style={styles.actionSubtitle}>Check all your scheduled tasks</Text>
          </View>
          <ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <View style={styles.tasksSection}>
        <Text style={styles.sectionTitle}>Recent Tasks</Text>
        {tasks.length === 0 ? (
          <View style={styles.emptyTasks}>
            <Text style={styles.emptyTasksText}>No tasks found for your role right now.</Text>
          </View>
        ) : (
          tasks.slice(0, 5).map(task => (
            <TouchableOpacity key={task.id} style={styles.taskCard} onPress={() => router.push('/calendar')}>
              {getStatusIcon(task.status)}
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle} numberOfLines={1}>{task.title || 'Untitled Task'}</Text>
                <Text style={styles.taskMeta}>
                  {task.clients?.company_name} • {format(parseISO(task.scheduled_datetime), 'MMM d, h:mm a')}
                </Text>
              </View>
              <View style={styles.taskTypeIcon}>
                {task.content_type === 'Post' ? <FileText size={16} color="#6B7280" /> : <Video size={16} color="#6B7280" />}
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 24 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  roleText: { fontSize: 14, color: '#4F46E5', fontWeight: '600', marginTop: 4 },
  
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 12 },
  statBox: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  statLabel: { fontSize: 12, color: '#6B7280', marginBottom: 8, fontWeight: '600' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  
  quickActionsContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  actionIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  actionTextContainer: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  actionSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  
  tasksSection: { marginBottom: 16 },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  taskInfo: { flex: 1, marginLeft: 12 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  taskMeta: { fontSize: 12, color: '#6B7280' },
  taskTypeIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  emptyTasks: { padding: 24, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center' },
  emptyTasksText: { color: '#6B7280', fontStyle: 'italic' },
});
