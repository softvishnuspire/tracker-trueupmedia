import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Layers, Video, FileText, ChevronRight, Calendar, MessageSquare, Plus } from 'lucide-react-native';
import { tlApi, ContentItem, PocNote } from '../../services/api';
import { format, isSameMonth, parseISO } from 'date-fns';
import { isCrossMonthRescheduled } from '../../utils/calendarUtils';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';

const shootDoneStatuses = [
    'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
];

export default function TLDashboard() {
  const { userData } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [calendarData, setCalendarData] = useState<ContentItem[]>([]);
  const [pocNotes, setPocNotes] = useState<PocNote[]>([]);
  const [currentMonth] = useState(new Date());
  
  const router = useRouter();

  const fetchDashboardData = useCallback(async () => {
    if (!userData?.id) return;
    try {
      const currentMonthStr = format(currentMonth, 'yyyy-MM');
      const [calRes, pocRes] = await Promise.all([
        tlApi.getMasterCalendar(currentMonthStr, userData.id),
        tlApi.getPocNotes(currentMonthStr, userData.id)
      ]);
      
      setCalendarData(calRes.data || []);
      setPocNotes(pocRes.data || []);
    } catch (err) {
      console.error('Failed to load TL dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, userData?.id]);

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

  const globalMonthCounts = calendarData.filter(item => {
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
        <Text style={styles.pageTitle}>Team Lead</Text>
        <Text style={styles.pageSubtitle}>Your active clients and production flow</Text>
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

      <View style={styles.pocContainer}>
        <View style={styles.pocHeader}>
          <View style={styles.pocTitleGroup}>
            <MessageSquare size={20} color="#10B981" />
            <Text style={styles.pocTitle}>Recent POC Notes</Text>
          </View>
          <TouchableOpacity style={styles.addButton}>
            <Plus size={16} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {pocNotes.length === 0 ? (
          <Text style={styles.emptyText}>No POC notes for this month.</Text>
        ) : (
          pocNotes.slice(0, 3).map((note) => (
            <View key={note.id} style={styles.pocCard}>
              <View style={styles.pocMeta}>
                <Text style={styles.pocClient}>{note.clients?.company_name || 'Client'}</Text>
                <Text style={styles.pocDate}>{format(parseISO(note.note_date), 'MMM d')}</Text>
              </View>
              <Text style={styles.pocText}>{note.note_text}</Text>
            </View>
          ))
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
            <Text style={styles.actionSubtitle}>Manage content schedules</Text>
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
  
  pocContainer: { marginTop: 24, backgroundColor: '#fff', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  pocHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pocTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pocTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  addButton: { backgroundColor: '#10B981', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#6B7280', fontStyle: 'italic', textAlign: 'center', padding: 12 },
  pocCard: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F3F4F6' },
  pocMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  pocClient: { fontSize: 14, fontWeight: '600', color: '#374151' },
  pocDate: { fontSize: 12, color: '#6B7280' },
  pocText: { fontSize: 14, color: '#4B5563', lineHeight: 20 },

  quickActionsContainer: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  actionIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  actionTextContainer: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  actionSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
});
