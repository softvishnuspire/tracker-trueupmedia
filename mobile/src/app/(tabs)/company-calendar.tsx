import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Modal, 
  ScrollView, 
  Alert 
} from 'react-native';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import ActivityLog from '../../components/ActivityLog';
import { 
  format, 
  addMonths, 
  subMonths, 
  parseISO, 
  subDays,
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday 
} from 'date-fns';
import { adminApi, ContentItem, ContentDetails, Client } from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/use-theme';

export default function CompanyCalendarScreen() {
  const theme = useTheme();
  const DISPLAY_OFFSET_DAYS = 7;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<ContentItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  
  // Day Tasks Modal
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayTasks, setDayTasks] = useState<ContentItem[]>([]);
  const [dayModalVisible, setDayModalVisible] = useState(false);

  // Full Details Modal
  const [contentDetails, setContentDetails] = useState<ContentDetails | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchClients = async () => {
    try {
      const res = await adminApi.getClients();
      setClients(res.data || []);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const monthStr = format(currentMonth, 'yyyy-MM');
      const res = await adminApi.getMasterCalendar(
        monthStr, 
        selectedClient === 'all' ? undefined : selectedClient
      );
      setCalendarData(res.data || []);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch calendar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    fetchCalendar();
  }, [currentMonth, selectedClient]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Helper to subtract 7 days from scheduled time for visual tracking offset
  const getDisplayDate = (scheduledDateTime: string) => {
    return subDays(parseISO(scheduledDateTime), DISPLAY_OFFSET_DAYS);
  };

  // Generate calendar grid days
  const gridDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 }); // Saturday
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  // Group fetched calendar items by visual offset date string
  const tasksByDate = useMemo(() => {
    const map: Record<string, ContentItem[]> = {};
    calendarData.forEach(item => {
      const displayDay = getDisplayDate(item.scheduled_datetime);
      const dateKey = format(displayDay, 'yyyy-MM-dd');
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(item);
    });
    return map;
  }, [calendarData]);

  const handleDayClick = (day: Date, tasks: ContentItem[]) => {
    setSelectedDate(day);
    setDayTasks(tasks);
    setDayModalVisible(true);
  };

  const openDetails = async (item: ContentItem) => {
    setDetailsLoading(true);
    setContentDetails(null);
    setDetailsModalVisible(true);
    try {
      const res = await adminApi.getContentDetails(item.id);
      setContentDetails(res.data);
    } catch (err: any) {
      console.error('Failed to fetch content details:', err);
      setContentDetails({ item, history: [] });
    } finally {
      setDetailsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'POSTED') return { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981', border: 'rgba(16, 185, 129, 0.2)' };
    if (s === 'APPROVED' || s === 'WAITING FOR POSTING') return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.2)' };
    if (s.includes('EDITED') || s.includes('IN PROGRESS')) return { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.2)' };
    return { bg: 'rgba(148, 163, 184, 0.1)', text: '#94A3B8', border: 'rgba(148, 163, 184, 0.2)' };
  };

  const getClientColor = (name: string) => {
    const colors = [
      '#EF4444', // Red
      '#F59E0B', // Amber
      '#10B981', // Emerald
      '#3B82F6', // Blue
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#06B6D4', // Cyan
      '#14B8A6', // Teal
      '#F43F5E', // Rose
      '#6366F1'  // Indigo
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Month Navigator & Client Filter */}
      <View style={[styles.controls, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
            <ChevronLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.monthText, { color: theme.text }]}>
            {format(currentMonth, 'MMMM yyyy')}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
            <ChevronRight size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Client Horizontal Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clientFilter}>
          <TouchableOpacity 
            style={[styles.clientChip, { backgroundColor: theme.elevated, borderColor: theme.border }, selectedClient === 'all' && [styles.clientChipActive, { borderColor: theme.accent }]]}
            onPress={() => setSelectedClient('all')}
          >
            <Text style={[styles.clientChipText, { color: theme.textSecondary }, selectedClient === 'all' && { color: theme.accent }]}>All Clients</Text>
          </TouchableOpacity>
          {clients.map(client => (
            <TouchableOpacity 
              key={client.id}
              style={[styles.clientChip, { backgroundColor: theme.elevated, borderColor: theme.border }, selectedClient === client.id && [styles.clientChipActive, { borderColor: theme.accent }]]}
              onPress={() => setSelectedClient(client.id)}
            >
              <Text style={[styles.clientChipText, { color: theme.textSecondary }, selectedClient === client.id && { color: theme.accent }]}>
                {client.company_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Grid Calendar */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <ScrollView style={styles.gridContainer}>
          {/* Day Headers Row */}
          <View style={styles.daysHeaderRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Text key={day} style={[styles.dayHeaderCell, { color: theme.textSecondary }]}>{day}</Text>
            ))}
          </View>

          {/* Grid Cells */}
          <View style={styles.gridCellsContainer}>
            {gridDays.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayTasksList = tasksByDate[dateStr] || [];
              const inMonth = isSameMonth(day, currentMonth);
              const isDayToday = isToday(day);

              return (
                <TouchableOpacity 
                  key={dateStr + idx} 
                  style={[
                    styles.gridCell, 
                    { 
                      borderColor: theme.border, 
                      backgroundColor: inMonth ? theme.surface : 'rgba(148, 163, 184, 0.04)', 
                    },
                    isDayToday && { borderColor: theme.accent, borderWidth: 2 }
                  ]}
                  onPress={() => handleDayClick(day, dayTasksList)}
                >
                  <Text style={[
                    styles.gridCellNumber, 
                    { color: inMonth ? theme.text : theme.textMuted },
                    isDayToday && { color: theme.accent, fontWeight: 'bold' }
                  ]}>
                    {format(day, 'd')}
                  </Text>
                  <View style={styles.pillsContainer}>
                    {dayTasksList.slice(0, 3).map((task) => {
                      const clientName = task.clients?.company_name || 'UNK';
                      const initials = clientName.substring(0, 3).toUpperCase();
                      const chipBg = getClientColor(clientName);
                      return (
                        <View key={task.id} style={[styles.pill, { backgroundColor: chipBg }]}>
                          <Text style={styles.pillText} numberOfLines={1}>{initials}</Text>
                        </View>
                      );
                    })}
                    {dayTasksList.length > 3 && (
                      <View style={[styles.pill, { backgroundColor: '#475569' }]}>
                        <Text style={styles.pillText}>+{dayTasksList.length - 3}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Day Tasks List Modal */}
      <Modal 
        visible={dayModalVisible} 
        animationType="slide" 
        presentationStyle="pageSheet" 
        onRequestClose={() => setDayModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {selectedDate ? format(selectedDate, 'EEEE, MMM d, yyyy') : 'Day Workload (Offset View)'}
            </Text>
            <TouchableOpacity onPress={() => setDayModalVisible(false)} style={styles.modalClose}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>
            {dayTasks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <CalendarIcon size={48} color={theme.textMuted} />
                <Text style={{ color: theme.textMuted, fontStyle: 'italic', marginTop: 12 }}>
                  No content scheduled for this day (with offset).
                </Text>
              </View>
            ) : (
              dayTasks.map(task => {
                const statusColors = getStatusColor(task.status);
                return (
                  <TouchableOpacity 
                    key={task.id} 
                    style={[
                      styles.taskCard, 
                      { backgroundColor: theme.surface, borderColor: theme.border, borderLeftColor: theme.accent }
                    ]} 
                    onPress={() => {
                      setDayModalVisible(false);
                      openDetails(task);
                    }}
                  >
                    <View style={styles.taskHeader}>
                      <Text style={[styles.taskType, { color: theme.accent }]}>{task.content_type?.toUpperCase() || 'POST'}</Text>
                      <Text style={{ fontSize: 11, color: theme.textMuted }}>
                        Actual Posting: {format(parseISO(task.scheduled_datetime), 'MMM d, HH:mm')}
                      </Text>
                    </View>
                    <Text style={[styles.taskTitle, { color: theme.text }]}>{task.title || 'Untitled Task'}</Text>
                    <Text style={[styles.taskClient, { color: theme.textSecondary }]}>{task.clients?.company_name || 'Unknown Client'}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
                      <Text style={[styles.statusText, { color: statusColors.text }]}>{task.status}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Task Details Modal */}
      <Modal 
        visible={detailsModalVisible} 
        animationType="slide" 
        presentationStyle="pageSheet" 
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Task Details</Text>
            <TouchableOpacity onPress={() => setDetailsModalVisible(false)} style={styles.modalClose}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          {detailsLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={{ color: theme.textMuted, marginTop: 12, fontSize: 13 }}>Loading details...</Text>
            </View>
          ) : contentDetails && (
            <ScrollView style={styles.modalScroll}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Title</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{contentDetails.item.title}</Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Client</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{contentDetails.item.clients?.company_name}</Text>
              </View>
              <View style={styles.detailRow}>
                <View style={[styles.detailSection, {flex: 1}]}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{contentDetails.item.content_type}</Text>
                </View>
                <View style={[styles.detailSection, {flex: 1}]}>
                  <Text style={styles.detailLabel}>Actual Scheduled</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {format(parseISO(contentDetails.item.scheduled_datetime), 'MMM d, yyyy HH:mm')}
                  </Text>
                </View>
              </View>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Display Offset Date (Company View)</Text>
                <Text style={[styles.detailValue, { color: theme.accent, fontWeight: '700' }]}>
                  {format(getDisplayDate(contentDetails.item.scheduled_datetime), 'MMM d, yyyy (EEEE)')}
                </Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={[styles.detailValue, { color: theme.textSecondary }]}>
                  {contentDetails.item.description || 'No description provided.'}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <ActivityLog item={contentDetails.item} contentDetails={contentDetails} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  controls: { borderBottomWidth: 1, paddingBottom: 12 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  navBtn: { padding: 8 },
  monthText: { fontSize: 18, fontWeight: 'bold' },
  clientFilter: { paddingHorizontal: 16, flexDirection: 'row' },
  clientChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  clientChipActive: { backgroundColor: 'rgba(99, 102, 241, 0.1)' },
  clientChipText: { fontSize: 13, fontWeight: '600' },
  
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Grid styles
  gridContainer: { padding: 6, flex: 1 },
  daysHeaderRow: { flexDirection: 'row', marginBottom: 8, paddingHorizontal: 4 },
  dayHeaderCell: { width: '14.28%', textAlign: 'center', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  gridCellsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCell: { width: '13.5%', height: 95, margin: '0.39%', borderRadius: 6, borderWidth: 1, padding: 4, justifyContent: 'flex-start' },
  gridCellNumber: { fontSize: 10, fontWeight: '800', alignSelf: 'flex-start' },
  pillsContainer: { flex: 1, justifyContent: 'flex-end', marginTop: 4, gap: 1 },
  pill: { height: 16, borderRadius: 3, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2 },
  pillText: { fontSize: 8, fontWeight: '900', color: '#FFFFFF' },
  
  emptyContainer: { padding: 40, alignItems: 'center' },
  
  // Modal & task list styles
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalClose: { padding: 4 },
  modalScroll: { padding: 16 },
  taskCard: { borderRadius: 8, padding: 12, borderWidth: 1, borderLeftWidth: 4, marginBottom: 8 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  taskType: { fontSize: 11, fontWeight: 'bold' },
  taskTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  taskClient: { fontSize: 12, marginBottom: 8 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  
  detailSection: { marginBottom: 16 },
  detailRow: { flexDirection: 'row', gap: 16 },
  detailLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 4, textTransform: 'uppercase' },
  detailValue: { fontSize: 15 },
  divider: { height: 1, marginVertical: 20 },
});
