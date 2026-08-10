import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FileText, Video, ChevronRight, Calendar, ShieldAlert, Clock, CheckCircle2 } from 'lucide-react-native';
import { postingApi, emergencyApi, dashboardApi, ContentItem } from '../../services/api';
import { format, isSameDay, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';

export default function PostingDashboard() {
  const [loading, setLoading] = useState(true);
  const [pendingTasks, setPendingTasks] = useState<ContentItem[]>([]);
  const [emergencyTasks, setEmergencyTasks] = useState<ContentItem[]>([]);
  const [todayStats, setTodayStats] = useState({ total: 0, completed: 0, percentage: 0, remaining: 0 });
  
  const router = useRouter();

  const fetchDashboardData = useCallback(async () => {
    try {
      const currentMonthStr = format(new Date(), 'yyyy-MM');
      const [calRes, pendingRes, emergencyRes] = await Promise.all([
        postingApi.getMasterCalendar(currentMonthStr, undefined, undefined, true),
        dashboardApi.getPendingImportant().catch(() => ({ data: [] })),
        emergencyApi.getAll().catch(() => ({ data: [] }))
      ]);
      
      const calendarData = calRes.data || [];
      const today = new Date();
      const todayItems = calendarData.filter(item => isSameDay(parseISO(item.scheduled_datetime), today));
      const totalToday = todayItems.length;
      const completedToday = todayItems.filter(item => (item.status || '').toUpperCase() === 'POSTED').length;
      
      setTodayStats({
        total: totalToday,
        completed: completedToday,
        remaining: totalToday - completedToday,
        percentage: totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0
      });

      const allPending = pendingRes.data || [];
      const allEmergency = emergencyRes.data || [];

      setPendingTasks(allPending.filter((t: any) => (t.status || '').toUpperCase() === 'WAITING FOR POSTING'));
      setEmergencyTasks(allEmergency.filter((t: any) => (t.status || '').toUpperCase() === 'WAITING FOR POSTING'));

    } catch (err) {
      console.error('Failed to load Posting dashboard data:', err);
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

  const StatCard = ({ title, icon: Icon, mainValue, totalValue, label, isFirst = false, isCompleted = false }: any) => {
    const percentage = totalValue > 0 ? Math.round((mainValue / totalValue) * 100) : 0;
    return (
      <View style={[styles.statCard, isFirst && styles.statCardFirst, isCompleted && { borderLeftColor: '#10B981' }]}>
        <View style={styles.cardTop}>
          <Text style={styles.statLabel}>{title}</Text>
          <Icon size={20} color={isCompleted ? "#10B981" : "#6B7280"} />
        </View>
        <View style={styles.cardMain}>
          <View style={styles.valueGroup}>
            <Text style={styles.mainValue}>{mainValue}</Text>
            {totalValue !== undefined && (
              <>
                <Text style={styles.separator}>/</Text>
                <Text style={styles.totalValue}>{totalValue}</Text>
              </>
            )}
          </View>
        </View>
        {totalValue !== undefined && (
          <View style={styles.cardFooter}>
            <View style={styles.percentageInfo}>
              <Text style={styles.pctValue}>{percentage}%</Text>
              <Text style={styles.pctLabel}>{label}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: isCompleted ? '#10B981' : '#4F46E5' }]} />
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Posting Team</Text>
        <Text style={styles.pageSubtitle}>Today's Queue & Posting Pipeline</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard 
          title="TODAY'S POSTS" 
          icon={Calendar} 
          mainValue={todayStats.completed} 
          totalValue={todayStats.total}
          label="Posted"
          isFirst
        />
        <StatCard 
          title="REMAINING" 
          icon={Clock} 
          mainValue={todayStats.remaining} 
          label="To post today"
        />
      </View>

      {emergencyTasks.length > 0 && (
        <View style={styles.emergencyContainer}>
          <View style={styles.emergencyHeader}>
            <ShieldAlert size={20} color="#EF4444" />
            <Text style={styles.emergencyTitle}>Emergency Tasks (Waiting to Post)</Text>
          </View>
          {emergencyTasks.map((task) => (
            <TouchableOpacity key={task.id} style={[styles.taskCard, { borderLeftColor: '#EF4444' }]} onPress={() => router.push('/calendar')}>
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle}>{task.title || 'Emergency Task'}</Text>
                <Text style={styles.taskMeta}>{task.clients?.company_name} • {task.content_type}</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {pendingTasks.length > 0 && (
        <View style={[styles.emergencyContainer, { marginTop: 16, backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
          <View style={styles.emergencyHeader}>
            <Clock size={20} color="#F59E0B" />
            <Text style={[styles.emergencyTitle, { color: '#B45309' }]}>Pending Important (Waiting to Post)</Text>
          </View>
          {pendingTasks.map((task) => (
            <TouchableOpacity key={task.id} style={[styles.taskCard, { borderLeftColor: '#F59E0B' }]} onPress={() => router.push('/calendar')}>
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle}>{task.title || 'Important Task'}</Text>
                <Text style={styles.taskMeta}>{task.clients?.company_name} • {task.status}</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {emergencyTasks.length === 0 && pendingTasks.length === 0 && (
        <View style={styles.allCaughtUp}>
          <CheckCircle2 size={40} color="#10B981" style={{ marginBottom: 12 }} />
          <Text style={styles.caughtUpTitle}>All Caught Up!</Text>
          <Text style={styles.caughtUpText}>No pending tasks waiting for posting.</Text>
        </View>
      )}

      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/calendar')}>
          <View style={styles.actionIconBox}>
            <Calendar size={20} color="#4F46E5" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Master Calendar</Text>
            <Text style={styles.actionSubtitle}>View all scheduled content</Text>
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
  statsGrid: { flexDirection: 'row', gap: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#E5E7EB' },
  statCardFirst: { borderLeftColor: '#4F46E5' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', letterSpacing: 0.5 },
  cardMain: { marginBottom: 12 },
  valueGroup: { flexDirection: 'row', alignItems: 'baseline' },
  mainValue: { fontSize: 28, fontWeight: '800', color: '#111827' },
  separator: { fontSize: 16, color: '#9CA3AF', marginHorizontal: 4 },
  totalValue: { fontSize: 16, color: '#6B7280', fontWeight: '600' },
  cardFooter: { gap: 8 },
  percentageInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pctValue: { fontWeight: '700', color: '#111827', fontSize: 12 },
  pctLabel: { color: '#6B7280', fontSize: 12 },
  progressTrack: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4F46E5', borderRadius: 3 },
  
  emergencyContainer: { marginTop: 24, backgroundColor: '#FEF2F2', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FEE2E2' },
  emergencyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  emergencyTitle: { fontSize: 16, fontWeight: 'bold', color: '#991B1B' },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, borderLeftWidth: 4 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  taskMeta: { fontSize: 12, color: '#6B7280' },

  allCaughtUp: { marginTop: 24, padding: 32, backgroundColor: '#ECFDF5', borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#D1FAE5' },
  caughtUpTitle: { fontSize: 18, fontWeight: 'bold', color: '#065F46', marginBottom: 8 },
  caughtUpText: { fontSize: 14, color: '#047857' },

  quickActionsContainer: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  actionIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  actionTextContainer: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  actionSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
});
