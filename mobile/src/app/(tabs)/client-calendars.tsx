import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  TextInput, 
  ScrollView, 
  Modal, 
  Alert,
  Dimensions
} from 'react-native';
import { Search, Calendar as CalendarIcon, ChevronRight, X, ChevronLeft } from 'lucide-react-native';
import { adminApi, Client, ContentItem } from '../../services/api';
import { useTheme } from '../../hooks/use-theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActivityLog from '../../components/ActivityLog';
import { 
  format, 
  addMonths, 
  subMonths, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday 
} from 'date-fns';

export default function ClientCalendarsScreen() {
  const theme = useTheme();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Client Calendar state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedClientCalendar, setSelectedClientCalendar] = useState<ContentItem[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Day Tasks Modal
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayTasks, setDayTasks] = useState<ContentItem[]>([]);
  const [dayModalVisible, setDayModalVisible] = useState(false);

  // Full Details Modal
  const [selectedTask, setSelectedTask] = useState<ContentItem | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await adminApi.getClients();
      setClients(res.data || []);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to fetch clients list');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientCalendar = async (clientId: string, month: Date) => {
    setCalendarLoading(true);
    try {
      const monthStr = format(month, 'yyyy-MM');
      const res = await adminApi.getMasterCalendar(monthStr, clientId);
      setSelectedClientCalendar(res.data || []);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to fetch client calendar events');
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setCurrentMonth(new Date());
    fetchClientCalendar(client.id, new Date());
  };

  const handlePrevMonth = () => {
    if (!selectedClient) return;
    const prevM = subMonths(currentMonth, 1);
    setCurrentMonth(prevM);
    fetchClientCalendar(selectedClient.id, prevM);
  };

  const handleNextMonth = () => {
    if (!selectedClient) return;
    const nextM = addMonths(currentMonth, 1);
    setCurrentMonth(nextM);
    fetchClientCalendar(selectedClient.id, nextM);
  };

  const filteredClients = clients.filter(c => 
    c.company_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'POSTED') return { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981', border: 'rgba(16, 185, 129, 0.2)' };
    if (s === 'APPROVED' || s === 'WAITING FOR POSTING') return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.2)' };
    if (s.includes('EDITED') || s.includes('IN PROGRESS')) return { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.2)' };
    return { bg: 'rgba(148, 163, 184, 0.1)', text: '#94A3B8', border: 'rgba(148, 163, 184, 0.2)' };
  };

  // Generate calendar grid days for active client month
  const gridDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 }); // Saturday
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  // Group client tasks by date string
  const tasksByDate = useMemo(() => {
    const map: Record<string, ContentItem[]> = {};
    selectedClientCalendar.forEach(item => {
      const dateKey = format(parseISO(item.scheduled_datetime), 'yyyy-MM-dd');
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(item);
    });
    return map;
  }, [selectedClientCalendar]);

  const handleDayClick = (day: Date, tasks: ContentItem[]) => {
    setSelectedDate(day);
    setDayTasks(tasks);
    setDayModalVisible(true);
  };

  const getTaskTypeColor = (type: string) => {
    const t = (type || '').toUpperCase();
    if (t === 'REEL') return '#8B5CF6'; // Purple
    if (t === 'YOUTUBE' || t === 'YT') return '#06B6D4'; // Cyan
    if (t === 'POST') return '#F59E0B'; // Amber
    if (t.includes('SPECIAL')) return '#EC4899'; // Pink/Rose
    return '#6366F1'; // Default Indigo
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Search Header */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={[styles.searchBox, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
          <Search size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search clients..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Clients Directory List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent}>
          {filteredClients.map((client) => (
            <TouchableOpacity
              key={client.id}
              onPress={() => handleSelectClient(client)}
              style={[styles.clientCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={[styles.iconBox, { backgroundColor: theme.elevated }]}>
                <CalendarIcon size={20} color={theme.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.clientName, { color: theme.text }]}>{client.company_name}</Text>
                <Text style={[styles.clientEmail, { color: theme.textSecondary }]}>
                  {client.email || 'No email provided'}
                </Text>
              </View>
              <ChevronRight size={18} color={theme.textMuted} />
            </TouchableOpacity>
          ))}
          {filteredClients.length === 0 && (
            <View style={styles.emptyView}>
              <Text style={{ color: theme.textMuted, fontStyle: 'italic' }}>No clients found.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Selected Client Calendar Modal */}
      <Modal
        visible={selectedClient !== null}
        animationType="slide"
        onRequestClose={() => setSelectedClient(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={1}>
                {selectedClient?.company_name}
              </Text>
              <Text style={{ fontSize: 11, color: theme.textMuted }}>Client Calendar Grid</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedClient(null)} style={{ padding: 4 }}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Month Navigator */}
          <View style={[styles.monthNav, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={handlePrevMonth} style={{ padding: 8 }}>
              <ChevronLeft size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>
              {format(currentMonth, 'MMMM yyyy')}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={{ padding: 8 }}>
              <ChevronRight size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Calendar Grid Content */}
          {calendarLoading ? (
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
                          const typeName = task.content_type || 'POST';
                          const tagLabel = typeName.substring(0, 4).toUpperCase();
                          const chipBg = getTaskTypeColor(typeName);
                          return (
                            <View key={task.id} style={[styles.pill, { backgroundColor: chipBg }]}>
                              <Text style={styles.pillText} numberOfLines={1}>{tagLabel}</Text>
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

          {/* Day Tasks Bottom Sheet */}
          <Modal 
            visible={dayModalVisible} 
            animationType="slide" 
            presentationStyle="pageSheet" 
            onRequestClose={() => setDayModalVisible(false)}
          >
            <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
              <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {selectedDate ? format(selectedDate, 'EEEE, MMM d, yyyy') : 'Day Workload'}
                </Text>
                <TouchableOpacity onPress={() => setDayModalVisible(false)} style={styles.modalClose}>
                  <X size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                {dayTasks.length === 0 ? (
                  <View style={styles.emptyView}>
                    <CalendarIcon size={48} color={theme.textMuted} />
                    <Text style={{ color: theme.textMuted, fontStyle: 'italic', marginTop: 12 }}>
                      No content scheduled for this day.
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
                          setSelectedTask(task);
                          setDetailsModalVisible(true);
                        }}
                      >
                        <View style={styles.taskHeaderRow}>
                          <Text style={[styles.taskType, { color: theme.accent }]}>{task.content_type?.toUpperCase() || 'POST'}</Text>
                          <Text style={{ fontSize: 12, color: theme.textMuted }}>
                            {format(parseISO(task.scheduled_datetime), 'HH:mm')}
                          </Text>
                        </View>
                        <Text style={[styles.taskTitle, { color: theme.text }]}>{task.title || 'Untitled Task'}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
                          <Text style={{ fontSize: 10, fontWeight: 'bold', color: statusColors.text }}>{task.status}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </SafeAreaView>
          </Modal>

          {/* Full Task Details Modal */}
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
              {selectedTask && (
                <ScrollView style={styles.modalScroll}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Title</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>{selectedTask.title}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <View style={[styles.detailSection, {flex: 1}]}>
                      <Text style={styles.detailLabel}>Type</Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>{selectedTask.content_type}</Text>
                    </View>
                    <View style={[styles.detailSection, {flex: 1}]}>
                      <Text style={styles.detailLabel}>Scheduled</Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>
                        {format(parseISO(selectedTask.scheduled_datetime), 'MMM d, yyyy HH:mm')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Text style={[styles.detailValue, { color: theme.accent, fontWeight: '700' }]}>{selectedTask.status}</Text>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Description</Text>
                    <Text style={[styles.detailValue, { color: theme.textSecondary }]}>
                      {selectedTask.description || 'No description provided.'}
                    </Text>
                  </View>

                  <View style={styles.divider} />
                  <ActivityLog item={selectedTask} />
                </ScrollView>
              )}
            </SafeAreaView>
          </Modal>

        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  clientEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyView: {
    padding: 40,
    alignItems: 'center',
  },
  
  // Modal calendar styles
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  gridContainer: {
    padding: 6,
    flex: 1,
  },
  daysHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dayHeaderCell: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  gridCellsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    width: '13.5%',
    height: 95,
    margin: '0.39%',
    borderRadius: 6,
    borderWidth: 1,
    padding: 4,
    justifyContent: 'flex-start',
  },
  gridCellNumber: {
    fontSize: 10,
    fontWeight: '800',
    alignSelf: 'flex-start',
  },
  pillsContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 1,
  },
  pill: {
    height: 16,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  pillText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  
  // Modal task list card styles
  modalContainer: {
    flex: 1,
  },
  modalClose: {
    padding: 4,
  },
  modalScroll: {
    padding: 16,
  },
  taskCard: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  taskHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskType: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  
  // Details styles
  detailSection: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    marginVertical: 20,
  },
});
