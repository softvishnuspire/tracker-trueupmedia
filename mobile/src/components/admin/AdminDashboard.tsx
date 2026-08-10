import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions 
} from 'react-native';
import { 
  Layers, 
  Video, 
  FileText, 
  Film, 
  MessageSquare, 
  Activity, 
  ChevronRight, 
  UserPlus,
  ChevronLeft,
  ChevronRight as ChevronRightIcon
} from 'lucide-react-native';
import { adminApi, ContentItem, Client } from '../../services/api';
import { supabase } from '../../utils/supabase';
import { 
  format, 
  isSameMonth, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  addMonths, 
  startOfDay, 
  endOfDay 
} from 'date-fns';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/use-theme';

const shootDoneStatuses = [
  'SHOOT DONE',
  'EDITING IN PROGRESS',
  'EDITED',
  'WAITING FOR FINAL APPROVAL',
  'APPROVED',
  'WAITING FOR POSTING',
  'POSTED'
];

const contentApprovedStatuses = [
  'CONTENT READY',
  'WAITING FOR APPROVAL',
  'CONTENT APPROVED',
  'SHOOT DONE',
  'EDITING IN PROGRESS',
  'EDITED',
  'WAITING FOR FINAL APPROVAL',
  'APPROVED',
  'WAITING FOR POSTING',
  'POSTED',
  'DESIGNING IN PROGRESS',
  'DESIGNING COMPLETED'
];

