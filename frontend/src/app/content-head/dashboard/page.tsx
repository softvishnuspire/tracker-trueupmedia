'use client';

import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameDay,
    addMonths,
    subMonths,
    parseISO,
    isSameMonth,
    startOfDay,
    endOfDay
} from 'date-fns';
import { 
    ChevronLeft, ChevronRight, ChevronDown, LayoutDashboard, Globe, Calendar as CalendarIcon, 
    FileText, Video, CheckCircle2, X, LogOut, Filter, Menu, Clock, ShieldAlert, Check, 
    AlertTriangle, ArrowRight, CalendarClock, Undo2, Lock, ListFilter, Play,
    Users, Plus, Search, Mail, User as UserIcon, Trophy, Target, Briefcase, Trash2, TrendingUp, Building2
} from 'lucide-react';
import { gmApi, emergencyApi, settingsApi, adminApi, contentHeadApi } from '@/lib/api';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';
import { getClientAbbreviation, formatIST, getISTDate } from '@/lib/utils';
import './content-head.css';

interface ContentItem {
    id: string;
    title: string;
    description: string;
    content_type: 'Post' | 'Reel' | 'YouTube' | 'Special Poster' | 'Special Day Poster';
    scheduled_datetime: string;
    status: string;
    client_id: string;
    is_emergency?: boolean;
    is_rescheduled?: boolean;
    clients?: { company_name: string; team_lead?: { name: string } };
    assigned_to?: string;
    freelancer_name?: string;
    assigned_employee?: { name: string; role_identifier?: string } | null;
}

