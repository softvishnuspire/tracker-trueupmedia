import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Calendar, Video, FileText, CheckCircle2, Clock, History as HistoryIcon, ChevronRight } from 'lucide-react-native';
import { employeeApi, ContentItem } from '../../services/api';
import { format, isToday, isBefore, parseISO, startOfToday } from 'date-fns';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';

export default function EmployeeDashboard() {
  const { userData } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<ContentItem[]>([]);
  const router = useRouter();

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await employeeApi.getTasks();
      setTasks(res.data || []);
    } catch (err) {
      console.error('Failed to load Employee dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const todayTasks = tasks.filter(t => isToday(parseISO(t.scheduled_datetime || '')));
  const previousTasks = tasks.filter(t => isBefore(parseISO(t.scheduled_datetime || ''), startOfToday()));

  const TaskCard = ({ task }: { task: ContentItem }) => {
    const statusUpper = (task.status || '').toUpperCase();
    const isApproved = ['APPROVED', 'WAITING FOR POSTING', 'POSTED'].includes(statusUpper);
    
    let statusLabel = task.status || 'Pending';
    let badgeColor = '#F59E0B'; // Pending
    let badgeBg = '#FEF3C7';
    
    if (isApproved) {
        statusLabel = 'Approved';
        badgeColor = '#10B981';
        badgeBg = '#D1FAE5';
    } else if (statusUpper === 'PENDING' || statusUpper === 'CONTENT NOT STARTED') {
        statusLabel = 'Not Started';
        badgeColor = '#6B7280';
        badgeBg = '#F3F4F6';
    } else if (statusUpper === 'WAITING FOR APPROVAL' || statusUpper === 'WAITING FOR FINAL APPROVAL') {
        statusLabel = 'Waiting Approval';
        badgeColor = '#6366F1';
        badgeBg = '#E0E7FF';
    }

    const Icon = task.content_type === 'Reel' || task.content_type === 'YouTube' ? Video : FileText;

    return (
      <TouchableOpacity style={styles.taskCard} onPress={() => router.push('/calendar')}>
        <View style={styles.taskHeader}>
          <View style={styles.taskTypeBadge}>
            <Icon size={14} color="#4F46E5" />
            <Text style={styles.taskTypeText}>
              {(task.content_type === 'Special Poster' || task.content_type === 'Special Day Poster' ? '🎉 ' : '') + task.content_type}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
            {isApproved ? <CheckCircle2 size={12} color={badgeColor} /> : <Clock size={12} color={badgeColor} />}
            <Text style={[styles.statusText, { color: badgeColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <Text style={styles.taskTitle}>{task.title || 'Untitled Task'}</Text>
        <Text style={styles.taskClient}>{task.clients?.company_name || 'Freelancer Task'}</Text>

        <View style={styles.taskFooter}>
          <View style={styles.taskDate}>
            <Calendar size={14} color="#6B7280" />
            <Text style={styles.taskDateText}>Due: {format(parseISO(task.scheduled_datetime), 'MMM do')}</Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Daily Task Management</Text>
        <Text style={styles.pageSubtitle}>
          {format(new Date(), 'EEEE, MMMM do')} • You have {todayTasks.length} assignments today.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Calendar size={20} color="#4F46E5" />
          <Text style={styles.sectionTitle}>Today's Assignments</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{todayTasks.length}</Text>
          </View>
        </View>

        {todayTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CheckCircle2 size={40} color="#10B981" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Tasks for Today</Text>
            <Text style={styles.emptyText}>Enjoy your day! Check back later for new assignments.</Text>
          </View>
        ) : (
          todayTasks.map(task => <TaskCard key={task.id} task={task} />)
        )}
      </View>

      {previousTasks.length > 0 && (
        <View style={[styles.section, { marginTop: 24 }]}>
          <View style={styles.sectionHeader}>
            <HistoryIcon size={20} color="#F59E0B" />
            <Text style={[styles.sectionTitle, { color: '#B45309' }]}>Previous Assignments</Text>
            <View style={[styles.countBadge, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.countText, { color: '#B45309' }]}>{previousTasks.length}</Text>
            </View>
          </View>
          {previousTasks.map(task => <TaskCard key={task.id} task={task} />)}
        </View>
      )}

      <View style={styles.quickActionsContainer}>
        <Text style={styles.quickActionTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/calendar')}>
          <View style={styles.actionIconBox}>
            <Calendar size={20} color="#4F46E5" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>View Full Calendar</Text>
            <Text style={styles.actionSubtitle}>Check your schedule for the entire month</Text>
          </View>
          <ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 24 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  pageSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#4F46E5', flex: 1 },
  countBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  countText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 14 },
  
  emptyContainer: { padding: 32, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },

  taskCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  taskTypeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  taskTypeText: { color: '#4F46E5', fontSize: 12, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  
  taskTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  taskClient: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  taskDate: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  taskDateText: { fontSize: 13, color: '#6B7280' },

  quickActionsContainer: { marginTop: 24 },
  quickActionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  actionIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  actionTextContainer: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  actionSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
});
