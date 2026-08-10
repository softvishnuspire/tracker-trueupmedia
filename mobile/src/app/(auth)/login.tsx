import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator, 
  Image, 
  ScrollView 
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../../utils/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Mail, 
  Lock, 
  Shield, 
  Layers, 
  Users, 
  User, 
  Award, 
  Globe, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  EyeOff, 
  ArrowRight 
} from 'lucide-react-native';
import { useTheme } from '../../hooks/use-theme';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const ROLES = [
  { id: 'admin', name: 'Administrator', detail: 'Full system access', icon: Shield },
  { id: 'gm', name: 'General Manager', detail: 'Operations management', icon: Layers },
  { id: 'tl', name: 'Team Lead', detail: 'Lead pipeline control', icon: Users },
  { id: 'employee', name: 'Employee', detail: 'Task production list', icon: User },
  { id: 'coo', name: 'COO', detail: 'Executive operations', icon: Award },
  { id: 'posting', name: 'Posting Team', detail: 'Content publishing', icon: Globe },
];

export default function LoginScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  
  const { setUserData } = useAuthStore();
  const router = useRouter();

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      if (authData.user) {
        // Fetch user role from public users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('name, email, role, role_identifier')
          .eq('user_id', authData.user.id)
          .single();

        if (userData && !userError) {
          setUserData(userData);
        } else {
          // Fallback if users table doesn't have it, try user_metadata
          const metadata = authData.user.user_metadata;
          setUserData({
            name: metadata?.full_name || authData.user.email,
            email: authData.user.email,
            role: selectedRole.id, // Bind selected dropdown role as default fallback
            role_identifier: metadata?.role_identifier,
          });
        }
        
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const SelectedRoleIcon = selectedRole.icon;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.mainCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Welcome Branding Card (Left Side representation on mobile) */}
            <View style={styles.welcomeHeader}>
              <View style={[styles.logoContainer, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
                <Image 
                  source={require('../../../assets/images/logo.png')} 
                  style={styles.logo} 
                />
              </View>
              <Text style={[styles.welcomeTitle, { color: theme.text }]}>Welcome Back</Text>
              <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
                Access your personalized dashboard by selecting your designated role below.
              </Text>
            </View>

            {/* Form Header */}
            <View style={styles.formHeader}>
              <Text style={[styles.formTitle, { color: theme.text }]}>Select your role</Text>
              <Text style={[styles.formSubtitle, { color: theme.textSecondary }]}>Choose your workspace to continue</Text>
            </View>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            {/* Form Fields */}
            <View style={styles.form}>
            
            {/* Workspace Role Selector */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Workspace Role</Text>
              
              <TouchableOpacity 
                style={[styles.roleSelectorButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => setShowRoleDropdown(!showRoleDropdown)}
              >
                <View style={styles.roleButtonLeft}>
                  <View style={[styles.roleIconBadge, { backgroundColor: theme.elevated }]}>
                    <SelectedRoleIcon size={18} color={theme.accent} />
                  </View>
                  <View style={styles.roleButtonTextContainer}>
                    <Text style={[styles.roleButtonName, { color: theme.text }]}>{selectedRole.name}</Text>
                    <Text style={[styles.roleButtonDetail, { color: theme.textSecondary }]}>{selectedRole.detail}</Text>
                  </View>
                </View>
                {showRoleDropdown ? (
                  <ChevronUp size={20} color={theme.textSecondary} />
                ) : (
                  <ChevronDown size={20} color={theme.textSecondary} />
                )}
              </TouchableOpacity>

              {/* Custom Dropdown Items */}
              {showRoleDropdown && (
                <View style={[styles.dropdownContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  {ROLES.map((role) => {
                    const RoleIcon = role.icon;
                    const isSelected = selectedRole.id === role.id;
                    return (
                      <TouchableOpacity
                        key={role.id}
                        style={[
                          styles.dropdownItem,
                          { borderBottomColor: theme.border },
                          isSelected && { backgroundColor: theme.elevated }
                        ]}
                        onPress={() => {
                          setSelectedRole(role);
                          setShowRoleDropdown(false);
                        }}
                      >
                        <RoleIcon size={18} color={isSelected ? theme.accent : theme.textSecondary} style={{ marginRight: 12 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.dropdownItemName, { color: theme.text }, isSelected && { color: theme.accent }]}>
                            {role.name}
                          </Text>
                          <Text style={[styles.dropdownItemDetail, { color: theme.textSecondary }]}>
                            {role.detail}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Email Address */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email Address</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Mail size={20} color={theme.textMuted} style={styles.inputIcon} />
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="Enter your email"
                      placeholderTextColor={theme.textMuted}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      autoCapitalize="none"
                      autoComplete="off"
                      autoCorrect={false}
                      keyboardType="email-address"
                    />
                  )}
                />
              </View>
              {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Password</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Lock size={20} color={theme.textMuted} style={styles.inputIcon} />
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="••••••••"
                      placeholderTextColor={theme.textMuted}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      secureTextEntry={!showPassword}
                    />
                  )}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  {showPassword ? (
                    <EyeOff size={20} color={theme.textMuted} />
                  ) : (
                    <Eye size={20} color={theme.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}
            </View>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPasswordContainer}>
              <Text style={[styles.forgotPasswordText, { color: theme.accent }]}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.buttonDisabled]} 
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonInner}>
                  <Text style={styles.buttonText}>Sign In as {selectedRole.name}</Text>
                  <ArrowRight size={20} color="#fff" style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  mainCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    marginBottom: 20,
  },
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 180,
    height: 52,
    resizeMode: 'contain',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  formHeader: {
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  formSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    flexDirection: 'column',
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 54,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  eyeBtn: {
    padding: 4,
  },
  roleSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 64,
  },
  roleButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roleIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roleButtonTextContainer: {
    flex: 1,
  },
  roleButtonName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  roleButtonDetail: {
    fontSize: 11,
    marginTop: 2,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropdownItemName: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  dropdownItemDetail: {
    fontSize: 10,
    marginTop: 1,
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    fontSize: 14,
  },
  fieldError: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 2,
    marginLeft: 4,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#00A3C4',
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#00A3C4',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
