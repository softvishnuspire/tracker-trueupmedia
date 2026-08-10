import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Modal, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Search, Plus, Edit2, Trash2, X, Calendar as CalendarIcon, User } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { adminApi, Client, ContentItem } from '../../services/api';
import { isCrossMonthRescheduled } from '../../utils/calendarUtils';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const clientSchema = z.object({
  company_name: z.string().min(1, 'Company Name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').or(z.literal('')),
  address: z.string().optional(),
  posts_per_month: z.string().min(1, 'Required'),
  reels_per_month: z.string().min(1, 'Required'),
  youtube_per_month: z.string().min(1, 'Required'),
  batch_type: z.enum(['1-1', '15-15']),
  password: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

import { useTheme } from '../../hooks/use-theme';

export default function ClientsScreen() {
  const theme = useTheme();
  const [clients, setClients] = useState<Client[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      batch_type: '1-1',
      posts_per_month: '0',
      reels_per_month: '0',
      youtube_per_month: '0',
    }
  });

  const fetchClients = async () => {
    try {
      const res = await adminApi.getClients();
      setClients(res.data || []);

      const monthStr = format(new Date(), 'yyyy-MM');
      const calendarRes = await adminApi.getMasterCalendar(monthStr);
      setContentItems(calendarRes.data || []);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = clients.filter(c =>
    c.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddClick = () => {
    setEditingClient(null);
    reset({
      company_name: '', phone: '', email: '', address: '',
      posts_per_month: '0', reels_per_month: '0', youtube_per_month: '0',
      batch_type: '1-1', password: ''
    });
    setShowModal(true);
  };

  const handleEditClick = (client: Client) => {
    setEditingClient(client);
    reset({
      company_name: client.company_name,
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      posts_per_month: client.posts_per_month?.toString() || '0',
      reels_per_month: client.reels_per_month?.toString() || '0',
      youtube_per_month: client.youtube_per_month?.toString() || '0',
      batch_type: client.batch_type || '1-1',
      password: '',
    });
    setShowModal(true);
  };

  const handleDeleteClick = (id: string, name: string) => {
    Alert.alert(
      'Delete Client',
      `Are you sure you want to remove ${name}? This will delete all associated calendar data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await adminApi.deleteClient(id);
              fetchClients();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          }
        }
      ]
    );
  };

  const onSubmit = async (data: ClientFormData) => {
    setIsSubmitting(true);
    try {
      const submissionData = {
        ...data,
        posts_per_month: parseInt(data.posts_per_month) || 0,
        reels_per_month: parseInt(data.reels_per_month) || 0,
        youtube_per_month: parseInt(data.youtube_per_month) || 0,
      };

      if (editingClient) {
        if (!submissionData.password) delete submissionData.password;
        await adminApi.updateClient(editingClient.id, submissionData);
      } else {
        if (!submissionData.password) {
            Alert.alert('Validation', 'Password is required for new clients');
            setIsSubmitting(false);
            return;
        }
        await adminApi.addClient(submissionData);
      }
      setShowModal(false);
      fetchClients();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalReelsTarget = clients.reduce((sum, c) => sum + (c.reels_per_month || 0), 0);
  const totalPostsTarget = clients.reduce((sum, c) => sum + (c.posts_per_month || 0), 0);

  const actualReelsScheduled = contentItems.filter(item => !isCrossMonthRescheduled(item) && (item.content_type || '').toUpperCase() === 'REEL').length;
  const actualPostsScheduled = contentItems.filter(item => !isCrossMonthRescheduled(item) && (item.content_type || '').toUpperCase() === 'POST').length;

  const renderClientItem = ({ item: client }: { item: Client }) => {
    const clientActualReels = contentItems.filter(i => !isCrossMonthRescheduled(i) && i.client_id === client.id && (i.content_type || '').toUpperCase() === 'REEL').length;
    const clientActualPosts = contentItems.filter(i => !isCrossMonthRescheduled(i) && i.client_id === client.id && (i.content_type || '').toUpperCase() === 'POST').length;

    return (
      <View style={[styles.clientCard, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
        <View style={styles.clientHeader}>
          <View style={[styles.clientAvatar, { backgroundColor: theme.elevated }]}>
            <Text style={[styles.clientAvatarText, { color: theme.accent }]}>{client.company_name.substring(0, 2).toUpperCase()}</Text>
          </View>
          <View style={styles.clientInfo}>
            <Text style={[styles.clientName, { color: theme.text }]}>{client.company_name}</Text>
            <Text style={[styles.clientContact, { color: theme.textSecondary }]}>{client.email || client.phone || 'No contact info'}</Text>
          </View>
          <View style={[styles.batchBadge, client.batch_type === '15-15' ? styles.batch15 : styles.batch11]}>
            <Text style={[styles.batchText, client.batch_type === '15-15' ? styles.batchText15 : styles.batchText11]}>{client.batch_type}</Text>
          </View>
        </View>

        <View style={[styles.clientStatsRow, { backgroundColor: theme.elevated }]}>
          <View style={styles.clientStatBox}>
            <Text style={[styles.clientStatLabel, { color: theme.textMuted }]}>Reels</Text>
            <Text style={[styles.clientStatValue, { color: theme.text }]}>{clientActualReels} / {client.reels_per_month}</Text>
          </View>
          <View style={styles.clientStatBox}>
            <Text style={[styles.clientStatLabel, { color: theme.textMuted }]}>Posts</Text>
            <Text style={[styles.clientStatValue, { color: theme.text }]}>{clientActualPosts} / {client.posts_per_month}</Text>
          </View>
          <View style={styles.clientStatBox}>
            <Text style={[styles.clientStatLabel, { color: theme.textMuted }]}>YT</Text>
            <Text style={[styles.clientStatValue, { color: theme.text }]}>0 / {client.youtube_per_month}</Text>
          </View>
        </View>

        <View style={styles.clientActions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.elevated }]} onPress={() => router.push(`/calendar?clientId=${client.id}`)}>
            <CalendarIcon size={18} color={theme.accent} />
            <Text style={[styles.actionBtnText, { color: theme.accent }]}>Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.elevated }]} onPress={() => handleEditClick(client)}>
            <Edit2 size={18} color={theme.accent} />
            <Text style={[styles.actionBtnText, { color: theme.accent }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtnDelete, { backgroundColor: theme.danger + '15' }]} onPress={() => handleDeleteClick(client.id, client.company_name)}>
            <Trash2 size={18} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Client Management</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{clients.length} Total Clients</Text>
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.accent }]} onPress={handleAddClick}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryContainer}>
        <View style={[styles.summaryBox, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
          <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Reels</Text>
          <View style={styles.summaryValRow}>
            <Text style={[styles.summaryActual, { color: theme.text }]}>{actualReelsScheduled}</Text>
            <Text style={styles.summaryTarget}>/{totalReelsTarget}</Text>
          </View>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
          <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Posts</Text>
          <View style={styles.summaryValRow}>
            <Text style={[styles.summaryActual, { color: theme.text }]}>{actualPostsScheduled}</Text>
            <Text style={styles.summaryTarget}>/{totalPostsTarget}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Search size={20} color={theme.textMuted} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search clients..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor={theme.textMuted}
        />
        {searchTerm ? (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <X size={20} color={theme.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <View style={styles.listContainer}>
          <FlashList
            data={filteredClients}
            renderItem={renderClientItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>No clients found.</Text>
              </View>
            }
          />
        </View>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editingClient ? 'Edit Client' : 'Add New Client'}</Text>
            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalClose}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView style={styles.modalScroll}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Company Name *</Text>
                <Controller
                  control={control}
                  name="company_name"
                  render={({ field: { onChange, value } }) => (
                    <TextInput style={[styles.input, { backgroundColor: theme.elevated, borderColor: theme.border, color: theme.text }]} placeholder="Enter company name" placeholderTextColor={theme.textMuted} value={value} onChangeText={onChange} />
                  )}
                />
                {errors.company_name && <Text style={styles.errorText}>{errors.company_name.message}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Email</Text>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, value } }) => (
                    <TextInput style={[styles.input, { backgroundColor: theme.elevated, borderColor: theme.border, color: theme.text }]} placeholder="client@company.com" placeholderTextColor={theme.textMuted} keyboardType="email-address" value={value} onChangeText={onChange} autoCapitalize="none" />
                  )}
                />
                {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>{editingClient ? 'New Password (Optional)' : 'Password *'}</Text>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, value } }) => (
                    <TextInput style={[styles.input, { backgroundColor: theme.elevated, borderColor: theme.border, color: theme.text }]} placeholder="Minimum 6 characters" placeholderTextColor={theme.textMuted} secureTextEntry value={value} onChangeText={onChange} />
                  )}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Batch Type</Text>
                <View style={styles.batchToggleGroup}>
                  <TouchableOpacity 
                    style={[styles.batchToggle, { backgroundColor: theme.elevated, borderColor: theme.border }, control._formValues.batch_type === '1-1' && { backgroundColor: 'rgba(99, 102, 241, 0.1)', borderColor: theme.accent }]}
                    onPress={() => setValue('batch_type', '1-1')}
                  >
                    <Text style={[styles.batchToggleText, { color: theme.textSecondary }, control._formValues.batch_type === '1-1' && { color: theme.accent }]}>1-1 (Full Month)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.batchToggle, { backgroundColor: theme.elevated, borderColor: theme.border }, control._formValues.batch_type === '15-15' && { backgroundColor: 'rgba(99, 102, 241, 0.1)', borderColor: theme.accent }]}
                    onPress={() => setValue('batch_type', '15-15')}
                  >
                    <Text style={[styles.batchToggleText, { color: theme.textSecondary }, control._formValues.batch_type === '15-15' && { color: theme.accent }]}>15-15 (Bi-Monthly)</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.label, { color: theme.text }]}>Reels/mo</Text>
                  <Controller
                    control={control}
                    name="reels_per_month"
                    render={({ field: { onChange, value } }) => (
                      <TextInput style={[styles.input, { backgroundColor: theme.elevated, borderColor: theme.border, color: theme.text }]} placeholder="8" placeholderTextColor={theme.textMuted} keyboardType="number-pad" value={value} onChangeText={onChange} />
                    )}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginHorizontal: 4 }]}>
                  <Text style={[styles.label, { color: theme.text }]}>Posts/mo</Text>
                  <Controller
                    control={control}
                    name="posts_per_month"
                    render={({ field: { onChange, value } }) => (
                      <TextInput style={[styles.input, { backgroundColor: theme.elevated, borderColor: theme.border, color: theme.text }]} placeholder="12" placeholderTextColor={theme.textMuted} keyboardType="number-pad" value={value} onChangeText={onChange} />
                    )}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.label, { color: theme.text }]}>YT/mo</Text>
                  <Controller
                    control={control}
                    name="youtube_per_month"
                    render={({ field: { onChange, value } }) => (
                      <TextInput style={[styles.input, { backgroundColor: theme.elevated, borderColor: theme.border, color: theme.text }]} placeholder="4" placeholderTextColor={theme.textMuted} keyboardType="number-pad" value={value} onChangeText={onChange} />
                    )}
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: theme.accent }, isSubmitting && styles.submitButtonDisabled]} 
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>{editingClient ? 'Save Changes' : 'Create Client'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  addButton: {
    backgroundColor: '#4F46E5',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  summaryActual: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  summaryTarget: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginLeft: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontStyle: 'italic',
  },
  clientCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clientAvatarText: {
    color: '#4F46E5',
    fontWeight: 'bold',
    fontSize: 18,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  clientContact: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  batchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  batch11: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  batch15: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  batchText: {
    fontSize: 12,
    fontWeight: '600',
  },
  batchText11: {
    color: '#059669',
  },
  batchText15: {
    color: '#7C3AED',
  },
  clientStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  clientStatBox: {
    alignItems: 'center',
  },
  clientStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  clientStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  clientActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 14,
  },
  actionBtnDelete: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalClose: {
    padding: 4,
  },
  modalScroll: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    color: '#111827',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  batchToggleGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  batchToggle: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  batchToggleActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  batchToggleText: {
    fontWeight: '600',
    color: '#6B7280',
  },
  batchToggleTextActive: {
    color: '#4F46E5',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
