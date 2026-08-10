import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TextInput, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { Activity, Users, Search, Briefcase, Calendar, CheckCircle2, ChevronRight, ChevronDown } from 'lucide-react-native';
import { adminApi, TrackingProductivityResponse, TlTrackingStats, EmployeeTrackingStats } from '../../services/api';
import { useTheme } from '../../hooks/use-theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EmployeeTrackingScreen() {
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TrackingProductivityResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'employee' | 'tl'>('employee');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Date selector (default to today)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Keep track of which employee cards have client details expanded
  const [expandedEmp, setExpandedEmp] = useState<Record<string, boolean>>({});

  const fetchStats = async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await adminApi.getTrackingStats(dateStr);
      setStats(res.data);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to retrieve tracking stats.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(selectedDate);
  }, [selectedDate]);

  const toggleEmpExpand = (id: string) => {
    setExpandedEmp(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredTLs = stats?.teamLeads.filter(tl => 
    tl.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    tl.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredEmployees = stats?.employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getOverallTLEngagement = () => {
    if (!stats || stats.teamLeads.length === 0) return '0%';
    const total = stats.teamLeads.reduce((acc, tl) => acc + tl.progress, 0);
    return `${Math.round((total / stats.teamLeads.length) * 100)}%`;
  };

  const getOverallEmpVelocity = () => {
    if (!stats || stats.employees.length === 0) return '0%';
    const total = stats.employees.reduce((acc, emp) => acc + emp.completionRate, 0);
    return `${Math.round((total / stats.employees.length) * 100)}%`;
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Date Picker & Search bar */}
      <View style={[styles.filterBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={[styles.searchBox, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
          <Search size={16} color={theme.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search by name..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={() => fetchStats(selectedDate)}
            style={[styles.refreshBtn, { backgroundColor: theme.elevated, borderColor: theme.border }]}
          >
            <Activity size={16} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Selector Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab('employee')}
          style={[
            styles.tabButton,
            { backgroundColor: theme.surface, borderColor: theme.border },
            activeTab === 'employee' && { backgroundColor: theme.elevated, borderColor: theme.accent }
          ]}
        >
          <Briefcase size={16} color={activeTab === 'employee' ? theme.accent : theme.textSecondary} style={{ marginRight: 8 }} />
          <Text style={[styles.tabButtonText, { color: activeTab === 'employee' ? theme.text : theme.textSecondary }]}>
            Employees
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('tl')}
          style={[
            styles.tabButton,
            { backgroundColor: theme.surface, borderColor: theme.border },
            activeTab === 'tl' && { backgroundColor: theme.elevated, borderColor: theme.accent }
          ]}
        >
          <Users size={16} color={activeTab === 'tl' ? theme.accent : theme.textSecondary} style={{ marginRight: 8 }} />
          <Text style={[styles.tabButtonText, { color: activeTab === 'tl' ? theme.text : theme.textSecondary }]}>
            Team Leads
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Overview Cards Row */}
          {stats && (
            <View style={styles.overviewGrid}>
              <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>
                  {activeTab === 'tl' ? 'TL Engagement' : 'Employee Velocity'}
                </Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>
                  {activeTab === 'tl' ? getOverallTLEngagement() : getOverallEmpVelocity()}
                </Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Queue Load</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>
                  {activeTab === 'tl' 
                    ? stats.teamLeads.reduce((acc, tl) => acc + tl.totalClients, 0)
                    : stats.employees.reduce((acc, emp) => acc + emp.assignedTasks, 0)
                  }
                </Text>
              </View>
            </View>
          )}

          {/* Cards List */}
          {activeTab === 'employee' ? (
            filteredEmployees.map((emp) => (
              <View 
                key={emp.id}
                style={[styles.trackingCard, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftColor: theme.accent }]}
              >
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{emp.name}</Text>
                    <Text style={{ fontSize: 11, color: theme.textMuted }}>{emp.role} • {emp.email}</Text>
                  </View>
                  <View style={styles.percentageCircle}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: theme.accent }}>
                      {Math.round(emp.completionRate * 100)}%
                    </Text>
                  </View>
                </View>

                {/* Metrics */}
                <View style={styles.metricsRow}>
                  <View style={[styles.metricBox, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
                    <Text style={[styles.metricLabel, { color: theme.textMuted }]}>DAILY TASK</Text>
                    <Text style={[styles.metricValue, { color: theme.text }]}>
                      {emp.completedTasks} / {emp.assignedTasks}
                    </Text>
                  </View>
                  <View style={[styles.metricBox, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
                    <Text style={[styles.metricLabel, { color: theme.textMuted }]}>MONTHLY</Text>
                    <Text style={[styles.metricValue, { color: theme.text }]}>
                      {emp.monthlyCompleted} / {emp.monthlyTotal}
                    </Text>
                  </View>
                </View>

                {/* Collapsible details for clients */}
                <TouchableOpacity
                  onPress={() => toggleEmpExpand(emp.id)}
                  style={[styles.expandButton, { borderTopColor: theme.border }]}
                >
                  <Text style={{ fontSize: 12, color: theme.textSecondary, fontWeight: '700' }}>
                    Assigned Clients ({(emp.assignedClients || []).length})
                  </Text>
                  {expandedEmp[emp.id] ? (
                    <ChevronDown size={16} color={theme.textSecondary} />
                  ) : (
                    <ChevronRight size={16} color={theme.textSecondary} />
                  )}
                </TouchableOpacity>

                {expandedEmp[emp.id] && (
                  <View style={[styles.expandedContent, { backgroundColor: theme.elevated }]}>
                    {(emp.assignedClients || []).map((client, cIdx) => (
                      <View key={cIdx} style={styles.miniItem}>
                        <Text style={{ fontSize: 13, color: theme.text, fontWeight: '600' }}>{client.name}</Text>
                        <Text style={{ fontSize: 11, color: theme.textMuted }}>{client.role}</Text>
                      </View>
                    ))}
                    {(emp.assignedClients || []).length === 0 && (
                      <Text style={{ color: theme.textMuted, fontStyle: 'italic', fontSize: 11 }}>
                        No clients assigned.
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))
          ) : (
            filteredTLs.map((tl) => (
              <View 
                key={tl.id}
                style={[styles.trackingCard, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftColor: theme.accentSecondary }]}
              >
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{tl.name}</Text>
                    <Text style={{ fontSize: 11, color: theme.textMuted }}>Team Lead • {tl.email}</Text>
                  </View>
                  <View style={styles.percentageCircle}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: theme.accentSecondary }}>
                      {Math.round(tl.progress * 100)}%
                    </Text>
                  </View>
                </View>

                {/* Metrics */}
                <View style={styles.metricsRow}>
                  <View style={[styles.metricBox, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
                    <Text style={[styles.metricLabel, { color: theme.textMuted }]}>POC COMM</Text>
                    <Text style={[styles.metricValue, { color: theme.text }]}>
                      {tl.talkedToday} / {tl.totalClients}
                    </Text>
                  </View>
                  <View style={[styles.metricBox, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
                    <Text style={[styles.metricLabel, { color: theme.textMuted }]}>CONTENT FLOW</Text>
                    <Text style={[styles.metricValue, { color: theme.text }]}>
                      {tl.todayContentDone} / {tl.todayContentTotal}
                    </Text>
                  </View>
                </View>

                {/* Clients sub-list */}
                <TouchableOpacity
                  onPress={() => toggleEmpExpand(tl.id)}
                  style={[styles.expandButton, { borderTopColor: theme.border }]}
                >
                  <Text style={{ fontSize: 12, color: theme.textSecondary, fontWeight: '700' }}>
                    Client Coverage ({(tl.assignedClients || []).length})
                  </Text>
                  {expandedEmp[tl.id] ? (
                    <ChevronDown size={16} color={theme.textSecondary} />
                  ) : (
                    <ChevronRight size={16} color={theme.textSecondary} />
                  )}
                </TouchableOpacity>

                {expandedEmp[tl.id] && (
                  <View style={[styles.expandedContent, { backgroundColor: theme.elevated }]}>
                    {(tl.assignedClients || []).map((client, cIdx) => (
                      <View key={cIdx} style={styles.miniItem}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={[styles.dot, { backgroundColor: client.talkedToday ? theme.success : theme.warning }]} />
                          <Text style={{ fontSize: 13, color: theme.text, fontWeight: '600', marginLeft: 8 }}>
                            {client.name}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: theme.textMuted }}>
                          {client.talkedToday ? 'Talked Today' : 'No Communication'}
                        </Text>
                      </View>
                    ))}
                    {(tl.assignedClients || []).length === 0 && (
                      <Text style={{ color: theme.textMuted, fontStyle: 'italic', fontSize: 11 }}>
                        No clients assigned.
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))
          )}

          {/* Empty state */}
          {((activeTab === 'employee' && filteredEmployees.length === 0) || 
            (activeTab === 'tl' && filteredTLs.length === 0)) && (
            <View style={styles.emptyView}>
              <Text style={{ color: theme.textMuted, fontStyle: 'italic' }}>
                No records found.
              </Text>
            </View>
          )}

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  overviewGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  trackingCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  percentageCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  metricBox: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  expandButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  expandedContent: {
    marginTop: 10,
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  miniItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyView: {
    padding: 40,
    alignItems: 'center',
  },
});
