import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Layers, Video, FileText, Film, ChevronRight, Calendar, Users, ShieldAlert, Clock } from 'lucide-react-native';
import { gmApi, emergencyApi, dashboardApi, ContentItem } from '../../services/api';
import { format, isSameMonth, parseISO } from 'date-fns';
import { isCrossMonthRescheduled } from '../../utils/calendarUtils';
import { useRouter } from 'expo-router';

const shootDoneStatuses = [
    'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
];

export default function GMDashboard() {
  const [loading, setLoading] = useState(true);
  const [globalCalendarData, setGlobalCalendarData] = useState<ContentItem[]>([]);
  const [currentMonth] = useState(new Date());
  
  const router = useRouter();

  const [emergencyTasks, setEmergencyTasks] = useState<ContentItem[]>([]);
  const [pendingTasks, setPendingTasks] = useState<ContentItem[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const currentMonthStr = format(currentMonth, 'yyyy-MM');
      const [globalRes, emergencyRes, pendingRes] = await Promise.all([
        gmApi.getMasterCalendar(currentMonthStr),
        emergencyApi.getAll().catch(() => ({ data: [] })),
        dashboardApi.getPendingImportant().catch(() => ({ data: [] }))
      ]);
      setGlobalCalendarData(globalRes.data || []);
      setEmergencyTasks(emergencyRes.data || []);
      setPendingTasks(pendingRes.data || []);
    } catch (err) {
      console.error('Failed to load GM dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

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

  const globalMonthCounts = globalCalendarData.filter(item => {
    const itemDate = parseISO(item.scheduled_datetime);
    return isSameMonth(itemDate, currentMonth) && !isCrossMonthRescheduled(item);
  }).reduce(
    (acc, item) => {
      const status = (item.status || '').toUpperCase();
      const type = (item.content_type || '').toUpperCase();
      const isShot = shootDoneStatuses.includes(status);
      const isDone = status === 'POSTED' || status === 'WAITING FOR POSTING' || status === 'COMPLETED' || status === 'SCHEDULED';

      if (type === 'REEL' || type === 'YOUTUBE') {
        acc.totalReels += 1;
        if (isShot) acc.shotReels += 1;
        if (isDone) acc.doneReels += 1;
      } else if (type === 'POST') {
        acc.totalPosts += 1;
        if (isShot) acc.shotPosts += 1;
        if (isDone) acc.donePosts += 1;
      }
      return acc;
    },
    { totalReels: 0, totalPosts: 0, shotReels: 0, shotPosts: 0, doneReels: 0, donePosts: 0 }
  );

  const activeStats = {
    totalReels: globalMonthCounts.totalReels,
    totalPosts: globalMonthCounts.totalPosts,
    shotReels: globalMonthCounts.shotReels,
    shotPosts: globalMonthCounts.shotPosts,
    doneReels: globalMonthCounts.doneReels,
    donePosts: globalMonthCounts.donePosts,
  };

  const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);

  const StatCard = ({ title, icon: Icon, mainValue, totalValue, label, isFirst = false }: any) => {
    const percentage = pct(mainValue, totalValue);
    return (
      <View style={[styles.statCard, isFirst && styles.statCardFirst]}>
        <View style={styles.cardTop}>
          <Text style={styles.statLabel}>{title}</Text>
          <Icon size={20} color="#6B7280" />
        </View>
        <View style={styles.cardMain}>
          <View style={styles.valueGroup}>
            <Text style={styles.mainValue}>{mainValue}</Text>
            <Text style={styles.separator}>/</Text>
            <Text style={styles.totalValue}>{totalValue}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.percentageInfo}>
            <Text style={styles.pctValue}>{percentage}%</Text>
            <Text style={styles.pctLabel}>{label}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${percentage}%` }]} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>GM Operations</Text>
        <Text style={styles.pageSubtitle}>Company-wide tracking and progress</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard 
          title="MONTHLY PIPELINE" 
          icon={Layers} 
          mainValue={activeStats.shotReels + activeStats.shotPosts} 
          totalValue={activeStats.totalReels + activeStats.totalPosts}
          label="Shot"
          isFirst
        />
        <StatCard 
          title="REELS PROGRESS" 
          icon={Video} 
          mainValue={activeStats.doneReels} 
          totalValue={activeStats.totalReels}
          label="Done"
        />
        <StatCard 
          title="POSTS PROGRESS" 
          icon={FileText} 
          mainValue={activeStats.donePosts} 
          totalValue={activeStats.totalPosts}
          label="Done"
        />
      </View>

      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/calendar')}>
          <View style={styles.actionIconBox}>
            <Calendar size={20} color="#4F46E5" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Master Calendar</Text>
            <Text style={styles.actionSubtitle}>View and manage all content schedules</Text>
          </View>
          <ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, { marginTop: 12 }]} onPress={() => router.push('/clients')}>
          <View style={styles.actionIconBox}>
            <Users size={20} color="#4F46E5" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Client Management</Text>
            <Text style={styles.actionSubtitle}>Review allocations and client details</Text>
          </View>
          <ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {emergencyTasks.length > 0 && (
        <View style={styles.emergencyContainer}>
          <View style={styles.emergencyHeader}>
            <ShieldAlert size={20} color="#EF4444" />
            <Text style={styles.emergencyTitle}>Emergency Tasks</Text>
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
        <View style={[styles.emergencyContainer, { marginTop: 16 }]}>
          <View style={styles.emergencyHeader}>
            <Clock size={20} color="#F59E0B" />
            <Text style={[styles.emergencyTitle, { color: '#B45309' }]}>Pending Important</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 24 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  pageSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  statsGrid: { gap: 16 },
  statCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#E5E7EB' },
  statCardFirst: { borderLeftColor: '#4F46E5' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', letterSpacing: 0.5 },
  cardMain: { marginBottom: 16 },
  valueGroup: { flexDirection: 'row', alignItems: 'baseline' },
  mainValue: { fontSize: 32, fontWeight: '800', color: '#111827' },
  separator: { fontSize: 20, color: '#9CA3AF', marginHorizontal: 4 },
  totalValue: { fontSize: 20, color: '#6B7280', fontWeight: '600' },
  cardFooter: { gap: 8 },
  percentageInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pctValue: { fontWeight: '700', color: '#111827', fontSize: 14 },
  pctLabel: { color: '#6B7280', fontSize: 14 },
  progressTrack: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4F46E5', borderRadius: 3 },
  quickActionsContainer: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  actionIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  actionTextContainer: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  actionSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  emergencyContainer: { marginTop: 24, backgroundColor: '#FEF2F2', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FEE2E2' },
  emergencyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  emergencyTitle: { fontSize: 16, fontWeight: 'bold', color: '#991B1B' },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, borderLeftWidth: 4 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  taskMeta: { fontSize: 12, color: '#6B7280' },
});
