import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Layers, Video, FileText, ChevronRight, Calendar, Users, CheckCircle2, Clock } from 'lucide-react-native';
import { gmApi, ContentItem } from '../../services/api';
import { format, isSameMonth, parseISO } from 'date-fns';
import { isCrossMonthRescheduled } from '../../utils/calendarUtils';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';

const approvedStatuses = [
    'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
];

export default function ContentHeadDashboard() {
  const { userData } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [calendarData, setCalendarData] = useState<ContentItem[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<ContentItem[]>([]);
  const [currentMonth] = useState(new Date());
  
  const router = useRouter();

  const fetchDashboardData = useCallback(async () => {
    try {
      const currentMonthStr = format(currentMonth, 'yyyy-MM');
      const calRes = await gmApi.getMasterCalendar(currentMonthStr);
      const data = calRes.data || [];
      setCalendarData(data);

      const unapproved = data.filter((item: ContentItem) => {
        return !approvedStatuses.includes((item.status || '').toUpperCase());
      });
      setPendingApprovals(unapproved);

    } catch (err) {
      console.error('Failed to load Content Head dashboard data:', err);
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

  const isApprovedByContentHead = (status: string) => approvedStatuses.includes((status || '').toUpperCase());

  const globalMonthCounts = calendarData.filter(item => {
    const itemDate = parseISO(item.scheduled_datetime);
    return isSameMonth(itemDate, currentMonth) && !isCrossMonthRescheduled(item);
  }).reduce(
    (acc, item) => {
      const type = (item.content_type || '').toUpperCase();
      const status = (item.status || '').toUpperCase();
      const isApproved = isApprovedByContentHead(status);

      if (type === 'REEL' || type === 'YOUTUBE') {
        acc.totalReels += 1;
        if (isApproved) acc.approvedReels += 1;
      } else if (type === 'POST') {
        acc.totalPosts += 1;
        if (isApproved) acc.approvedPosts += 1;
      }
      return acc;
    },
    { totalReels: 0, totalPosts: 0, approvedReels: 0, approvedPosts: 0 }
  );

  const activeStats = {
    totalReels: globalMonthCounts.totalReels,
    totalPosts: globalMonthCounts.totalPosts,
    approvedReels: globalMonthCounts.approvedReels,
    approvedPosts: globalMonthCounts.approvedPosts,
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
        <Text style={styles.pageTitle}>Content Head</Text>
        <Text style={styles.pageSubtitle}>Approval queue and content pipeline</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard 
          title="MONTHLY APPROVALS" 
          icon={CheckCircle2} 
          mainValue={activeStats.approvedReels + activeStats.approvedPosts} 
          totalValue={activeStats.totalReels + activeStats.totalPosts}
          label="Approved"
          isFirst
        />
        <StatCard 
          title="REELS APPROVED" 
          icon={Video} 
          mainValue={activeStats.approvedReels} 
          totalValue={activeStats.totalReels}
          label="Approved"
        />
        <StatCard 
          title="POSTS APPROVED" 
          icon={FileText} 
          mainValue={activeStats.approvedPosts} 
          totalValue={activeStats.totalPosts}
          label="Approved"
        />
      </View>

      <View style={styles.queueContainer}>
        <View style={styles.queueHeader}>
          <Clock size={20} color="#F59E0B" />
          <Text style={styles.queueTitle}>Pending Approvals</Text>
        </View>
        
        {pendingApprovals.length === 0 ? (
          <View style={styles.allCaughtUp}>
            <CheckCircle2 size={32} color="#10B981" style={{ marginBottom: 8 }} />
            <Text style={styles.caughtUpTitle}>Queue Empty</Text>
            <Text style={styles.caughtUpText}>No tasks waiting for content approval.</Text>
          </View>
        ) : (
          pendingApprovals.slice(0, 5).map((task) => (
            <TouchableOpacity key={task.id} style={styles.taskCard} onPress={() => router.push('/calendar')}>
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle}>{task.title || 'Untitled Task'}</Text>
                <Text style={styles.taskMeta}>{task.clients?.company_name} • {task.content_type} • {format(parseISO(task.scheduled_datetime), 'MMM d')}</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))
        )}
        
        {pendingApprovals.length > 5 && (
          <TouchableOpacity style={styles.viewAllButton} onPress={() => router.push('/calendar')}>
            <Text style={styles.viewAllText}>View All ({pendingApprovals.length}) in Calendar</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/calendar')}>
          <View style={styles.actionIconBox}>
            <Calendar size={20} color="#4F46E5" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Master Calendar</Text>
            <Text style={styles.actionSubtitle}>Review and approve all content</Text>
          </View>
          <ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, { marginTop: 12 }]} onPress={() => router.push('/clients')}>
          <View style={styles.actionIconBox}>
            <Users size={20} color="#4F46E5" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Writers & Team</Text>
            <Text style={styles.actionSubtitle}>Manage content writers</Text>
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
  
  queueContainer: { marginTop: 24, backgroundColor: '#FEF3C7', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FDE68A' },
  queueHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  queueTitle: { fontSize: 16, fontWeight: 'bold', color: '#B45309' },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  taskMeta: { fontSize: 12, color: '#6B7280' },
  viewAllButton: { marginTop: 8, padding: 12, alignItems: 'center' },
  viewAllText: { color: '#B45309', fontWeight: '600' },
  
  allCaughtUp: { padding: 24, backgroundColor: '#ECFDF5', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#D1FAE5' },
  caughtUpTitle: { fontSize: 16, fontWeight: 'bold', color: '#065F46', marginBottom: 4 },
  caughtUpText: { fontSize: 13, color: '#047857' },

  quickActionsContainer: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  actionIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  actionTextContainer: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  actionSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
});
