'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Send, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { notificationApi, type NotificationItem, type NotificationTarget } from '@/lib/api';

const cardStyle: React.CSSProperties = {
    position: 'absolute',
    top: '52px',
    right: 0,
    width: '380px',
    maxHeight: '520px',
    overflow: 'auto',
    background: 'rgba(12, 18, 32, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
    zIndex: 2100,
    padding: '20px',
    animation: 'slideInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
};

type SenderRole = 'ADMIN' | 'GM' | 'OTHER';

const normalizeRole = (role?: string | null) => (role || '').trim().toUpperCase().replace(/[_\s]+/g, ' ');

export default function NotificationBell() {
    const supabase = createClient();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [tab, setTab] = useState<'inbox' | 'send'>('inbox');
    const [senderRole, setSenderRole] = useState<SenderRole>('OTHER');
    const [loading, setLoading] = useState(false);

    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'INFO' | 'WARNING' | 'URGENT'>('INFO');
    const [targetType, setTargetType] = useState<NotificationTarget['type']>('ALL');
    const [targetValue, setTargetValue] = useState('');

    const canSend = senderRole === 'ADMIN' || senderRole === 'GM';

    const targetOptions = useMemo(() => {
        if (senderRole === 'ADMIN') {
            return [
                { label: 'All Users', type: 'ALL' as const, value: '' },
                { label: 'Team Leads (all)', type: 'ROLE' as const, value: 'TEAM LEAD' },
                { label: 'Posting Team', type: 'ROLE' as const, value: 'POSTING TEAM' },
                { label: 'General Manager', type: 'ROLE' as const, value: 'GENERAL MANAGER' },
                { label: 'Admin', type: 'ROLE' as const, value: 'ADMIN' },
                { label: 'TL1 only', type: 'ROLE_IDENTIFIER' as const, value: 'TL1' },
                { label: 'TL2 only', type: 'ROLE_IDENTIFIER' as const, value: 'TL2' },
            ];
        }
        if (senderRole === 'GM') {
            return [
                { label: 'Team Leads (all)', type: 'ROLE' as const, value: 'TEAM LEAD' },
                { label: 'TL1 only', type: 'ROLE_IDENTIFIER' as const, value: 'TL1' },
                { label: 'TL2 only', type: 'ROLE_IDENTIFIER' as const, value: 'TL2' },
                { label: 'Posting Team', type: 'ROLE' as const, value: 'POSTING TEAM' },
            ];
        }
        return [];
    }, [senderRole]);

    const load = useCallback(async () => {
        try {
            const [{ data: list }, { data: unread }] = await Promise.all([
                notificationApi.getNotifications(),
                notificationApi.getUnreadCount(),
            ]);
            setNotifications(list || []);
            setUnreadCount(unread?.count || 0);
        } catch (error) {
            // console.error('Failed to load notifications', error);
        }
    }, []);

    useEffect(() => {
        load();
        const timer = setInterval(load, 30000);
        return () => clearInterval(timer);
    }, [load]);

    useEffect(() => {
        const loadRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('users')
                .select('role, role_identifier')
                .eq('user_id', user.id)
                .single();

            const role = normalizeRole(profile?.role);
            const roleIdentifier = normalizeRole(profile?.role_identifier);
            if (role === 'ADMIN') setSenderRole('ADMIN');
            else if (role === 'GENERAL MANAGER' || role === 'GM' || roleIdentifier === 'GM') setSenderRole('GM');
            else setSenderRole('OTHER');
        };

        loadRole();
    }, [supabase]);

    useEffect(() => {
        if (canSend && targetOptions.length) {
            setTargetType(targetOptions[0].type);
            setTargetValue(targetOptions[0].value);
        }
    }, [canSend, targetOptions]);

    const markAsRead = async (notificationId: string) => {
        try {
            await notificationApi.markAsRead(notificationId);
            setNotifications((prev) => prev.map((n) => (
                n.notification_id === notificationId
                    ? { ...n, is_read: true, read_at: new Date().toISOString() }
                    : n
            )));
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read', error);
        }
    };

    const onSend = async () => {
        if (!title.trim() || !message.trim()) {
            alert('Title and message are required.');
            return;
        }

        try {
            setLoading(true);
            await notificationApi.sendNotification({
                title: title.trim(),
                message: message.trim(),
                type,
                target: {
                    type: targetType,
                    value: targetType === 'ALL' ? undefined : targetValue,
                },
            });
            setTitle('');
            setMessage('');
            setType('INFO');
            setTab('inbox');
            await load();
        } catch (error: unknown) {
            const errorMessage = typeof error === 'object'
                && error !== null
                && 'response' in error
                && typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
                ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
                : null;
            alert(errorMessage || 'Failed to send notification');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen((v) => !v)}
                aria-label="Notifications"
                className="nav-icon-btn"
                style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: open ? '0 0 15px var(--accent-glow)' : 'none',
                    borderColor: open ? 'var(--accent)' : 'var(--border)'
                }}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        minWidth: 18,
                        height: 18,
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 800,
                        background: 'var(--danger)',
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        padding: '0 4px',
                        border: '2px solid var(--bg-surface)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div style={cardStyle} className="notification-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{ display: 'flex', background: 'var(--bg-elevated)', padding: '4px', borderRadius: '10px', gap: '4px' }}>
                            <button 
                                onClick={() => setTab('inbox')} 
                                style={{ 
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    background: tab === 'inbox' ? 'var(--bg-surface)' : 'transparent',
                                    color: tab === 'inbox' ? 'var(--accent)' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Inbox
                            </button>
                            {canSend && (
                                <button 
                                    onClick={() => setTab('send')} 
                                    style={{ 
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        background: tab === 'send' ? 'var(--bg-surface)' : 'transparent',
                                        color: tab === 'send' ? 'var(--accent)' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Send
                                </button>
                            )}
                        </div>
                        <button 
                            onClick={() => setOpen(false)}
                            style={{ background: 'var(--bg-elevated)', border: 'none', color: 'var(--text-muted)', borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {tab === 'inbox' && (
                        <div style={{ display: 'grid', gap: 12 }}>
                            {notifications.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                                    <Bell size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                                    <p style={{ fontSize: '13px', fontWeight: 600 }}>No notifications yet.</p>
                                </div>
                            ) : notifications.map((item) => (
                                <div 
                                    key={item.id} 
                                    style={{ 
                                        borderRadius: 14, 
                                        padding: 16, 
                                        background: item.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(99,102,241,0.08)',
                                        border: '1px solid',
                                        borderColor: item.is_read ? 'var(--border)' : 'rgba(99,102,241,0.2)',
                                        position: 'relative'
                                    }}
                                >
                                    {!item.is_read && (
                                        <div style={{ position: 'absolute', top: 16, right: 16, width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }}></div>
                                    )}
                                    <div style={{ marginBottom: 4 }}>
                                        <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {item.notifications.type}
                                        </span>
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{item.notifications.title}</h4>
                                    <p style={{ margin: '8px 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.notifications.message}</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                                        <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>{new Date(item.notifications.created_at).toLocaleString()}</small>
                                        {!item.is_read && (
                                            <button 
                                                onClick={() => markAsRead(item.notification_id)} 
                                                style={{ 
                                                    fontSize: 11, 
                                                    fontWeight: 700, 
                                                    color: 'var(--accent)', 
                                                    background: 'transparent', 
                                                    border: 'none', 
                                                    cursor: 'pointer',
                                                    padding: '4px 0'
                                                }}
                                            >
                                                Mark as read
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === 'send' && canSend && (
                        <div style={{ display: 'grid', gap: 16 }}>
                            <div className="form-group">
                                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Notification Title</label>
                                <input 
                                    value={title} 
                                    onChange={(e) => setTitle(e.target.value)} 
                                    placeholder="Enter title..." 
                                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', color: 'var(--text-primary)', width: '100%', outline: 'none' }}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Message Content</label>
                                <textarea 
                                    value={message} 
                                    onChange={(e) => setMessage(e.target.value)} 
                                    placeholder="Enter message..." 
                                    rows={4} 
                                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', color: 'var(--text-primary)', width: '100%', outline: 'none', resize: 'none' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="form-group">
                                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Type</label>
                                    <select 
                                        value={type} 
                                        onChange={(e) => setType(e.target.value as 'INFO' | 'WARNING' | 'URGENT')}
                                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px', color: 'var(--text-primary)', width: '100%', outline: 'none' }}
                                    >
                                        <option value="INFO">INFO</option>
                                        <option value="WARNING">WARNING</option>
                                        <option value="URGENT">URGENT</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Target Audience</label>
                                    <select
                                        value={`${targetType}::${targetValue}`}
                                        onChange={(e) => {
                                            const [nextType, nextValue] = e.target.value.split('::');
                                            setTargetType(nextType as NotificationTarget['type']);
                                            setTargetValue(nextValue || '');
                                        }}
                                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px', color: 'var(--text-primary)', width: '100%', outline: 'none' }}
                                    >
                                        {targetOptions.map((option) => (
                                            <option key={`${option.type}-${option.value}`} value={`${option.type}::${option.value}`}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button 
                                onClick={onSend} 
                                disabled={loading} 
                                style={{ 
                                    background: 'var(--accent)', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '12px', 
                                    padding: '12px', 
                                    fontSize: '14px', 
                                    fontWeight: 700, 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: 8,
                                    marginTop: '8px',
                                    boxShadow: '0 4px 15px var(--accent-glow)'
                                }}
                            >
                                {loading ? 'Sending...' : <><Send size={16} /> Send Notification</>}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
