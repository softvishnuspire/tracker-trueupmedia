'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Send, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { notificationApi, type NotificationItem, type NotificationTarget } from '@/lib/api';

const cardStyle: React.CSSProperties = {
    position: 'absolute',
    top: '44px',
    right: 0,
    width: '360px',
    maxHeight: '460px',
    overflow: 'auto',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
    zIndex: 2000,
    padding: '12px'
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
            console.error('Failed to load notifications', error);
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
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    position: 'relative',
                }}
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        minWidth: 20,
                        height: 20,
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        background: '#ef4444',
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        padding: '0 4px',
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setTab('inbox')} style={{ fontWeight: tab === 'inbox' ? 700 : 500 }}>Inbox</button>
                            {canSend && <button onClick={() => setTab('send')} style={{ fontWeight: tab === 'send' ? 700 : 500 }}>Send</button>}
                        </div>
                        <button onClick={() => setOpen(false)}><X size={14} /></button>
                    </div>

                    {tab === 'inbox' && (
                        <div style={{ display: 'grid', gap: 8 }}>
                            {notifications.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No notifications yet.</p>
                            ) : notifications.map((item) => (
                                <div key={item.id} style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 10, background: item.is_read ? 'transparent' : 'rgba(59,130,246,0.08)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                                        <strong>{item.notifications.title}</strong>
                                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.notifications.type}</span>
                                    </div>
                                    <p style={{ margin: '6px 0', fontSize: 13 }}>{item.notifications.message}</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <small style={{ color: 'var(--text-secondary)' }}>{new Date(item.notifications.created_at).toLocaleString()}</small>
                                        {!item.is_read && (
                                            <button onClick={() => markAsRead(item.notification_id)} style={{ fontSize: 12 }}>Mark as read</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === 'send' && canSend && (
                        <div style={{ display: 'grid', gap: 8 }}>
                            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
                            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message" rows={4} />
                            <select value={type} onChange={(e) => setType(e.target.value as 'INFO' | 'WARNING' | 'URGENT')}>
                                <option value="INFO">INFO</option>
                                <option value="WARNING">WARNING</option>
                                <option value="URGENT">URGENT</option>
                            </select>
                            <select
                                value={`${targetType}::${targetValue}`}
                                onChange={(e) => {
                                    const [nextType, nextValue] = e.target.value.split('::');
                                    setTargetType(nextType as NotificationTarget['type']);
                                    setTargetValue(nextValue || '');
                                }}
                            >
                                {targetOptions.map((option) => (
                                    <option key={`${option.type}-${option.value}`} value={`${option.type}::${option.value}`}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <button onClick={onSend} disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <Send size={14} /> {loading ? 'Sending...' : 'Send Notification'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
