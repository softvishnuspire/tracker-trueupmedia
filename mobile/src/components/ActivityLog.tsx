import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { adminApi, ContentDetails, StatusHistoryItem, ContentItem } from '../services/api';
import { useTheme } from '../hooks/use-theme';

const STATUS_FLOWS: Record<string, string[]> = {
  'Reel': ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
  'YouTube': ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
  'Post': ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
  'Special Poster': ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
  'Special Day Poster': ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
};

interface ActivityLogProps {
  /** Content item to show the activity log for */
  item: ContentItem;
  /** Optional: pre-loaded content details (if already fetched) */
  contentDetails?: ContentDetails | null;
}

/**
 * ActivityLog component that displays a workflow timeline for a content item.
 * If `contentDetails` is provided, it uses that data directly.
 * Otherwise, it fetches the details from the backend API on mount.
 */
export default function ActivityLog({ item, contentDetails: externalDetails }: ActivityLogProps) {
  const theme = useTheme();
  const [details, setDetails] = useState<ContentDetails | null>(externalDetails || null);
  const [loading, setLoading] = useState(!externalDetails);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (externalDetails) {
      setDetails(externalDetails);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const fetchDetails = async () => {
      try {
        const res = await adminApi.getContentDetails(item.id);
        if (!cancelled) setDetails(res.data);
      } catch (err) {
        console.error('Failed to fetch activity log:', err);
        if (!cancelled) setDetails({ item, history: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDetails();
    return () => { cancelled = true; };
  }, [item.id, externalDetails]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading activity log...</Text>
      </View>
    );
  }

  if (!details) return null;

  const activeItem = details.item || item;
  const history = details.history || [];
  const flow = STATUS_FLOWS[activeItem.content_type] || STATUS_FLOWS['Reel'];
  const currentIdx = flow.indexOf(activeItem.status);

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.headerRow} 
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={[styles.title, { color: theme.text }]}>Activity Log</Text>
        {expanded ? (
          <ChevronUp size={18} color={theme.textMuted} />
        ) : (
          <ChevronDown size={18} color={theme.textMuted} />
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.timeline}>
          {/* Vertical line */}
          <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
          
          {flow.map((status, idx) => {
            const isCompleted = idx < currentIdx || activeItem.status === 'POSTED';
            const isCurrent = idx === currentIdx && activeItem.status !== 'POSTED';
            const historyEntry = history.find((h: StatusHistoryItem) => h.new_status === status);

            return (
              <View key={status} style={styles.step}>
                {/* Indicator */}
                <View style={[
                  styles.indicator,
                  { 
                    backgroundColor: isCompleted ? '#10B981' : isCurrent ? theme.accent : theme.elevated,
                    borderColor: isCompleted ? '#10B981' : isCurrent ? theme.accent : theme.border,
                  }
                ]}>
                  {isCompleted ? (
                    <Check size={10} color="#fff" />
                  ) : isCurrent ? (
                    <View style={styles.currentDot} />
                  ) : null}
                </View>

                {/* Content */}
                <View style={styles.stepContent}>
                  <Text style={[
                    styles.stepTitle,
                    { color: isCompleted || isCurrent ? theme.text : theme.textMuted },
                    isCurrent && { fontWeight: '800', color: theme.accent }
                  ]}>
                    {status}
                  </Text>
                  {historyEntry && (
                    <View style={styles.stepMeta}>
                      <View style={styles.stepMetaRow}>
                        <Text style={[styles.stepUser, { color: theme.textSecondary }]}>
                          {historyEntry.users?.role_identifier || historyEntry.users?.name || 'System'}
                        </Text>
                        <Text style={[styles.stepTime, { color: theme.textMuted }]}>
                          {format(parseISO(historyEntry.changed_at), 'MMM d, HH:mm')}
                        </Text>
                      </View>
                      {historyEntry.note && (
                        <Text style={[styles.stepNote, { color: theme.textSecondary }]}>
                          &quot;{historyEntry.note}&quot;
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 12,
  },
  timeline: {
    position: 'relative',
    paddingLeft: 28,
    marginTop: 8,
  },
  timelineLine: {
    position: 'absolute',
    left: 9,
    top: 4,
    bottom: 4,
    width: 2,
    borderRadius: 1,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  indicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: -28,
    top: 0,
  },
  currentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  stepContent: {
    flex: 1,
    paddingBottom: 4,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepMeta: {
    marginTop: 4,
    paddingLeft: 2,
  },
  stepMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepUser: {
    fontSize: 11,
    fontWeight: '600',
  },
  stepTime: {
    fontSize: 10,
    fontWeight: '500',
  },
  stepNote: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
