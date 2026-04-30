"use client";

import { useState, FormEvent, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from './page.module.css';

const roles = [
  {
    id: 'admin',
    name: 'Administrator',
    desc: 'Full system access',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
    )
  },
  {
    id: 'coo',
    name: 'COO',
    desc: 'Executive overview',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></svg>
    )
  },
  {
    id: 'gm',
    name: 'General Manager',
    desc: 'Branch management',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
    )
  },
  {
    id: 'tl',
    name: 'Team Lead',
    desc: 'Team operations',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    )
  },
  {
    id: 'posting',
    name: 'Posting Team',
    desc: 'Content publishing',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></svg>
    )
  }
];

const canonicalizeRole = (role?: string | null) => {
  const normalized = (role || '').trim().toLowerCase().replace(/[_\s]+/g, ' ');

  if (['admin', 'administrator'].includes(normalized)) return 'admin';
  if (['coo'].includes(normalized)) return 'coo';
  if (['gm', 'general manager'].includes(normalized)) return 'gm';
  if (['tl', 'tl1', 'tl2', 'team lead'].includes(normalized)) return 'tl';
  if (['posting', 'posting team'].includes(normalized)) return 'posting';

  return normalized || null;
};

export default function Login() {
  const [selectedRole, setSelectedRole] = useState('admin');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Force dark theme for login page
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      // Resolve role from metadata and normalize role aliases
      const metadataRole = data.user?.user_metadata?.role || data.user?.app_metadata?.role;
      const userRole = canonicalizeRole(metadataRole);
      const selectedRoleCanonical = canonicalizeRole(selectedRole);

      if (userRole && selectedRoleCanonical && userRole !== selectedRoleCanonical) {
        setError(`Your account is assigned to the "${userRole}" role. Please select the correct role.`);
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Security: Do not store token/user data in localStorage
      // Supabase handles session securely via cookies/session storage

      // Redirect to the role's dashboard
      window.location.href = `/${selectedRole}/dashboard`;
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setResetMessage('Password reset link sent to your email. Please check your inbox.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Animated Background Blobs */}
      <div className={styles.backgroundElements}>
        <div className={styles.blob1}></div>
        <div className={styles.blob2}></div>
        <div className={styles.blob3}></div>
      </div>

      {/* Main Glassmorphism Card */}
      <div className={styles.glassCard}>

        {/* Left Branding Section */}
        <div className={styles.brandSection}>
          <div className={styles.brandContent}>
            <div className={styles.logoContainer}>
              {!logoError ? (
                <img
                  src="/logo.png"
                  alt="TrueUp Media"
                  className={styles.mainLogo}
                  onError={() => setLogoError(true)}
                />
              ) : (
                <h1 style={{ color: 'var(--primary)', fontSize: '2.5rem', margin: 0 }}>TrueUp Media</h1>
              )}
            </div>
          </div>
          <div className={styles.welcomeText}>
            <h1>Welcome Back</h1>
            <p>Access your personalized dashboard by selecting your designated role below.</p>
          </div>
        </div>

        {/* Right Login Section */}
        <div className={styles.loginSection}>
          <div className={styles.loginHeader}>
            <h2>{isForgotPassword ? 'Reset Password' : 'Select your role'}</h2>
            <p>{isForgotPassword ? 'Enter your email to receive a reset link' : 'Choose your workspace to continue'}</p>
          </div>

          {!isForgotPassword && (
          <div className={styles.roleDropdownContainer}>
            <label className={styles.dropdownLabel}>Workspace Role</label>
            <div
              className={`${styles.dropdownToggle} ${dropdownOpen ? styles.dropdownToggleActive : ''}`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div className={styles.selectedRoleDisplay}>
                <div className={styles.selectedRoleIcon}>
                  {roles.find(r => r.id === selectedRole)?.icon}
                </div>
                <div className={styles.selectedRoleInfo}>
                  <span className={styles.selectedRoleName}>{roles.find(r => r.id === selectedRole)?.name}</span>
                  <span className={styles.selectedRoleDesc}>{roles.find(r => r.id === selectedRole)?.desc}</span>
                </div>
              </div>
              <svg className={`${styles.chevron} ${dropdownOpen ? styles.chevronOpen : ''}`} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>

            {dropdownOpen && (
              <div className={styles.dropdownMenu}>
                {roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    className={`${styles.dropdownItem} ${selectedRole === role.id ? styles.dropdownItemActive : ''}`}
                    onClick={() => {
                      setSelectedRole(role.id);
                      setDropdownOpen(false);
                    }}
                  >
                    <div className={styles.dropdownItemIcon}>
                      {role.icon}
                    </div>
                    <div className={styles.dropdownItemInfo}>
                      <span className={styles.dropdownItemName}>{role.name}</span>
                      <span className={styles.dropdownItemDesc}>{role.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          )}

          {error && (
            <div className={styles.errorMessage}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
              {error}
            </div>
          )}

          {resetMessage && (
            <div style={{ color: '#10b981', padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              {resetMessage}
            </div>
          )}

          {isForgotPassword ? (
            <form onSubmit={handleResetPassword}>
              <div className={styles.formGroup}>
                <label htmlFor="reset-email">Email Address</label>
                <div className={styles.inputWrapper}>
                  <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  <input
                    type="email"
                    id="reset-email"
                    className={styles.input}
                    placeholder="name@trueupmedia.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? (
                  <>
                    <span className={styles.spinner}></span>
                    Sending...
                  </>
                ) : (
                  <>
                    Send Reset Link
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                  </>
                )}
              </button>
              
              <button 
                type="button" 
                onClick={() => { setIsForgotPassword(false); setError(''); setResetMessage(''); }}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', width: '100%', marginTop: '1rem', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Back to Login
              </button>
            </form>
          ) : (
          <form onSubmit={handleLogin}>
            <div className={styles.formGroup}>
              <label htmlFor="email">Email Address</label>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                <input
                  type="email"
                  id="email"
                  className={styles.input}
                  placeholder="name@trueupmedia.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={100}
                  pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
                  title="Please enter a valid email address"
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className={styles.input}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={128}
                  required
                />
                <button
                  type="button"
                  className={styles.togglePasswordBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>

            {selectedRole !== 'tl' && (
              <a href="#" className={styles.forgotPassword} onClick={(e) => { e.preventDefault(); setIsForgotPassword(true); setError(''); setResetMessage(''); }}>Forgot password?</a>
            )}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In as {roles.find(r => r.id === selectedRole)?.name}
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </>
              )}
            </button>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
