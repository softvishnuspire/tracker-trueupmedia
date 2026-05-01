'use client';

import React, { useState, useEffect } from 'react';
import { 
    Settings2, 
    CalendarClock, 
    Save, 
    Info,
    CheckCircle2,
    AlertCircle,
    RotateCcw
} from 'lucide-react';
import { settingsApi } from '@/lib/api';
import '../admin.css';

interface SystemSetting {
    key: string;
    value: any;
    updated_at: string;
}

export default function TogglesPage() {
    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form state
    const [showCompanyCalendar, setShowCompanyCalendar] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await settingsApi.getSettings();
            setSettings(res.data);
            
            // Map settings to form state
            const calendarSetting = res.data.find(s => s.key === 'show_company_calendar');
            if (calendarSetting) {
                setShowCompanyCalendar(calendarSetting.value === true || calendarSetting.value === 'true');
            }
        } catch (err) {
            console.error('Error fetching settings:', err);
            setMessage({ type: 'error', text: 'Failed to load system settings.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await settingsApi.updateSetting('show_company_calendar', showCompanyCalendar);
            setMessage({ type: 'success', text: 'System settings updated successfully! Please refresh to see changes in the sidebar.' });
            
            // Re-fetch to sync
            await fetchSettings();
        } catch (err) {
            console.error('Error saving setting:', err);
            setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="admin-page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div className="loading-spinner">Loading System Toggles...</div>
            </div>
        );
    }

    return (
        <div className="admin-page-content">
            <header className="page-header" style={{ marginBottom: '32px' }}>
                <div className="header-content">
                    <div className="header-info">
                        <h1 className="page-title">System Toggles</h1>
                        <p className="page-subtitle">Configure global application behavior and feature visibility.</p>
                    </div>
                    <div className="header-actions">
                        <button 
                            className="btn-primary" 
                            onClick={handleSave} 
                            disabled={saving}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            {saving ? (
                                <>
                                    <RotateCcw size={18} className="animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    <span>Save Configuration</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {message && (
                <div className={`message-banner ${message.type}`} style={{ 
                    marginBottom: '24px', 
                    padding: '16px', 
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                    color: message.type === 'success' ? '#22c55e' : '#ef4444'
                }}>
                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span style={{ fontWeight: 500 }}>{message.text}</span>
                </div>
            )}

            <div className="settings-grid" style={{ display: 'grid', gap: '24px' }}>
                <section className="settings-card" style={{ 
                    background: 'var(--bg-elevated)', 
                    borderRadius: '16px', 
                    border: '1px solid var(--border)',
                    overflow: 'hidden'
                }}>
                    <div className="card-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent)', borderRadius: '8px' }}>
                            <Settings2 size={20} />
                        </div>
                        <h2 className="card-title" style={{ margin: 0, fontSize: '18px' }}>Visibility Settings</h2>
                    </div>
                    
                    <div className="card-body" style={{ padding: '24px' }}>
                        <div className="setting-row" style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '16px',
                            background: 'var(--bg-primary)',
                            borderRadius: '12px',
                            border: '1px solid var(--border)'
                        }}>
                            <div className="setting-info" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ color: 'var(--text-muted)' }}>
                                    <CalendarClock size={24} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Company Calendar</h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                                        Toggle the visibility of the global Company Calendar for all roles (Admin, GM, TL, Posting).
                                    </p>
                                </div>
                            </div>
                            <div className="setting-action">
                                <label className="switch">
                                    <input 
                                        type="checkbox" 
                                        checked={showCompanyCalendar} 
                                        onChange={(e) => setShowCompanyCalendar(e.target.checked)}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                        </div>

                        <div className="setting-notice" style={{ 
                            marginTop: '24px', 
                            padding: '16px', 
                            background: 'var(--bg-secondary)', 
                            borderRadius: '12px',
                            display: 'flex',
                            gap: '12px',
                            border: '1px solid var(--border)'
                        }}>
                            <Info size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                <strong>Pro Tip:</strong> Turning off the Company Calendar is useful when performing system maintenance or if you want to restrict role views to only their assigned client calendars for a period of time. 
                                <br />
                                <span style={{ color: 'var(--accent)', fontWeight: 500 }}>Note: Admins will still be able to manage this setting from here.</span>
                            </p>
                        </div>
                    </div>
                </section>
            </div>

            <style jsx>{`
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 52px;
                    height: 28px;
                }
                .switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: var(--border);
                    transition: .4s;
                    border: 1px solid var(--border);
                }
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 20px;
                    width: 20px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .4s;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                input:checked + .slider {
                    background-color: var(--accent);
                    border-color: var(--accent);
                }
                input:focus + .slider {
                    box-shadow: 0 0 1px var(--accent);
                }
                input:checked + .slider:before {
                    transform: translateX(24px);
                }
                .slider.round {
                    border-radius: 34px;
                }
                .slider.round:before {
                    border-radius: 50%;
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