export default function ContentHeadDashboard() {
    const [view, setView] = useState<'dashboard' | 'client' | 'master' | 'employees'>('dashboard');
    const [pendingTasks, setPendingTasks] = useState<ContentItem[]>([]);
    const [approvedTasks, setApprovedTasks] = useState<ContentItem[]>([]);
    const [calendarData, setCalendarData] = useState<ContentItem[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>('all');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [activeItem, setActiveItem] = useState<any>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [statusNote, setStatusNote] = useState('');
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [dayTasks, setDayTasks] = useState<ContentItem[]>([]);

    // Writer Management State
    const [writers, setWriters] = useState<any[]>([]);
    const [searchWriterQuery, setSearchWriterQuery] = useState('');
    const [showCreateWriterModal, setShowCreateWriterModal] = useState(false);
    const [writerForm, setWriterForm] = useState({ name: '', email: '', password: '' });
    const [showAssignClientModal, setShowAssignClientModal] = useState(false);
    const [selectedWriterForAssignment, setSelectedWriterForAssignment] = useState<any>(null);
    const [assignClientSearchQuery, setAssignClientSearchQuery] = useState('');
    const [writerProductivity, setWriterProductivity] = useState<any[]>([]);
    const [loadingWriters, setLoadingWriters] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    // Helper to identify tasks that have been approved by the Content Head (i.e. status is CONTENT APPROVED or subsequent)
    const approvedStatuses = [
        'CONTENT APPROVED',
        'SHOOT DONE',
        'EDITING IN PROGRESS',
        'EDITED',
        'DESIGNING IN PROGRESS',
        'DESIGNING COMPLETED',
        'WAITING FOR FINAL APPROVAL',
        'APPROVED',
        'WAITING FOR POSTING',
        'POSTED'
    ];

    const isApprovedByContentHead = (status: string) => {
        return approvedStatuses.includes((status || '').toUpperCase());
    };

    const getClientBatchType = (clientId: string) => {
        if (clientId === 'all') return '1-1';
        const client = clients.find(c => c.id === clientId);
        return client?.batch_type || '1-1';
    };

    const selectedClientData = clients.find(c => c.id === selectedClient);
    const isBiMonthlyView = useMemo(() => {
        return Boolean(selectedClient && selectedClient !== 'all' && selectedClientData?.batch_type === '15-15');
    }, [selectedClient, selectedClientData]);

    const periodStart = useMemo(() => {
        return isBiMonthlyView
            ? (currentMonth.getDate() >= 15
                ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 15)
                : new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 15))
            : startOfMonth(currentMonth);
    }, [currentMonth, isBiMonthlyView]);

    const periodEnd = useMemo(() => {
        return isBiMonthlyView
            ? (currentMonth.getDate() >= 15
                ? new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 14)
                : new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 14))
            : endOfMonth(currentMonth);
    }, [currentMonth, isBiMonthlyView]);

    const getPeriodLabel = useCallback(() => {
        if (isBiMonthlyView) {
            return `${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d, yyyy')}`;
        }
        return format(currentMonth, 'MMMM yyyy');
    }, [currentMonth, isBiMonthlyView, periodStart, periodEnd]);

    const isDayInPeriod = useCallback((date: Date) => {
        if (!isBiMonthlyView) return isSameMonth(date, currentMonth);
        return date >= startOfDay(periodStart) && date <= endOfDay(periodEnd);
    }, [currentMonth, isBiMonthlyView, periodStart, periodEnd]);

    const fetchClients = useCallback(async () => {
        try {
            const res = await gmApi.getClients();
            setClients(res.data || []);
        } catch (err) { console.error('Error fetching clients:', err); }
    }, []);

    const fetchWritersData = useCallback(async () => {
        setLoadingWriters(true);
        try {
            const [writersRes, statsRes] = await Promise.all([
                contentHeadApi.getWriters(),
                adminApi.getTrackingStats()
            ]);
            setWriters(writersRes.data || []);
            
            if (statsRes.data?.employees) {
                const stats = statsRes.data.employees.filter((emp: any) => 
                    (emp.role || '').toUpperCase() === 'WRITER'
                );
                setWriterProductivity(stats);
            }
        } catch (err) {
            console.error('Error fetching writers:', err);
        } finally {
            setLoadingWriters(false);
        }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const currentMonthStr = format(currentMonth, 'yyyy-MM');
            const client = clients.find(c => c.id === selectedClient);
            const is1515 = client?.batch_type === '15-15';

            let items: ContentItem[] = [];

            if (selectedClient === 'all') {
                // Fetch master calendar for global stats / queue
                const res = await gmApi.getMasterCalendar(currentMonthStr);
                items = res.data || [];
            } else if (is1515) {
                // Load adjacent months for 15-15 clients
                const isSecondHalf = currentMonth.getDate() >= 15;
                const startMonth = isSecondHalf ? currentMonth : subMonths(currentMonth, 1);
                const endMonth = isSecondHalf ? addMonths(currentMonth, 1) : currentMonth;

                const [resStart, resEnd] = await Promise.all([
                    gmApi.getMasterCalendar(format(startMonth, 'yyyy-MM'), selectedClient),
                    gmApi.getMasterCalendar(format(endMonth, 'yyyy-MM'), selectedClient)
                ]);
                items = [...(resStart.data || []), ...(resEnd.data || [])];
            } else {
                const res = await gmApi.getMasterCalendar(currentMonthStr, selectedClient);
                items = res.data || [];
            }

            setCalendarData(items);

            // Filter out items for Queue (only showing tasks within the active period window)
            const filteredItems = items.filter(item => isDayInPeriod(parseISO(item.scheduled_datetime)));
            
            // Queue items needing approval (All tasks that are not yet approved by Content Head)
            setPendingTasks(filteredItems.filter(item => !isApprovedByContentHead(item.status)));
            
            // Queue items already approved (CONTENT APPROVED)
            setApprovedTasks(filteredItems.filter(item => (item.status || '').toUpperCase() === 'CONTENT APPROVED'));
        } catch (err) {
            console.error('Error fetching calendar data:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedClient, currentMonth, clients, isDayInPeriod]);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                router.push('/');
                return;
            }
            setUser(session.user);
            
            const { data: profile } = await supabase
                .from('users')
                .select('role, role_identifier')
                .eq('user_id', session.user.id)
                .single();
            
            const role = profile?.role_identifier || profile?.role || session.user.user_metadata?.role;
            const upperRole = role?.toUpperCase();
            setUserRole(upperRole);
            
            const allowedRoles = ['CONTENT HEAD', 'ADMIN', 'GM', 'GENERAL MANAGER'];
            if (upperRole && !allowedRoles.includes(upperRole)) {
                console.warn(`[RoleGuard] Access denied to /content-head/dashboard for role: ${upperRole}`);
                router.push('/');
                return;
            }
        };
        checkUser();
    }, [router, supabase]);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    useEffect(() => {
        fetchData();
    }, [view, selectedClient, currentMonth, fetchData]);

    useEffect(() => {
        if (view === 'employees') {
            fetchWritersData();
        }
    }, [view, fetchWritersData]);

    useEffect(() => {
        const syncStateFromUrl = () => {
            const params = new URLSearchParams(window.location.search);
            const viewParam = params.get('view') || 'dashboard';
            const clientIdParam = params.get('clientId') || 'all';
            const taskIdParam = params.get('taskId') || '';

            if (viewParam !== view) {
                setView(viewParam as any);
            }
            if (clientIdParam !== selectedClient) {
                setSelectedClient(clientIdParam);
            }
            if (taskIdParam) {
                if (activeItem?.item?.id !== taskIdParam) {
                    const fetchAndOpen = async () => {
                        try {
                            const res = await gmApi.getContentDetails(taskIdParam);
                            setActiveItem(res.data);
                            setIsDetailsOpen(true);
                        } catch (err) {
                            console.error('Failed to restore details from URL:', err);
                        }
                    };
                    fetchAndOpen();
                } else if (!isDetailsOpen) {
                    setIsDetailsOpen(true);
                }
            } else {
                if (isDetailsOpen) {
                    setIsDetailsOpen(false);
                }
            }
        };

        if (!loading) {
            syncStateFromUrl();
        }

        window.addEventListener('popstate', syncStateFromUrl);
        return () => {
            window.removeEventListener('popstate', syncStateFromUrl);
        };
    }, [loading, view, selectedClient, activeItem?.item?.id, isDetailsOpen]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const viewParam = params.get('view') || 'dashboard';
        const clientIdParam = params.get('clientId') || 'all';

        if (view !== viewParam || selectedClient !== clientIdParam) {
            const nextParams = new URLSearchParams();
            nextParams.set('view', view);
            if (selectedClient) {
                nextParams.set('clientId', selectedClient);
            }
            const taskIdParam = params.get('taskId');
            if (taskIdParam && isDetailsOpen) {
                nextParams.set('taskId', taskIdParam);
            }
            window.history.pushState(null, '', `?${nextParams.toString()}`);
        }
    }, [view, selectedClient]);

    useEffect(() => {
        if (!isDetailsOpen) {
            const params = new URLSearchParams(window.location.search);
            const viewParam = params.get('view') || 'dashboard';
            const clientIdParam = params.get('clientId') || 'all';
            if (viewParam === view && clientIdParam === selectedClient) {
                if (params.has('taskId')) {
                    params.delete('taskId');
                    const newSearch = params.toString();
                    window.history.replaceState(null, '', newSearch ? `?${newSearch}` : window.location.pathname);
                }
            }
        }
    }, [isDetailsOpen, view, selectedClient]);

    const handleApproveContent = async (id: string) => {
        setActionId(id);
        try {
            const actorId = user?.id;
            await gmApi.updateStatus(id, 'CONTENT APPROVED', statusNote.trim() || undefined, actorId);
            setToast('Content approved successfully!');
            setStatusNote('');
            setTimeout(() => setToast(null), 3000);
            
            await fetchData();
            
            if (activeItem?.item?.id === id) {
                const res = await gmApi.getContentDetails(id);
                setActiveItem(res.data);
            }
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to approve content');
        } finally { setActionId(null); }
    };

    const handleUndoApproval = async (id: string) => {
        setActionId(id);
        try {
            await gmApi.undoStatus(id);
            setToast('Approval undone, task status reverted.');
            setTimeout(() => setToast(null), 3000);
            
            await fetchData();

            if (activeItem?.item?.id === id) {
                const res = await gmApi.getContentDetails(id);
                setActiveItem(res.data);
            }
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to revert approval');
        } finally { setActionId(null); }
    };

    const handleItemClick = async (item: ContentItem) => {
        try {
            const day = parseISO(item.scheduled_datetime);
            const sourceList = calendarData.length > 0 ? calendarData : [];
            const tasksOnDay = sourceList.filter(i => isSameDay(parseISO(i.scheduled_datetime), day));
            
            if (!tasksOnDay.some(t => t.id === item.id)) {
                tasksOnDay.push(item);
            }

            // Sort them by time
            tasksOnDay.sort((a, b) => new Date(a.scheduled_datetime).getTime() - new Date(b.scheduled_datetime).getTime());
            setDayTasks(tasksOnDay);

            const res = await gmApi.getContentDetails(item.id);
            setActiveItem(res.data);
            setIsDetailsOpen(true);

            const params = new URLSearchParams(window.location.search);
            params.set('view', view);
            params.set('taskId', item.id);
            if (selectedClient) {
                params.set('clientId', selectedClient);
            }
            window.history.replaceState(null, '', `?${params.toString()}`);
        } catch (err) { console.error(err); }
    };

    const navigateToTask = async (direction: 'next' | 'prev') => {
        if (!activeItem || dayTasks.length <= 1) return;
        
        const currentIndex = dayTasks.findIndex(t => t.id === activeItem.item.id);
        let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        
        if (nextIndex < 0) nextIndex = dayTasks.length - 1;
        if (nextIndex >= dayTasks.length) nextIndex = 0;
        
        const nextTask = dayTasks[nextIndex];
        try {
            const res = await gmApi.getContentDetails(nextTask.id);
            setActiveItem(res.data);
        } catch (err) { console.error(err); }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const handleCreateWriter = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await contentHeadApi.createWriter(writerForm);
            setToast('Content Writer created successfully!');
            setWriterForm({ name: '', email: '', password: '' });
            setShowCreateWriterModal(false);
            await fetchWritersData();
            setTimeout(() => setToast(null), 3000);
        } catch (err: any) {
            alert(err.response?.data?.error || err.message || 'Failed to create writer');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignClient = async (clientId: string, writerId: string) => {
        setLoading(true);
        try {
            await contentHeadApi.assignWriterToClient(clientId, writerId, null);
            setToast('Client assigned to writer successfully!');
            setShowAssignClientModal(false);
            setSelectedWriterForAssignment(null);
            await Promise.all([fetchClients(), fetchWritersData()]);
            setTimeout(() => setToast(null), 3000);
        } catch (err: any) {
            alert(err.response?.data?.error || err.message || 'Failed to assign client');
        } finally {
            setLoading(false);
        }
    };

    const handleUnassignClient = async (clientId: string, writerId: string) => {
        if (!confirm('Are you sure you want to unassign this client? Tasks currently in the writing phase will also be unassigned.')) {
            return;
        }
        setLoading(true);
        try {
            await contentHeadApi.assignWriterToClient(clientId, null, writerId);
            setToast('Client unassigned from writer.');
            await Promise.all([fetchClients(), fetchWritersData()]);
            setTimeout(() => setToast(null), 3000);
        } catch (err: any) {
            alert(err.response?.data?.error || err.message || 'Failed to unassign client');
        } finally {
            setLoading(false);
        }
    };

    const getWriterStats = (writerId: string) => {
        return writerProductivity.find(p => p.id === writerId) || {
            assignedTasks: 0,
            completedTasks: 0,
            completionRate: 0,
            monthlyTotal: 0,
            monthlyCompleted: 0,
            monthlyRate: 0,
            tasks: []
        };
    };

    const handleDeleteWriter = async (writerId: string, name: string) => {
        if (!confirm(`Are you sure you want to delete Content Writer "${name}"? This action cannot be undone.`)) {
            return;
        }
        setLoading(true);
        try {
            await contentHeadApi.deleteWriter(writerId);
            setToast('Content Writer deleted successfully.');
            await fetchWritersData();
            setTimeout(() => setToast(null), 3000);
        } catch (err: any) {
            alert(err.response?.data?.error || err.message || 'Failed to delete writer');
        } finally {
            setLoading(false);
        }
    };

    const getDays = () => {
        const isBiMonthly = selectedClient !== 'all' && getClientBatchType(selectedClient) === '15-15';
        if (!isBiMonthly) {
            return eachDayOfInterval({
                start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
                end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
            });
        }
        
        return eachDayOfInterval({
            start: startOfWeek(periodStart, { weekStartsOn: 1 }),
            end: endOfWeek(periodEnd, { weekStartsOn: 1 })
        });
    };

    const days = getDays();

    // Statistics aggregates matching standard 1-1 month or 15-15 bi-monthly bounds
    const stats = calendarData.reduce(
        (acc, item) => {
            const d = parseISO(item.scheduled_datetime);
            if (!isDayInPeriod(d)) return acc;

            const type = (item.content_type || '').toUpperCase();
            const status = (item.status || '').toUpperCase();
            const isApproved = isApprovedByContentHead(status);

            // Reels Count
            if (type === 'REEL') {
                acc.reelsTotal += 1;
                if (isApproved) acc.reelsApproved += 1;
            }

            // Posts Count (Includes Special Posters)
            if (type === 'POST' || type === 'SPECIAL POSTER' || type === 'SPECIAL DAY POSTER') {
                acc.postsTotal += 1;
                if (isApproved) acc.postsApproved += 1;
            }

            return acc;
        },
        { reelsTotal: 0, reelsApproved: 0, postsTotal: 0, postsApproved: 0 }
    );

    const reelsCountStr = `${stats.reelsApproved}/${stats.reelsTotal}`;
    const postsCountStr = `${stats.postsApproved}/${stats.postsTotal}`;
    const pipelineCountStr = `${stats.reelsApproved + stats.postsApproved}/${stats.reelsTotal + stats.postsTotal}`;

    const reelsPercentage = stats.reelsTotal > 0 ? Math.round((stats.reelsApproved / stats.reelsTotal) * 100) : 0;
    const postsPercentage = stats.postsTotal > 0 ? Math.round((stats.postsApproved / stats.postsTotal) * 100) : 0;
    const pipelinePercentage = (stats.reelsTotal + stats.postsTotal) > 0 
        ? Math.round(((stats.reelsApproved + stats.postsApproved) / (stats.reelsTotal + stats.postsTotal)) * 100) 
        : 0;

    // ─── Per-Client Approval Stats ───
    const clientStats = useMemo(() => {
        const map: Record<string, {
            clientId: string;
            clientName: string;
            reelsTotal: number;
            reelsApproved: number;
            postsTotal: number;
            postsApproved: number;
            total: number;
            approved: number;
        }> = {};

        calendarData.forEach(item => {
            const d = parseISO(item.scheduled_datetime);
            if (!isDayInPeriod(d)) return;
            if (!item.client_id) return; // Skip freelancer items with no client

            const clientId = item.client_id;
            const clientName = item.clients?.company_name || 'Unknown Client';

            if (!map[clientId]) {
                map[clientId] = {
                    clientId,
                    clientName,
                    reelsTotal: 0,
                    reelsApproved: 0,
                    postsTotal: 0,
                    postsApproved: 0,
                    total: 0,
                    approved: 0,
                };
            }

            const entry = map[clientId];
            const type = (item.content_type || '').toUpperCase();
            const statusUpper = (item.status || '').toUpperCase();
            const approved = isApprovedByContentHead(statusUpper);

            entry.total += 1;
            if (approved) entry.approved += 1;

            if (type === 'REEL') {
                entry.reelsTotal += 1;
                if (approved) entry.reelsApproved += 1;
            }

            if (type === 'POST' || type === 'SPECIAL POSTER' || type === 'SPECIAL DAY POSTER') {
                entry.postsTotal += 1;
                if (approved) entry.postsApproved += 1;
            }
        });

        return Object.values(map).sort((a, b) => {
            // Sort by completion % ascending (least done first), then alphabetically
            const pctA = a.total > 0 ? a.approved / a.total : 1;
            const pctB = b.total > 0 ? b.approved / b.total : 1;
            if (pctA !== pctB) return pctA - pctB;
            return a.clientName.localeCompare(b.clientName);
        });
    }, [calendarData, isDayInPeriod]);

    const [isClientStatsExpanded, setIsClientStatsExpanded] = useState(true);

    return (
        <div className="dashboard-container">
            <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 2100 }}>
                <NotificationBell />
            </div>

            {isSidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
            )}

            {/* Sidebar Navigation */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="logo-container style-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '24px 24px 0 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src="/logo.png" alt="TrueUp Media" style={{ height: '28px', width: 'auto' }} />
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Approval</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="sidebar-close" style={{ display: 'none', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 sidebar-nav">
                    <p className="sidebar-label">Navigation</p>
                    <div onClick={() => setView('dashboard')} className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}>
                        <LayoutDashboard size={20} />
                        <span>Approval Queue</span>
                    </div>
                    <div onClick={() => setView('client')} className={`nav-item ${view === 'client' ? 'active' : ''}`}>
                        <CalendarIcon size={20} />
                        <span>Client Calendar</span>
                    </div>
                    <div onClick={() => setView('master')} className={`nav-item ${view === 'master' ? 'active' : ''}`}>
                        <Globe size={20} />
                        <span>Master Calendar</span>
                    </div>
                    <div onClick={() => setView('employees')} className={`nav-item ${view === 'employees' ? 'active' : ''}`}>
                        <Users size={20} />
                        <span>Writer Management</span>
                    </div>

                    {view === 'client' && (
                        <>
                            <div className="sidebar-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Clients</span>
                                <span style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '6px', color: '#0d9488', border: '1px solid var(--border)' }}>{clients.length}</span>
                            </div>
                            <div className="client-list">
                                {clients
                                    .sort((a, b) => (a.company_name || '').localeCompare(b.company_name || ''))
                                    .map(c => (
                                        <div key={c.id} onClick={() => setSelectedClient(c.id)} className={`client-item ${selectedClient === c.id ? 'selected' : ''}`}>
                                            <div className="client-avatar">{c.company_name?.charAt(0).toUpperCase() || '?'}</div>
                                            <span>{c.company_name}</span>
                                        </div>
                                    ))}
                            </div>
                        </>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span className="sidebar-label" style={{ margin: 0, padding: 0 }}>Appearance</span>
                        <ThemeToggle style={{ width: '28px', height: '28px', borderRadius: '8px' }} />
                    </div>
                    <div className="user-info-box">
                        <div className="user-avatar">CH</div>
                        <div style={{ minWidth: 0 }}>
                            <p className="user-name">Content Head</p>
                            <p className="user-role">TrueUp Media</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="logout-btn">
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Area */}
            <main className="main-content">
                <div className="mobile-header-top">
                    <div className="menu-toggle" onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></div>
                    <img src="/logo.png" alt="TrueUp Media" style={{ height: '24px', width: 'auto' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><NotificationBell /></div>
                </div>

                <header className="page-header">
                    <div className="header-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div className="header-info">
                            <h1 className="page-title">
                                {view === 'dashboard' && "Approval Queue"}
                                {view === 'client' && 'Client Calendar'}
                                {view === 'master' && 'Master Calendar'}
                                {view === 'employees' && 'Writer Management'}
                            </h1>
                            <p className="page-subtitle">
                                {view === 'dashboard' && `${format(new Date(), 'EEEE, MMMM d')} — Review copy & scripts`}
                                {view === 'client' && 'Review status timeline for individual clients'}
                                {view === 'master' && 'Overview of total pipeline schedule'}
                                {view === 'employees' && 'Create content writer accounts, assign clients, and track daily/monthly task progress'}
                            </p>
                        </div>

                        <div className="header-controls">
                            {view === 'client' && (
                                <div className="client-dropdown-wrapper">
                                    <select className="client-dropdown" value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
                                        <option value="all" disabled={selectedClient !== 'all'}>Select a client</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                                    </select>
                                    <ChevronDown size={16} className="dropdown-chevron" />
                                </div>
                            )}

                            {view === 'master' && (
                                <div className="master-filters-container" style={{ display: 'flex', gap: '10px' }}>
                                    <div className="client-dropdown-wrapper">
                                        <select className="client-dropdown" value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
                                            <option value="all">All Clients</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                                        </select>
                                        <ChevronDown size={14} className="dropdown-chevron" />
                                    </div>
                                </div>
                            )}

                            {(view !== 'dashboard' && view !== 'employees') && (
                                <div className="month-nav">
                                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="month-btn"><ChevronLeft size={20} /></button>
                                    <span className="month-label">{getPeriodLabel()}</span>
                                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="month-btn"><ChevronRight size={20} /></button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Dashboard / Approval Queue View */}
                {view === 'dashboard' && (
                    <div className="dashboard-view-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Statistics cards requested: monthly pipeline, reels, posts */}
                        <div className="posting-stats-grid">
                            {/* Monthly Pipeline Card */}
                            <div className="progress-meter-card">
                                <h3 className="stat-label">Monthly Pipeline</h3>
                                <div className="progress-values">
                                    <span className="current">{stats.reelsApproved + stats.postsApproved}</span>
                                    <span className="separator">/</span>
                                    <span className="total">{stats.reelsTotal + stats.postsTotal}</span>
                                    <span className="unit">Content Approved</span>
                                </div>
                                <div className="progress-bar-container">
                                    <div className="progress-bar-fill" style={{ width: `${pipelinePercentage}%` }}></div>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>
                                    {pipelinePercentage}% Completed
                                </div>
                            </div>

                            {/* Reels Card */}
                            <div className="progress-meter-card reels">
                                <h3 className="stat-label" style={{ color: '#a855f7' }}>Reels Progress</h3>
                                <div className="progress-values">
                                    <span className="current" style={{ color: '#a855f7' }}>{stats.reelsApproved}</span>
                                    <span className="separator">/</span>
                                    <span className="total">{stats.reelsTotal}</span>
                                    <span className="unit">Reels Approved</span>
                                </div>
                                <div className="progress-bar-container">
                                    <div className="progress-bar-fill reels-fill" style={{ width: `${reelsPercentage}%` }}></div>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>
                                    {reelsPercentage}% Completed
                                </div>
                            </div>

                            {/* Posts Card */}
                            <div className="progress-meter-card posts">
                                <h3 className="stat-label" style={{ color: '#ec4899' }}>Posts Progress</h3>
                                <div className="progress-values">
                                    <span className="current" style={{ color: '#ec4899' }}>{stats.postsApproved}</span>
                                    <span className="separator">/</span>
                                    <span className="total">{stats.postsTotal}</span>
                                    <span className="unit">Posts Approved</span>
                                </div>
                                <div className="progress-bar-container">
                                    <div className="progress-bar-fill posts-fill" style={{ width: `${postsPercentage}%` }}></div>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>
                                    {postsPercentage}% Completed
                                </div>
                            </div>
                        </div>

                        {/* ─── Client-wise Approval Progress ─── */}
                        <div className="emergency-panel client-stats-panel">
                            <div className="emergency-panel-header" style={{ cursor: 'pointer' }} onClick={() => setIsClientStatsExpanded(!isClientStatsExpanded)}>
                                <Building2 size={24} color="#6366f1" />
                                <h2 className="emergency-panel-title">Client-wise Approval Progress</h2>
                                <span className="card-badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', borderColor: 'rgba(99, 102, 241, 0.2)' }}>
                                    {clientStats.length} Clients
                                </span>
                                <ChevronDown
                                    size={18}
                                    style={{
                                        marginLeft: 'auto',
                                        color: 'var(--text-muted)',
                                        transition: 'transform 0.25s ease',
                                        transform: isClientStatsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                    }}
                                />
                            </div>

                            {isClientStatsExpanded && (
                                loading ? (
                                    <div className="posting-queue">
                                        <Skeleton className="h-14 w-full" />
                                        <Skeleton className="h-14 w-full" />
                                    </div>
                                ) : clientStats.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', padding: '12px' }}>
                                        No client data available for this period.
                                    </p>
                                ) : (
                                    <div className="client-stats-grid">
                                        {clientStats.map(cs => {
                                            const pct = cs.total > 0 ? Math.round((cs.approved / cs.total) * 100) : 0;
                                            const isComplete = pct === 100;
                                            const reelPct = cs.reelsTotal > 0 ? Math.round((cs.reelsApproved / cs.reelsTotal) * 100) : -1;
                                            const postPct = cs.postsTotal > 0 ? Math.round((cs.postsApproved / cs.postsTotal) * 100) : -1;

                                            return (
                                                <div key={cs.clientId} className={`client-stat-card ${isComplete ? 'complete' : ''}`}>
                                                    <div className="client-stat-header">
                                                        <div className="client-stat-avatar">
                                                            {cs.clientName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="client-stat-name-block">
                                                            <span className="client-stat-name">{cs.clientName}</span>
                                                            <span className="client-stat-overall">
                                                                {cs.approved}/{cs.total} Approved
                                                                {isComplete && <CheckCircle2 size={14} style={{ color: 'var(--success)', marginLeft: '4px' }} />}
                                                            </span>
                                                        </div>
                                                        <span className={`client-stat-pct ${isComplete ? 'done' : pct >= 50 ? 'mid' : 'low'}`}>
                                                            {pct}%
                                                        </span>
                                                    </div>

                                                    <div className="client-stat-bar-wrapper">
                                                        <div className="client-stat-bar">
                                                            <div className="client-stat-bar-fill" style={{ width: `${pct}%` }} />
                                                        </div>
                                                    </div>

                                                    <div className="client-stat-breakdown">
                                                        {cs.reelsTotal > 0 && (
                                                            <div className="client-stat-type">
                                                                <Video size={12} />
                                                                <span>Reels</span>
                                                                <span className="client-stat-type-count">{cs.reelsApproved}/{cs.reelsTotal}</span>
                                                                <div className="client-stat-mini-bar">
                                                                    <div className="client-stat-mini-fill reels" style={{ width: `${reelPct}%` }} />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {cs.postsTotal > 0 && (
                                                            <div className="client-stat-type">
                                                                <FileText size={12} />
                                                                <span>Posts</span>
                                                                <span className="client-stat-type-count">{cs.postsApproved}/{cs.postsTotal}</span>
                                                                <div className="client-stat-mini-bar">
                                                                    <div className="client-stat-mini-fill posts" style={{ width: `${postPct}%` }} />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            )}
                        </div>

                        {/* WAITING FOR APPROVAL - Action Required List */}
                        <div className="emergency-panel" style={{ borderColor: 'var(--warning)' }}>
                            <div className="emergency-panel-header">
                                <Clock size={24} color="var(--warning)" />
                                <h2 className="emergency-panel-title">Pending Approval (Action Required)</h2>
                                <span className="card-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
                                    {pendingTasks.length} Pending
                                </span>
                            </div>
                            
                            {loading ? (
                                <div className="posting-queue">
                                    <Skeleton className="h-14 w-full" />
                                </div>
                            ) : pendingTasks.length === 0 ? (
                                <div className="posting-empty-state">
                                    <div className="empty-icon"><CheckCircle2 size={36} style={{ color: 'var(--success)' }} /></div>
                                    <h3>Nothing Pending!</h3>
                                    <p>All client copy and scripts scheduled in this period have been approved.</p>
                                </div>
                            ) : (
                                <div className="posting-queue">
                                    {pendingTasks.map(item => (
                                        <div key={item.id} className="queue-item" style={{ borderLeft: '4px solid var(--warning)' }}>
                                            <div className="queue-item-left" onClick={() => handleItemClick(item)}>
                                                <div className="queue-time-badge">
                                                    <span className="time-text">{format(parseISO(item.scheduled_datetime), 'dd')}</span>
                                                    <span className="ampm-text">{format(parseISO(item.scheduled_datetime), 'MMM')}</span>
                                                </div>
                                                <div className="queue-item-info">
                                                    <span className="queue-item-client">{item.clients?.company_name}</span>
                                                    <span className="queue-item-title">{item.title}</span>
                                                </div>
                                            </div>
                                            <div className="queue-item-right">
                                                <span className={`queue-type-badge ${item.content_type.toLowerCase()}`}>
                                                    {item.content_type === 'Post' ? <FileText size={12} /> : <Video size={12} />}
                                                    {item.content_type}
                                                </span>
                                                <span className="status-badge" style={{ 
                                                    fontSize: '11px', 
                                                    color: 'var(--text-muted)', 
                                                    background: 'var(--bg-elevated)', 
                                                    padding: '3px 8px', 
                                                    borderRadius: '6px', 
                                                    border: '1px solid var(--border)',
                                                    fontWeight: 600,
                                                    textTransform: 'uppercase',
                                                    marginRight: '8px'
                                                }}>
                                                    {item.status}
                                                </span>
                                                <button
                                                    className="btn-mark-posted"
                                                    onClick={() => handleApproveContent(item.id)}
                                                    disabled={actionId === item.id}
                                                >
                                                    {actionId === item.id ? 'Approving...' : 'Approve'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* APPROVED BY CONTENT HEAD - Undo list */}
                        <div className="emergency-panel">
                            <div className="emergency-panel-header">
                                <CheckCircle2 size={24} color="var(--success)" />
                                <h2 className="emergency-panel-title">Recently Approved</h2>
                                <span className="card-badge">
                                    {approvedTasks.length} Approved
                                </span>
                            </div>

                            {loading ? (
                                <div className="posting-queue">
                                    <Skeleton className="h-14 w-full" />
                                </div>
                            ) : approvedTasks.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', padding: '12px' }}>
                                    No tasks approved yet in this period.
                                </p>
                            ) : (
                                <div className="posting-queue">
                                    {approvedTasks.map(item => (
                                        <div key={item.id} className="queue-item" style={{ borderLeft: '4px solid var(--success)' }}>
                                            <div className="queue-item-left" onClick={() => handleItemClick(item)}>
                                                <div className="queue-time-badge">
                                                    <span className="time-text">{format(parseISO(item.scheduled_datetime), 'dd')}</span>
                                                    <span className="ampm-text">{format(parseISO(item.scheduled_datetime), 'MMM')}</span>
                                                </div>
                                                <div className="queue-item-info">
                                                    <span className="queue-item-client">{item.clients?.company_name}</span>
                                                    <span className="queue-item-title">{item.title}</span>
                                                </div>
                                            </div>
                                            <div className="queue-item-right">
                                                <span className={`queue-type-badge ${item.content_type.toLowerCase()}`}>
                                                    {item.content_type === 'Post' ? <FileText size={12} /> : <Video size={12} />}
                                                    {item.content_type}
                                                </span>
                                                <button
                                                    className="btn-rollback"
                                                    onClick={() => handleUndoApproval(item.id)}
                                                    disabled={actionId === item.id}
                                                >
                                                    {actionId === item.id ? 'Reverting...' : 'Undo Approval'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Calendar View */}
                {(view === 'client' || view === 'master') && (
                    <div className="calendar-card">
                        <div className="status-summary-row">
                            <div className="status-pill status-pill-reels">
                                <span className="status-pill-label">Reels Target</span>
                                <span className="status-pill-count">{reelsCountStr}</span>
                            </div>
                            <div className="status-pill status-pill-posts">
                                <span className="status-pill-label">Posts Target</span>
                                <span className="status-pill-count">{postsCountStr}</span>
                            </div>
                            <div className="status-pill status-pill-shoot-done">
                                <span className="status-pill-label">Total Progress</span>
                                <span className="status-pill-count">{pipelineCountStr}</span>
                            </div>
                        </div>

                        <div className="calendar-grid">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                <div key={day} className="calendar-header-cell">
                                    <span>{day}</span>
                                </div>
                            ))}

                            {loading ? (
                                Array.from({ length: 35 }).map((_, idx) => (
                                    <div key={idx} className="calendar-day" style={{ minHeight: '120px' }}>
                                        <Skeleton className="h-6 w-8 mb-2" />
                                        <Skeleton className="h-4 w-full" />
                                    </div>
                                ))
                            ) : (
                                days.map((day, idx) => {
                                    const dayItems = calendarData.filter(item => 
                                        isSameDay(parseISO(item.scheduled_datetime), day)
                                    );
                                    
                                    const isCurrentPeriod = isDayInPeriod(day);
                                    const isToday = isSameDay(day, new Date());

                                    return (
                                        <div 
                                            key={idx} 
                                            className={`calendar-day ${!isCurrentPeriod ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                                        >
                                            <span className="day-number">{format(day, 'd')}</span>
                                            <div className="day-items">
                                                {dayItems.map(item => {
                                                    const statusUpper = (item.status || '').toUpperCase();
                                                    const isApproved = isApprovedByContentHead(statusUpper);
                                                    const isWaiting = statusUpper === 'WAITING FOR APPROVAL';
                                                    
                                                    let statusBorderClass = '';
                                                    if (isWaiting) statusBorderClass = 'waiting-for-approval';
                                                    else if (isApproved) statusBorderClass = 'content-approved';
                                                    const assigneeName = item.assigned_employee?.name || 'Unassigned';
                                                    const isAssigned = !!item.assigned_to;
                                                    const clientPrefix = item.clients?.company_name 
                                                        ? `[${getClientAbbreviation(item.clients.company_name)}] `
                                                        : item.freelancer_name 
                                                            ? `[${item.freelancer_name.substring(0, 3).toUpperCase()}] `
                                                            : '';

                                                    return (
                                                        <div 
                                                            key={item.id} 
                                                            className={`content-item ${item.content_type.toLowerCase()} ${statusBorderClass}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleItemClick(item);
                                                            }}
                                                            title={`${item.title} (${item.status})`}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '4px', minWidth: 0 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flex: 1 }}>
                                                                    {item.content_type === 'Post' ? <FileText size={10} style={{ flexShrink: 0 }} /> : <Video size={10} style={{ flexShrink: 0 }} />}
                                                                    <span className="truncate" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1, minWidth: 0 }}>
                                                                        {clientPrefix}
                                                                        {item.content_type}
                                                                    </span>
                                                                    <span className={`assignment-badge ${isAssigned ? 'assigned' : 'unassigned'}`} style={{ transform: 'scale(0.8)', transformOrigin: 'left center', padding: '1px 6px', fontSize: '9px', display: 'inline-flex', alignItems: 'center', height: '16px', borderRadius: '10px', verticalAlign: 'middle', marginLeft: '2px', flexShrink: 0 }}>
                                                                        <span className="assignment-name">{assigneeName}</span>
                                                                    </span>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                                                    {isApproved ? (
                                                                        <Check size={10} style={{ color: '#10b981' }} />
                                                                    ) : (
                                                                        <AlertTriangle size={10} style={{ color: '#f59e0b' }} />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* Writer Management View */}
                {view === 'employees' && (
                    <div className="dashboard-view-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Writer Management Stats */}
                        <div className="posting-stats-grid">
                            {/* Card 1: Total Writers */}
                            <div className="progress-meter-card">
                                <h3 className="stat-label">Total Writers</h3>
                                <div className="progress-values">
                                    <span className="current">{writers.length}</span>
                                    <span className="unit">Registered Writers</span>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, marginTop: '8px' }}>
                                    Content Creation Team
                                </div>
                            </div>

                            {/* Card 2: Active Assignments */}
                            <div className="progress-meter-card reels">
                                <h3 className="stat-label" style={{ color: '#a855f7' }}>Client Assignments</h3>
                                <div className="progress-values">
                                    <span className="current" style={{ color: '#a855f7' }}>
                                        {clients.filter(c => c.writer_employee_id).length}
                                    </span>
                                    <span className="separator">/</span>
                                    <span className="total">{clients.length}</span>
                                    <span className="unit">Clients Assigned</span>
                                </div>
                                <div className="progress-bar-container">
                                    <div className="progress-bar-fill reels-fill" style={{ 
                                        width: `${clients.length > 0 ? (clients.filter(c => c.writer_employee_id).length / clients.length) * 100 : 0}%` 
                                    }}></div>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>
                                    {clients.length > 0 ? Math.round((clients.filter(c => c.writer_employee_id).length / clients.length) * 100) : 0}% Coverage
                                </div>
                            </div>

                            {/* Card 3: Writing Task Completion Today */}
                            <div className="progress-meter-card posts">
                                <h3 className="stat-label" style={{ color: '#ec4899' }}>Today's Progress</h3>
                                <div className="progress-values">
                                    <span className="current" style={{ color: '#ec4899' }}>
                                        {writerProductivity.reduce((acc, curr) => acc + (curr.completedTasks || 0), 0)}
                                    </span>
                                    <span className="separator">/</span>
                                    <span className="total">
                                        {writerProductivity.reduce((acc, curr) => acc + (curr.assignedTasks || 0), 0)}
                                    </span>
                                    <span className="unit">Tasks Completed</span>
                                </div>
                                <div className="progress-bar-container">
                                    <div className="progress-bar-fill posts-fill" style={{ 
                                        width: `${writerProductivity.reduce((acc, curr) => acc + (curr.assignedTasks || 0), 0) > 0 
                                            ? (writerProductivity.reduce((acc, curr) => acc + (curr.completedTasks || 0), 0) / writerProductivity.reduce((acc, curr) => acc + (curr.assignedTasks || 0), 0)) * 100 
                                            : 0}%` 
                                    }}></div>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>
                                    {writerProductivity.reduce((acc, curr) => acc + (curr.assignedTasks || 0), 0) > 0 
                                        ? Math.round((writerProductivity.reduce((acc, curr) => acc + (curr.completedTasks || 0), 0) / writerProductivity.reduce((acc, curr) => acc + (curr.assignedTasks || 0), 0)) * 100) 
                                        : 0}% Completion Rate
                                </div>
                            </div>
                        </div>

                        {/* Action Bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', background: 'var(--bg-surface)', padding: '16px 24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                                <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="Search writers by name or email..."
                                    value={searchWriterQuery}
                                    onChange={(e) => setSearchWriterQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-elevated)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        padding: '10px 16px 10px 42px',
                                        fontSize: '14px',
                                        color: 'var(--text-primary)',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                            <button className="btn-mark-posted" onClick={() => setShowCreateWriterModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Plus size={16} />
                                Add Content Writer
                            </button>
                        </div>

                        {/* Writers Grid */}
                        {loadingWriters ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                                <Skeleton className="h-64 w-full rounded-2xl" />
                                <Skeleton className="h-64 w-full rounded-2xl" />
                            </div>
                        ) : writers.length === 0 ? (
                            <div className="posting-empty-state">
                                <div className="empty-icon"><Users size={36} /></div>
                                <h3>No Content Writers Found</h3>
                                <p>Create a writer account to start assigning clients and tracking tasks.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                                {writers
                                    .filter(w => 
                                        w.name?.toLowerCase().includes(searchWriterQuery.toLowerCase()) ||
                                        w.email?.toLowerCase().includes(searchWriterQuery.toLowerCase())
                                    )
                                    .map(writer => {
                                        const stats = getWriterStats(writer.user_id);
                                        const assignedClients = clients.filter(c => c.writer_employee_id === writer.user_id);

                                        return (
                                            <div key={writer.user_id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}>
                                                {/* Writer Profile Header */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                                                        <div className="user-avatar" style={{ width: '44px', height: '44px', fontSize: '16px', flexShrink: 0 }}>
                                                            {writer.name?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div style={{ minWidth: 0 }}>
                                                            <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{writer.name}</h4>
                                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{writer.email}</p>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleDeleteWriter(writer.user_id, writer.name)}
                                                        className="btn-icon delete"
                                                        style={{ flexShrink: 0 }}
                                                        title="Delete Writer"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>

                                                {/* Assigned Clients */}
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Assigned Clients</span>
                                                        <span style={{ fontSize: '11px', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{assignedClients.length}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '34px', alignItems: 'center' }}>
                                                        {assignedClients.length === 0 ? (
                                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No clients assigned</span>
                                                        ) : (
                                                            assignedClients.map(client => (
                                                                <div key={client.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(13, 148, 136, 0.08)', border: '1px solid rgba(13, 148, 136, 0.2)', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: '#0d9488' }}>
                                                                    <span>{client.company_name}</span>
                                                                    <button 
                                                                        onClick={() => handleUnassignClient(client.id, writer.user_id)}
                                                                        style={{ background: 'transparent', border: 'none', color: '#0d9488', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 800 }}
                                                                        title="Unassign Client"
                                                                    >
                                                                        &times;
                                                                    </button>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedWriterForAssignment(writer);
                                                            setShowAssignClientModal(true);
                                                        }}
                                                        style={{ marginTop: '10px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}
                                                    >
                                                        <Plus size={14} />
                                                        Assign Client
                                                    </button>
                                                </div>

                                                {/* Productivity / Stats */}
                                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {/* Today's completion */}
                                                    <div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                                                            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Today's Tasks</span>
                                                            <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{stats.completedTasks}/{stats.assignedTasks}</span>
                                                        </div>
                                                        <div className="progress-bar-container" style={{ height: '4px' }}>
                                                            <div className="progress-bar-fill" style={{ 
                                                                width: `${stats.assignedTasks > 0 ? (stats.completedTasks / stats.assignedTasks) * 100 : 0}%`,
                                                                background: '#0d9488'
                                                            }}></div>
                                                        </div>
                                                    </div>

                                                    {/* Monthly completion */}
                                                    <div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                                                            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Monthly Tasks</span>
                                                            <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{stats.monthlyCompleted}/{stats.monthlyTotal}</span>
                                                        </div>
                                                        <div className="progress-bar-container" style={{ height: '4px' }}>
                                                            <div className="progress-bar-fill" style={{ 
                                                                width: `${stats.monthlyTotal > 0 ? (stats.monthlyCompleted / stats.monthlyTotal) * 100 : 0}%`,
                                                                background: '#a855f7'
                                                            }}></div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Today's Tasks List */}
                                                {stats.tasks && stats.tasks.length > 0 && (
                                                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                                                        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Today's Schedule</span>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                                                            {stats.tasks.map((task: any) => (
                                                                <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                                    <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                                                                        <span style={{ fontSize: '10px', color: '#0d9488', fontWeight: 800, display: 'block' }}>{task.clientName}</span>
                                                                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                                                                    </div>
                                                                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: task.employeeStatus === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: task.employeeStatus === 'COMPLETED' ? '#10b981' : '#f59e0b' }}>
                                                                        {task.employeeStatus || 'PENDING'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Task Details Dialog Modal */}
            {isDetailsOpen && activeItem && (
                <div className="modal-overlay" onClick={() => setIsDetailsOpen(false)}>
                    <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <div className="detail-meta">
                                    <span className={`type-badge ${activeItem.item.content_type.toLowerCase()}`}>
                                        {activeItem.item.content_type}
                                    </span>
                                    <span className="meta-dot">•</span>
                                    {activeItem.item.clients?.company_name && (
                                        <span 
                                            className="meta-client client-link-hover" 
                                            onClick={() => {
                                                setIsDetailsOpen(false);
                                                setView('client');
                                                setSelectedClient(activeItem.item.client_id);
                                            }}
                                        >
                                            {activeItem.item.clients?.company_name}
                                        </span>
                                    )}
                                    {activeItem.item.is_emergency && (
                                        <>
                                            <span className="meta-dot">•</span>
                                            <span className="type-badge danger" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>Emergency</span>
                                        </>
                                    )}
                                </div>
                                <h2 className="modal-title">{activeItem.item.title}</h2>
                            </div>
                            <button className="modal-close" onClick={() => setIsDetailsOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="detail-grid">
                            <div className="detail-info">
                                <div>
                                    <span className="detail-label">Description</span>
                                    <p className="detail-text">
                                        {activeItem.item.description || 'No description provided.'}
                                    </p>
                                </div>
                                <div className="detail-dates">
                                    <div>
                                        <span className="detail-label">Scheduled Date</span>
                                        <div className="date-display">
                                            <Clock size={16} className="date-icon" />
                                            <span>{formatIST(activeItem.item.scheduled_datetime, 'PPP p')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-workflow">
                                <span className="detail-label">Status Progression</span>
                                <div className="workflow-content">
                                    <div className="status-current">
                                        <p className="status-label">Current Status</p>
                                        <p className="status-value">{activeItem.item.status}</p>
                                    </div>

                                    {/* Action Buttons for Content Head */}
                                    <div className="workflow-actions-section">
                                        {!isApprovedByContentHead(activeItem.item.status) ? (
                                            <>
                                                <textarea
                                                    className="status-note-input"
                                                    placeholder="Add an optional review note..."
                                                    value={statusNote}
                                                    onChange={(e) => setStatusNote(e.target.value)}
                                                    rows={3}
                                                />
                                                <button
                                                    className="btn-approve-content"
                                                    onClick={() => handleApproveContent(activeItem.item.id)}
                                                    disabled={actionId === activeItem.item.id}
                                                >
                                                    <Check size={18} />
                                                    {actionId === activeItem.item.id ? 'Approving...' : 'Approve Content'}
                                                </button>
                                            </>
                                        ) : activeItem.item.status === 'CONTENT APPROVED' ? (
                                            <button
                                                className="btn-undo-approval"
                                                onClick={() => handleUndoApproval(activeItem.item.id)}
                                                disabled={actionId === activeItem.item.id}
                                            >
                                                <Undo2 size={18} />
                                                {actionId === activeItem.item.id ? 'Undoing...' : 'Undo Approval'}
                                            </button>
                                        ) : (
                                            <div className={`workflow-status-badge ${isApprovedByContentHead(activeItem.item.status) ? 'approved' : 'other'}`}>
                                                {isApprovedByContentHead(activeItem.item.status) ? (
                                                    <>
                                                        <CheckCircle2 size={18} />
                                                        <span>Content Already Approved</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock size={18} />
                                                        <span>Awaiting Team Action</span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status logs history */}
                        <div className="activity-log">
                            <h3 className="detail-label" style={{ marginBottom: '16px' }}>Activity History</h3>
                            <div className="log-list">
                                {activeItem.history && activeItem.history.length > 0 ? (
                                    activeItem.history.map((log: any) => (
                                        <div key={log.id} className="log-item">
                                            <div className="log-dot"></div>
                                            <div className="log-content">
                                                <p className="log-title">
                                                    Changed to <span style={{ fontWeight: 800 }}>{log.new_status}</span>
                                                </p>
                                                <p className="log-meta">
                                                    by {log.users?.name || 'System'} ({log.users?.role_identifier || 'User'}) • {formatIST(log.changed_at, 'PPP p')}
                                                </p>
                                                {log.note && <p className="log-note">{log.note}</p>}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="log-empty">No status changes logged yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Navigation between tasks scheduled on the same day */}
                        {dayTasks.length > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                                <button onClick={() => navigateToTask('prev')} className="btn-rollback" style={{ padding: '8px 16px' }}>Previous Task</button>
                                <button onClick={() => navigateToTask('next')} className="btn-rollback" style={{ padding: '8px 16px' }}>Next Task</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Create Writer Modal */}
            {showCreateWriterModal && (
                <div className="modal-overlay" onClick={() => setShowCreateWriterModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Create Content Writer</h3>
                            <button onClick={() => setShowCreateWriterModal(false)} className="modal-close"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateWriter}>
                            <div className="form-group">
                                <label className="form-label">Full Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    required
                                    value={writerForm.name}
                                    onChange={(e) => setWriterForm({ ...writerForm, name: e.target.value })}
                                    placeholder="Enter full name"
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email Address *</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    required
                                    value={writerForm.email}
                                    onChange={(e) => setWriterForm({ ...writerForm, email: e.target.value })}
                                    placeholder="writer@trueupmedia.com"
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Password *</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    required
                                    value={writerForm.password}
                                    onChange={(e) => setWriterForm({ ...writerForm, password: e.target.value })}
                                    placeholder="Minimum 6 characters"
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowCreateWriterModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={loading} style={{ width: 'auto', padding: '10px 24px' }}>
                                    {loading ? 'Creating...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Client Modal */}
            {showAssignClientModal && selectedWriterForAssignment && (
                <div className="modal-overlay" onClick={() => {
                    setShowAssignClientModal(false);
                    setSelectedWriterForAssignment(null);
                }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                        <div className="modal-header">
                            <div>
                                <h3 className="modal-title">Assign Client</h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Assign client to <strong style={{ color: 'var(--text-primary)' }}>{selectedWriterForAssignment.name}</strong></p>
                            </div>
                            <button onClick={() => {
                                setShowAssignClientModal(false);
                                setSelectedWriterForAssignment(null);
                            }} className="modal-close"><X size={20} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="Search clients..."
                                    value={assignClientSearchQuery}
                                    onChange={(e) => setAssignClientSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-elevated)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        padding: '8px 12px 8px 36px',
                                        fontSize: '13px',
                                        color: 'var(--text-primary)',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                                {clients
                                    .filter(c => c.company_name?.toLowerCase().includes(assignClientSearchQuery.toLowerCase()))
                                    .map(client => {
                                        const isAlreadyAssignedToThisWriter = client.writer_employee_id === selectedWriterForAssignment.user_id;
                                        const currentWriterAssigned = writers.find(w => w.user_id === client.writer_employee_id);

                                        return (
                                            <div key={client.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                                                <div>
                                                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>{client.company_name}</span>
                                                    {currentWriterAssigned && (
                                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                            Currently: {currentWriterAssigned.name}
                                                        </span>
                                                    )}
                                                </div>
                                                {isAlreadyAssignedToThisWriter ? (
                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0d9488' }}>Assigned</span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleAssignClient(client.id, selectedWriterForAssignment.user_id)}
                                                        className="btn-mark-posted"
                                                        style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}
                                                    >
                                                        Assign
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            {toast && (
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#0d9488', color: 'white', padding: '12px 24px', borderRadius: '10px', boxShadow: '0 8px 32px rgba(13, 148, 136, 0.3)', zIndex: 3000, fontWeight: 700 }}>
                    {toast}
                </div>
            )}
        </div>
    );
}
