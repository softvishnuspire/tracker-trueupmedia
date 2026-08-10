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
import { Trophy, ChevronLeft, ChevronRight, Search, Briefcase, Users, Award, Flame } from 'lucide-react-native';
import { adminApi } from '../../services/api';
import { useTheme } from '../../hooks/use-theme';
import { SafeAreaView } from 'react-native-safe-area-context';

interface StreakUser {
  id: string;
  name: string;
  email: string;
  role: string;
  streakCount: number;
  streakDays: string[];
  assignedClients?: string[];
}

export default function StreakSystemScreen() {
  const theme = useTheme();

  const getCurrentMonthStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`; // YYYY-MM
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  const [activeTab, setActiveTab] = useState<'employee' | 'tl'>('employee');
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState<{ teamLeads: StreakUser[], employees: StreakUser[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStreaks = async (month: string) => {
    setLoading(true);
    try {
      const res = await adminApi.getStreaks(month);
      setData(res.data);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to retrieve streaks records. Please verify user_streaks database table exists.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreaks(selectedMonth);
  }, [selectedMonth]);

  const handleMonthChange = (offset: number) => {
    const [year, mon] = selectedMonth.split('-').map(Number);
    const date = new Date(year, mon - 1 + offset, 1);
    const nextMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextMonthStr);
  };

  const getMonthLabel = (monthStr: string) => {
    try {
      const [year, mon] = monthStr.split('-').map(Number);
      const date = new Date(year, mon - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch (e) {
      return monthStr;
    }
  };

  const getDaysInMonth = (monthStr: string) => {
    const [year, mon] = monthStr.split('-').map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const days = [];
    for (let i = 1; i <= lastDay; i++) {
      days.push(String(i).padStart(2, '0'));
    }
    return days;
  };

  const daysArray = getDaysInMonth(selectedMonth);

  const filteredEmployees = data?.employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredTLs = data?.teamLeads.filter(tl => 
    tl.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    tl.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Month Navigator & Search bar */}
      <View style={[styles.filterBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={[styles.monthSelector, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
          <TouchableOpacity onPress={() => handleMonthChange(-1)} style={{ padding: 6 }}>
            <ChevronLeft size={16} color={theme.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, minWidth: 90, textAlign: 'center' }}>
            {selectedMonth}
          </Text>
          <TouchableOpacity onPress={() => handleMonthChange(1)} style={{ padding: 6 }}>
            <ChevronRight size={16} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchBox, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
          <Search size={16} color={theme.textMuted} style={{ marginRight: 6 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search team member..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Tabs */}
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

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textMuted, marginBottom: 4 }}>
            Active Records for: {getMonthLabel(selectedMonth)}
          </Text>

          {activeTab === 'employee' ? (
            filteredEmployees.map((emp) => (
              <StreakCard key={emp.id} user={emp} days={daysArray} month={selectedMonth} type="employee" theme={theme} />
            ))
          ) : (
            filteredTLs.map((tl) => (
              <StreakCard key={tl.id} user={tl} days={daysArray} month={selectedMonth} type="tl" theme={theme} />
            ))
          )}

          {((activeTab === 'employee' && filteredEmployees.length === 0) || 
            (activeTab === 'tl' && filteredTLs.length === 0)) && (
            <View style={styles.emptyView}>
              <Flame size={32} color={theme.textMuted} style={{ marginBottom: 12 }} />
              <Text style={{ color: theme.textMuted, fontStyle: 'italic' }}>
                No streak records found.
              </Text>
            </View>
          )}

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StreakCard({ user, days, month, type, theme }: { user: StreakUser, days: string[], month: string, type: 'employee' | 'tl', theme: any }) {
  const hasStreak = user.streakCount > 0;
  
  return (
    <View style={[styles.streakCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Left side accent */}
      <View style={[styles.sideAccent, { backgroundColor: hasStreak ? '#EF4444' : theme.border }]} />

      <View style={styles.cardHeaderRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.cardName, { color: theme.text }]}>{user.name}</Text>
            {user.streakCount >= 10 && <Award size={14} color="#F59E0B" style={{ marginLeft: 6 }} />}
          </View>
          <Text style={{ fontSize: 11, color: theme.textMuted }}>{user.role} • {user.email}</Text>
        </View>

        {/* Large Flame/Streak Counter */}
        <View style={[styles.streakBox, { backgroundColor: theme.elevated, borderColor: hasStreak ? '#EF4444' : theme.border }]}>
          <Text style={[styles.streakNum, { color: hasStreak ? '#EF4444' : theme.textMuted }]}>
            {user.streakCount}
          </Text>
          <Text style={{ fontSize: 8, color: theme.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>Streaks</Text>
        </View>
      </View>

      {/* Grid Heatmap */}
      <View style={styles.heatmapSection}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: theme.textMuted, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>
          Consistency Grid
        </Text>
        <View style={styles.gridContainer}>
          {days.map(d => {
            const dateKey = `${month}-${d}`;
            const isStreak = user.streakDays.includes(dateKey);
            return (
              <View 
                key={d}
                style={[
                  styles.dayBlock, 
                  { 
                    backgroundColor: isStreak ? '#EF4444' : theme.elevated,
                    borderColor: isStreak ? 'transparent' : theme.border
                  }
                ]}
              >
                <Text style={{ fontSize: 8, fontWeight: 'bold', color: isStreak ? '#fff' : theme.textMuted }}>
                  {parseInt(d)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
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
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
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
    gap: 14,
  },
  streakCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  sideAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingLeft: 4,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '800',
  },
  streakBox: {
    width: 54,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakNum: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
  },
  heatmapSection: {
    paddingLeft: 4,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  dayBlock: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
