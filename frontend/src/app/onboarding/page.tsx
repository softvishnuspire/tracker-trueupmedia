'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { User, Mail, Phone, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { publicApi } from '@/lib/api';
import styles from './onboarding_public.module.css';

export default function PublicOnboardingPage() {
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone_number: '',
    });
    const [status, setStatus] = useState<'IDLE' | 'SUBMITTING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.full_name || !formData.email) return;

        setStatus('SUBMITTING');
        try {
            await publicApi.submitOnboarding(formData);
            setStatus('SUCCESS');
        } catch (err: any) {
            console.error('Submission error:', err);
            setErrorMsg(err.response?.data?.error || 'Failed to submit application. Please try again.');
            setStatus('ERROR');
        }
    };

    if (status === 'SUCCESS') {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.successState}>
                        <div className={styles.successIcon}>
                            <CheckCircle size={48} />
                        </div>
                        <h2>Application Received!</h2>
                        <p>
                            Thank you for your interest. Our team will review your application 
                            and get back to you via email within 24-48 hours.
                        </p>
                        <Link href="/" className={styles.backLink}>
                            Return to Homepage
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.logo}>TRUEUP</div>
                    <h1>Client Onboarding</h1>
                    <p>Apply to join our platform and streamline your content tracking experience.</p>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <label>Full Name</label>
                        <div className={styles.inputWrapper}>
                            <User size={18} className={styles.icon} />
                            <input 
                                type="text" 
                                placeholder="John Doe" 
                                required
                                value={formData.full_name}
                                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                disabled={status === 'SUBMITTING'}
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Business Email</label>
                        <div className={styles.inputWrapper}>
                            <Mail size={18} className={styles.icon} />
                            <input 
                                type="email" 
                                placeholder="john@example.com" 
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                disabled={status === 'SUBMITTING'}
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Phone Number (Optional)</label>
                        <div className={styles.inputWrapper}>
                            <Phone size={18} className={styles.icon} />
                            <input 
                                type="tel" 
                                placeholder="+1 (555) 000-0000" 
                                value={formData.phone_number}
                                onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                                disabled={status === 'SUBMITTING'}
                            />
                        </div>
                    </div>

                    {status === 'ERROR' && (
                        <p style={{ color: '#ef4444', fontSize: '0.875rem', textAlign: 'center' }}>
                            {errorMsg}
                        </p>
                    )}

                    <button 
                        type="submit" 
                        className={styles.submitBtn}
                        disabled={status === 'SUBMITTING' || !formData.full_name || !formData.email}
                    >
                        {status === 'SUBMITTING' ? (
                            <>
                                <Loader2 className={styles.spin} size={20} />
                                Submitting...
                            </>
                        ) : (
                            <>
                                Submit Application
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
