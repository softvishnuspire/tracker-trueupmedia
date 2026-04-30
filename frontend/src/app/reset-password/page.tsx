"use client";

import { useState, FormEvent, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Force dark theme for auth pages
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        // Sync password with custom users table securely via our API route
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          try {
            const res = await fetch('/api/sync-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id, newPassword: password }),
            });
            
            if (!res.ok) {
              console.error('Failed to sync password via API');
            }
          } catch (apiError) {
            console.error('Network error while syncing password:', apiError);
          }
        }

        setMessage('Password updated successfully! Redirecting to login...');
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.backgroundElements}>
        <div className={styles.blob1}></div>
        <div className={styles.blob2}></div>
        <div className={styles.blob3}></div>
      </div>

      <div className={styles.glassCard}>
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
            <h1>Secure Your Account</h1>
            <p>Enter your new password below to regain access to your dashboard.</p>
          </div>
        </div>

        <div className={styles.loginSection}>
          <div className={styles.loginHeader}>
            <h2>Update Password</h2>
            <p>Please enter your new password</p>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
              {error}
            </div>
          )}

          {message && (
            <div style={{ color: '#10b981', padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              {message}
            </div>
          )}

          <form onSubmit={handleUpdatePassword}>
            <div className={styles.formGroup}>
              <label htmlFor="password">New Password</label>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className={styles.input}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
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

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  className={styles.input}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className={styles.togglePasswordBtn}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading || !!message}>
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  Updating...
                </>
              ) : (
                <>
                  Save New Password
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </>
              )}
            </button>
            
            <button 
              type="button" 
              onClick={() => router.push('/')}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', width: '100%', marginTop: '1rem', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              Back to Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
