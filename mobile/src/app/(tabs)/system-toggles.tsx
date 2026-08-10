import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Switch, 
  ActivityIndicator, 
  TouchableOpacity, 
  Alert,
  ScrollView
} from 'react-native';
import { Settings2, CalendarRange, Info, Save } from 'lucide-react-native';
import { settingsApi, SystemSetting } from '../../services/api';
import { useTheme } from '../../hooks/use-theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SystemTogglesScreen() {
  const theme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Settings values
  const [showCompanyCalendar, setShowCompanyCalendar] = useState(true);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await settingsApi.getSettings();
      const settingsList: SystemSetting[] = res.data || [];
      
      const calendarSetting = settingsList.find(s => s.key === 'show_company_calendar');
      if (calendarSetting) {
        setShowCompanyCalendar(
          calendarSetting.value === true || 
          calendarSetting.value === 'true'
        );
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to fetch system configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await settingsApi.updateSetting('show_company_calendar', showCompanyCalendar);
      Alert.alert('Success', 'System configuration updated successfully!');
      fetchSettings();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to update system settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Settings Header Info */}
        <View style={styles.headerInfo}>
          <Text style={[styles.title, { color: theme.text }]}>Visibility Configuration</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Toggle features on or off globally across all client applications.
          </Text>
        </View>

        {/* Toggles Container Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
              <Settings2 size={20} color={theme.accent} />
            </View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Feature Visibility</Text>
          </View>

          <View style={styles.cardBody}>
            {/* Toggle row */}
            <View style={[styles.settingRow, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
              <View style={styles.settingTextContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <CalendarRange size={18} color={theme.textSecondary} style={{ marginRight: 8 }} />
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Show Company Calendar</Text>
                </View>
                <Text style={[styles.settingDesc, { color: theme.textMuted }]}>
                  Controls visibility of the global Company Calendar for non-admin roles (GM, TL, Posting).
                </Text>
              </View>
              <Switch
                value={showCompanyCalendar}
                onValueChange={setShowCompanyCalendar}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor={theme.surface}
              />
            </View>

            {/* Pro Tip info banner */}
            <View style={[styles.infoBanner, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
              <Info size={18} color={theme.accent} style={{ marginRight: 8, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                  <Text style={{ fontWeight: 'bold' }}>Pro Tip: </Text>
                  Turning off the Company Calendar is useful during system updates or if you want to restrict employees to only their assigned client schedules temporarily.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSaveSettings}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: theme.accent }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Save size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>Save Configurations</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardBody: {
    padding: 16,
    gap: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  settingDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 17,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 12,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