export default function AdminDashboard() {
  const theme = useTheme();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [globalCalendarData, setGlobalCalendarData] = useState<ContentItem[]>([]);
  const [pocNotes, setPocNotes] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const selectedClientData = useMemo(() => {
    return clients.find(c => c.id === selectedClient);
  }, [clients, selectedClient]);

  const isBiMonthlyView = !!selectedClient && selectedClientData?.batch_type === '15-15';

  const periodStart = useMemo(() => {
    if (isBiMonthlyView) {
      return currentMonth.getDate() >= 15
        ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 15)
        : new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 15);
    }
    return startOfMonth(currentMonth);
  }, [currentMonth, isBiMonthlyView]);

  const periodEnd = useMemo(() => {
    if (isBiMonthlyView) {
      return currentMonth.getDate() >= 15
        ? new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 14)
        : new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 14);
    }
    return endOfMonth(currentMonth);
  }, [currentMonth, isBiMonthlyView]);

  const isDayInPeriod = useCallback((date: Date) => {
    if (!isBiMonthlyView) return isSameMonth(date, currentMonth);
    return date >= startOfDay(periodStart) && date <= endOfDay(periodEnd);
  }, [currentMonth, isBiMonthlyView, periodStart, periodEnd]);

  // Fetch initial dashboard configuration
  const fetchInitialData = async () => {
    try {
      const clientsRes = await adminApi.getClients();
      setClients(clientsRes.data || []);
      if (clientsRes.data && clientsRes.data.length > 0) {
        setSelectedClient(clientsRes.data[0].id);
      }

      const monthStr = format(currentMonth, 'yyyy-MM');
      const calendarRes = await adminApi.getMasterCalendar(monthStr);
      setGlobalCalendarData(calendarRes.data || []);
    } catch (err) {
      console.error('Failed to load initial dashboard config:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch POC notes and refresh calendar data when client/month changes
  const fetchClientData = useCallback(async () => {
    if (!selectedClient) return;
    try {
      const { data: notes, error } = await supabase
        .from('poc_communications')
        .select('*, users:team_lead_id (name)')
        .eq('client_id', selectedClient)
        .order('note_date', { ascending: false })
        .limit(5);

      if (!error && notes) {
        setPocNotes(notes);
      } else {
        setPocNotes([]);
      }
    } catch (err) {
      console.error('Failed to fetch client notes:', err);
    }
  }, [selectedClient]);

  useEffect(() => {
    fetchInitialData();
  }, [currentMonth]);

  useEffect(() => {
    fetchClientData();
  }, [selectedClient, fetchClientData]);

  // Filter calendar data for the active client in this billing period
  const clientCalendarData = useMemo(() => {
    if (!selectedClient) return [];
    return globalCalendarData.filter(item => {
      const itemDate = parseISO(item.scheduled_datetime);
      return item.client_id === selectedClient && isDayInPeriod(itemDate);
    });
  }, [globalCalendarData, selectedClient, isDayInPeriod]);

  // Compute selected client statistics
  const clientStats = useMemo(() => {
    return clientCalendarData.reduce(
      (acc, item) => {
        const status = (item.status || '').toUpperCase();
        const type = (item.content_type || '').toUpperCase();
        const isShot = shootDoneStatuses.includes(status);
        const isDone = status === 'POSTED' || status === 'WAITING FOR POSTING' || status === 'COMPLETED' || status === 'SCHEDULED' || status === 'APPROVED';

        acc.total += 1;
        if (isDone) acc.completed += 1;

        if (type === 'REEL' || type === 'YOUTUBE') {
          acc.reels += 1;
          if (isShot) acc.shootDone += 1;
          if (isDone) acc.completedReels += 1;
        } else if (type === 'POST') {
          acc.posts += 1;
          if (isShot) acc.shotPosts += 1;
          if (isDone) acc.completedPosts += 1;
        }
        return acc;
      },
      { total: 0, completed: 0, reels: 0, posts: 0, shootDone: 0, completedReels: 0, completedPosts: 0, shotPosts: 0 }
    );
  }, [clientCalendarData]);

  // Compute global statistics across ALL clients for the month
  const globalStats = useMemo(() => {
    return globalCalendarData.reduce(
      (acc, item) => {
        const status = (item.status || '').toUpperCase();
        const type = (item.content_type || '').toUpperCase();
        const isShot = shootDoneStatuses.includes(status);
        const isDone = status === 'POSTED' || status === 'WAITING FOR POSTING' || status === 'COMPLETED' || status === 'SCHEDULED' || status === 'APPROVED';

        acc.total += 1;
        if (isShot) acc.shotTotal += 1;

        if (type === 'REEL' || type === 'YOUTUBE') {
          acc.reels += 1;
          if (isShot) acc.shotReels += 1;
          if (isDone) acc.doneReels += 1;
        } else if (type === 'POST') {
          acc.posts += 1;
          if (isShot) acc.shotPosts += 1;
          if (isDone) acc.donePosts += 1;
        }
        return acc;
      },
      { total: 0, shotTotal: 0, reels: 0, posts: 0, shotReels: 0, doneReels: 0, shotPosts: 0, donePosts: 0 }
    );
  }, [globalCalendarData]);

  // Compute milestones for the Task Lifecycle section
  const lifecycleMilestones = useMemo(() => {
    const milestones = ['CONTENT APPROVED', 'WAITING FOR FINAL APPROVAL', 'POSTED'];
    const flows: Record<string, string[]> = {
      REEL: ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
      YOUTUBE: ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
      POST: ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
    };

    return milestones.map(milestone => {
      let numerator = 0;
      let denominator = 0;

      clientCalendarData.forEach(item => {
        const type = (item.content_type || '').toUpperCase();
        const status = (item.status || '').toUpperCase();
        const flow = flows[type] || flows.REEL;
        const milestoneIdx = flow.indexOf(milestone);

        if (milestoneIdx !== -1) {
          denominator += 1;
          const statusIdx = flow.indexOf(status);
          if (statusIdx >= milestoneIdx) {
            numerator += 1;
          }
        }
      });

      return {
        milestone,
        numerator,
        denominator
      };
    });
  }, [clientCalendarData]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
      {/* Title Header & Month Navigator */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Dashboard Overview</Text>
          <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>Monitor operational health and pipeline metrics</Text>
        </View>
        
        {/* Month Navigation */}
        <View style={[styles.monthNav, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn}>
            <ChevronLeft size={18} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: theme.text }]}>
            {format(currentMonth, 'MMMM yyyy')}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn}>
            <ChevronRightIcon size={18} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Global Progress Metrics (Aggregated Across All Clients) */}
      <View style={styles.gridContainer}>
        {/* Card 1: Monthly Pipeline */}
        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftColor: theme.accent, borderLeftWidth: 4 }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.statCardLabel, { color: theme.textSecondary }]}>MONTHLY PIPELINE</Text>
            <Layers size={18} color={theme.textMuted} />
          </View>
          <Text style={[styles.statCardValue, { color: theme.text }]}>
            {globalStats.shotTotal} / {globalStats.total}
          </Text>
          <View style={styles.statCardFooter}>
            <View style={styles.percentageInfo}>
              <Text style={[styles.pctValue, { color: theme.text }]}>{pct(globalStats.shotTotal, globalStats.total)}%</Text>
              <Text style={[styles.pctLabel, { color: theme.textSecondary }]}>Shot</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.elevated }]}>
              <View style={[styles.progressFill, { width: `${pct(globalStats.shotTotal, globalStats.total)}%`, backgroundColor: theme.accent }]} />
            </View>
          </View>
        </View>

        {/* Card 2: Reels Progress */}
        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftColor: '#8B5CF6', borderLeftWidth: 4 }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.statCardLabel, { color: theme.textSecondary }]}>REELS PROGRESS</Text>
            <Video size={18} color={theme.textMuted} />
          </View>
          <Text style={[styles.statCardValue, { color: theme.text }]}>
            {globalStats.doneReels} / {globalStats.reels}
          </Text>
          <View style={styles.statCardFooter}>
            <View style={styles.percentageInfo}>
              <Text style={[styles.pctValue, { color: theme.text }]}>{pct(globalStats.doneReels, globalStats.reels)}%</Text>
              <Text style={[styles.pctLabel, { color: theme.textSecondary }]}>Done</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.elevated }]}>
              <View style={[styles.progressFill, { width: `${pct(globalStats.doneReels, globalStats.reels)}%`, backgroundColor: '#8B5CF6' }]} />
            </View>
          </View>
        </View>

        {/* Card 3: Posts Progress */}
        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftColor: '#06B6D4', borderLeftWidth: 4 }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.statCardLabel, { color: theme.textSecondary }]}>POSTS PROGRESS</Text>
            <FileText size={18} color={theme.textMuted} />
          </View>
          <Text style={[styles.statCardValue, { color: theme.text }]}>
            {globalStats.donePosts} / {globalStats.posts}
          </Text>
          <View style={styles.statCardFooter}>
            <View style={styles.percentageInfo}>
              <Text style={[styles.pctValue, { color: theme.text }]}>{pct(globalStats.donePosts, globalStats.posts)}%</Text>
              <Text style={[styles.pctLabel, { color: theme.textSecondary }]}>Done</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.elevated }]}>
              <View style={[styles.progressFill, { width: `${pct(globalStats.donePosts, globalStats.posts)}%`, backgroundColor: '#06B6D4' }]} />
            </View>
          </View>
        </View>

        {/* Card 4: Shoots Done */}
        <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftColor: '#F59E0B', borderLeftWidth: 4 }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.statCardLabel, { color: theme.textSecondary }]}>SHOOTS DONE</Text>
            <Film size={18} color={theme.textMuted} />
          </View>
          <Text style={[styles.statCardValue, { color: theme.text }]}>
            {globalStats.shotReels} / {globalStats.reels}
          </Text>
          <View style={styles.statCardFooter}>
            <View style={styles.percentageInfo}>
              <Text style={[styles.pctValue, { color: theme.text }]}>{pct(globalStats.shotReels, globalStats.reels)}%</Text>
              <Text style={[styles.pctLabel, { color: theme.textSecondary }]}>Shot</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.elevated }]}>
              <View style={[styles.progressFill, { width: `${pct(globalStats.shotReels, globalStats.reels)}%`, backgroundColor: '#F59E0B' }]} />
            </View>
          </View>
        </View>
      </View>

      {/* Operational Command Center (Selected Client Container) */}
      <View style={[styles.commandCenterCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.commandCenterHeader}>
          <View>
            <Text style={[styles.commandCenterTitle, { color: theme.text }]}>Operational Command Center</Text>
            <Text style={[styles.commandCenterSubtitle, { color: theme.textSecondary }]}>Real-time health and production flow monitoring</Text>
          </View>
        </View>

        {/* Client Selector Chip Row */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clientFilter}>
            {clients.map(client => (
              <TouchableOpacity 
                key={client.id}
                style={[
                  styles.clientChip, 
                  { backgroundColor: theme.elevated, borderColor: theme.border }, 
                  selectedClient === client.id && [styles.clientChipActive, { borderColor: theme.accent }]
                ]}
                onPress={() => setSelectedClient(client.id)}
              >
                <Text style={[
                  styles.clientChipText, 
                  { color: theme.textSecondary }, 
                  selectedClient === client.id && { color: theme.accent }
                ]}>
                  {client.company_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Production Progress for Selected Client */}
        <Text style={[styles.commandCenterSectionTitle, { color: theme.text }]}>Production Progress</Text>
        <View style={styles.innerGridContainer}>
          {/* Shoot Done (Client) */}
          <View style={[styles.innerStatCard, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
            <Text style={[styles.innerStatLabel, { color: theme.textSecondary }]}>SHOOT DONE</Text>
            <Text style={[styles.innerStatValue, { color: theme.text }]}>{clientStats.shootDone} / {clientStats.reels}</Text>
            <View style={[styles.progressTrack, { backgroundColor: theme.surface, height: 3 }]}>
              <View style={[styles.progressFill, { width: `${pct(clientStats.shootDone, clientStats.reels)}%`, backgroundColor: theme.accent }]} />
            </View>
          </View>

          {/* Monthly Pipeline (Client) */}
          <View style={[styles.innerStatCard, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
            <Text style={[styles.innerStatLabel, { color: theme.textSecondary }]}>MONTHLY PIPELINE</Text>
            <Text style={[styles.innerStatValue, { color: theme.text }]}>{clientStats.completed} / {clientStats.total}</Text>
            <View style={[styles.progressTrack, { backgroundColor: theme.surface, height: 3 }]}>
              <View style={[styles.progressFill, { width: `${pct(clientStats.completed, clientStats.total)}%`, backgroundColor: '#10B981' }]} />
            </View>
          </View>

          {/* Total Reels (Client) */}
          <View style={[styles.innerStatCard, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
            <Text style={[styles.innerStatLabel, { color: theme.textSecondary }]}>TOTAL REELS</Text>
            <Text style={[styles.innerStatValue, { color: theme.text }]}>{clientStats.completedReels} / {clientStats.reels}</Text>
            <View style={[styles.progressTrack, { backgroundColor: theme.surface, height: 3 }]}>
              <View style={[styles.progressFill, { width: `${pct(clientStats.completedReels, clientStats.reels)}%`, backgroundColor: '#8B5CF6' }]} />
            </View>
          </View>

          {/* Total Posts (Client) */}
          <View style={[styles.innerStatCard, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
            <Text style={[styles.innerStatLabel, { color: theme.textSecondary }]}>TOTAL POSTS</Text>
            <Text style={[styles.innerStatValue, { color: theme.text }]}>{clientStats.completedPosts} / {clientStats.posts}</Text>
            <View style={[styles.progressTrack, { backgroundColor: theme.surface, height: 3 }]}>
              <View style={[styles.progressFill, { width: `${pct(clientStats.completedPosts, clientStats.posts)}%`, backgroundColor: '#F59E0B' }]} />
            </View>
          </View>
        </View>

        {/* Task Lifecycle (Client) */}
        <View style={[styles.panelSection, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16, marginTop: 8 }]}>
          <View style={styles.sectionHeaderRow}>
            <Activity size={16} color={theme.accent} style={{ marginRight: 6 }} />
            <Text style={[styles.panelSectionTitle, { color: theme.text }]}>TASK LIFECYCLE</Text>
          </View>
          <View style={styles.lifecycleContainer}>
            {lifecycleMilestones.map(({ milestone, numerator, denominator }) => (
              <View key={milestone} style={styles.lifecycleItem}>
                <View style={styles.lifecycleMeta}>
                  <Text style={[styles.lifecycleLabel, { color: theme.textSecondary }]}>{milestone}</Text>
                  <Text style={[styles.lifecycleValue, { color: theme.text }]}>{numerator} / {denominator}</Text>
                </View>
                <View style={[styles.lifecycleTrack, { backgroundColor: theme.elevated }]}>
                  <View style={[styles.lifecycleFill, { width: `${pct(numerator, denominator)}%`, backgroundColor: theme.accent }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* POC Communications Feed (Client) */}
        <View style={[styles.panelSection, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16, marginTop: 16 }]}>
          <View style={styles.sectionHeaderRow}>
            <MessageSquare size={16} color="#10B981" style={{ marginRight: 6 }} />
            <Text style={[styles.panelSectionTitle, { color: theme.text }]}>POC COMMUNICATION</Text>
          </View>
          <View style={styles.pocContainer}>
            {pocNotes.length > 0 ? (
              pocNotes.map((note, index) => (
                <View key={note.id || index} style={[styles.pocItem, index < pocNotes.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
                  <View style={styles.pocMeta}>
                    <Text style={[styles.pocAuthor, { color: theme.accent }]}>
                      {note.users?.name?.split(' ')[0] || 'Team Lead'}
                    </Text>
                    <Text style={[styles.pocDate, { color: theme.textMuted }]}>
                      {format(parseISO(note.note_date), 'MMM d')}
                    </Text>
                  </View>
                  <Text style={[styles.pocText, { color: theme.textSecondary }]}>{note.note_text}</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.pocEmptyText, { color: theme.textMuted }]}>No recent notes found.</Text>
            )}
          </View>
        </View>
      </View>


    </ScrollView>
  );
}

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
    flexDirection: 'column',
    gap: 12,
  },
  headerTitleContainer: {
    flexDirection: 'column',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  pageSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    minWidth: 160,
  },
  monthNavBtn: {
    padding: 4,
  },
  monthLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: (screenWidth - 40) / 2,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCardLabel: {
    fontSize: 9,
    fontWeight: '800',
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statCardFooter: {
    gap: 6,
  },
  percentageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pctValue: {
    fontWeight: '700',
    fontSize: 11,
  },
  pctLabel: {
    fontSize: 11,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  
  // Command Center Container styles
  commandCenterCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  commandCenterHeader: {
    marginBottom: 16,
  },
  commandCenterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  commandCenterSubtitle: {
    fontSize: 11,
    marginTop: 4,
  },
  filterSection: {
    marginBottom: 16,
  },
  clientFilter: {
    flexDirection: 'row',
  },
  clientChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  clientChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  clientChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  commandCenterSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  innerGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  innerStatCard: {
    width: (screenWidth - 76) / 2,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    marginBottom: 8,
    gap: 4,
  },
  innerStatLabel: {
    fontSize: 9,
    fontWeight: '800',
  },
  innerStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  panelSection: {
    flexDirection: 'column',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  panelSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  lifecycleContainer: {
    gap: 12,
  },
  lifecycleItem: {
    gap: 4,
  },
  lifecycleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lifecycleLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  lifecycleValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  lifecycleTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  lifecycleFill: {
    height: '100%',
    borderRadius: 2,
  },
  pocContainer: {
    gap: 10,
  },
  pocItem: {
    paddingBottom: 8,
    gap: 4,
  },
  pocMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pocAuthor: {
    fontSize: 11,
    fontWeight: '700',
  },
  pocDate: {
    fontSize: 10,
  },
  pocText: {
    fontSize: 12,
    lineHeight: 16,
  },
  pocEmptyText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  quickActionsContainer: {
    marginTop: 8,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  actionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
