import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Modal, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Search, Plus, Edit2, Trash2, X, Key } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { adminApi, TeamMember } from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

const teamSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  role_identifier: z.string().optional(),
});

type TeamFormData = z.infer<typeof teamSchema>;

import { useTheme } from '../../hooks/use-theme';

export default function TeamScreen() {
  const theme = useTheme();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      role: 'TEAM LEAD',
      role_identifier: '',
    }
  });

  const selectedRole = watch('role');

  const fetchTeam = async () => {
    try {
      const res = await adminApi.getTeam();
      setTeam(res.data || []);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const filteredTeam = team.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddClick = () => {
    setEditingMember(null);
    reset({
      name: '', email: '', password: '', role: 'TEAM LEAD', role_identifier: ''
    });
    setShowModal(true);
  };

  const handleEditClick = (member: TeamMember) => {
    setEditingMember(member);
    reset({
      name: member.name,
      email: member.email,
      password: '',
      role: member.role,
      role_identifier: member.role_identifier || '',
    });
    setShowModal(true);
  };

  const handleDeleteClick = (id: string, name: string) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${name} from the team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              await adminApi.deleteTeamMember(id);
              fetchTeam();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          }
        }
      ]
    );
  };

  const onSubmit = async (data: TeamFormData) => {
    setIsSubmitting(true);
    try {
      const payload = { ...data };
      if (!payload.password) delete payload.password;

      if (editingMember) {
        await adminApi.updateTeamMember(editingMember.user_id || editingMember.id!, payload);
      } else {
        if (!data.password) {
          Alert.alert('Validation Error', 'Password is required for new accounts');
          setIsSubmitting(false);
          return;
        }
        await adminApi.addTeamMember(payload);
      }
      setShowModal(false);
      fetchTeam();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMember = ({ item }: { item: TeamMember }) => (
    <View style={[styles.memberCard, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
      <View style={styles.memberInfo}>
        <View style={[styles.avatar, { backgroundColor: theme.elevated }]}>
          <Text style={[styles.avatarText, { color: theme.accent }]}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.details}>
          <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.email, { color: theme.textSecondary }]}>{item.email}</Text>
          <View style={styles.roleContainer}>
            <View style={[styles.roleBadge, { backgroundColor: theme.elevated }]}>
              <Text style={[styles.roleText, { color: theme.textSecondary }]}>{item.role}</Text>
            </View>
            {item.role_identifier ? (
              <Text style={[styles.roleIdText, { color: theme.textMuted }]}>{item.role_identifier}</Text>
            ) : null}
          </View>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.elevated }]} onPress={() => handleEditClick(item)}>
          <Edit2 size={18} color={theme.accent} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtnDelete, { backgroundColor: theme.danger + '15' }]} onPress={() => handleDeleteClick(item.user_id || item.id!, item.name)}>
          <Trash2 size={18} color={theme.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Team Management</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{team.length} Members</Text>
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.accent }]} onPress={handleAddClick}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Search size={20} color={theme.textMuted} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search by name or email..."
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
            data={filteredTeam}
            renderItem={renderMember}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>No team members found.</Text>
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
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editingMember ? 'Edit Member' : 'Add Team Member'}</Text>
            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalClose}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView style={styles.modalScroll}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Full Name *</Text>
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, value } }) => (
                    <TextInput style={[styles.input, { backgroundColor: theme.elevated, borderColor: theme.border, color: theme.text }]} placeholder="Enter full name" placeholderTextColor={theme.textMuted} value={value} onChangeText={onChange} />
                  )}
                />
                {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Email Address *</Text>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, value } }) => (
                    <TextInput style={[styles.input, { backgroundColor: theme.elevated, borderColor: theme.border, color: theme.text }]} placeholder="name@trueupmedia.com" placeholderTextColor={theme.textMuted} keyboardType="email-address" value={value} onChangeText={onChange} autoCapitalize="none" />
                  )}
                />
                {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>{editingMember ? 'New Password (Optional)' : 'Password *'}</Text>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, value } }) => (
                    <TextInput style={[styles.input, { backgroundColor: theme.elevated, borderColor: theme.border, color: theme.text }]} placeholder="Minimum 6 characters" placeholderTextColor={theme.textMuted} secureTextEntry value={value} onChangeText={onChange} />
                  )}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>System Role *</Text>
                <Controller
                  control={control}
                  name="role"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.pickerContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleChips}>
                            {['ADMIN', 'GM', 'MANAGER', 'COO', 'TEAM LEAD', 'POSTING TEAM', 'PRODUCTION HEAD', 'CONTENT HEAD', 'EMPLOYEE'].map(r => (
                                <TouchableOpacity 
                                    key={r}
                                    style={[styles.roleChip, { backgroundColor: theme.elevated, borderColor: theme.border }, value === r && { backgroundColor: 'rgba(99, 102, 241, 0.1)', borderColor: theme.accent }]}
                                    onPress={() => onChange(r)}
                                >
                                    <Text style={[styles.roleChipText, { color: theme.textSecondary }, value === r && { color: theme.accent }]}>{r}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                  )}
                />
              </View>

              {(selectedRole === 'TEAM LEAD' || selectedRole === 'POSTING TEAM') && (
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>{selectedRole} Identifier *</Text>
                  <Controller
                    control={control}
                    name="role_identifier"
                    render={({ field: { onChange, value } }) => (
                      <TextInput style={[styles.input, { backgroundColor: theme.elevated, borderColor: theme.border, color: theme.text }]} placeholder={selectedRole === 'TEAM LEAD' ? "e.g. TL1" : "e.g. P1"} placeholderTextColor={theme.textMuted} value={value} onChangeText={(t) => onChange(t.toUpperCase())} />
                    )}
                  />
                </View>
              )}

              {selectedRole === 'EMPLOYEE' && (
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Employee Category *</Text>
                  <Controller
                    control={control}
                    name="role_identifier"
                    render={({ field: { onChange, value } }) => (
                      <View style={styles.roleChips}>
                        {['REEL', 'POST', 'WRITER'].map(r => (
                            <TouchableOpacity 
                                key={r}
                                style={[styles.roleChip, { backgroundColor: theme.elevated, borderColor: theme.border }, value === r && { backgroundColor: 'rgba(99, 102, 241, 0.1)', borderColor: theme.accent }]}
                                onPress={() => onChange(r)}
                            >
                                <Text style={[styles.roleChipText, { color: theme.textSecondary }, value === r && { color: theme.accent }]}>
                                    {r === 'REEL' ? 'Reel Editor' : r === 'POST' ? 'Poster Editor' : 'Content Writer'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  />
                </View>
              )}

              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: theme.accent }, isSubmitting && styles.submitButtonDisabled]} 
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>{editingMember ? 'Save Changes' : 'Create Account'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280' },
  addButton: { backgroundColor: '#4F46E5', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 16, paddingHorizontal: 12, borderRadius: 12, height: 48, borderWidth: 1, borderColor: '#E5E7EB' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#111827' },
  listContainer: { flex: 1 },
  listContent: { padding: 16, paddingTop: 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6B7280', fontStyle: 'italic' },
  
  memberCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, alignItems: 'center', justifyContent: 'space-between' },
  memberInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 18 },
  details: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  email: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  roleContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  roleBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  roleText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  roleIdText: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  actionBtnDelete: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalClose: { padding: 4 },
  modalScroll: { padding: 16 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, height: 52, fontSize: 16, backgroundColor: '#F9FAFB', color: '#111827' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  
  pickerContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  roleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', marginBottom: 8 },
  roleChipActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  roleChipText: { fontWeight: '600', color: '#6B7280' },
  roleChipTextActive: { color: '#4F46E5' },
  
  submitButton: { backgroundColor: '#4F46E5', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 16, marginBottom: 40 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
