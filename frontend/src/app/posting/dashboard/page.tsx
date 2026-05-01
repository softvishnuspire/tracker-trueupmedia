'use client';

import React, { useState, useEffect } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    parseISO
} from 'date-fns';
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    LayoutDashboard,
    Globe,
    Calendar as CalendarIcon,
    FileText,
    Video,
    CheckCircle2,
    X,
    LogOut,
    Filter,
    Menu,
    Send,
    Clock,
    UserCircle,
    ShieldAlert,
    AlertTriangle,
    ArrowRight,
    CalendarClock,
    Undo2
} from 'lucide-react';
import { postingApi, emergencyApi, settingsApi } from '@/lib/api';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';
import '../posting.css';

interface ContentItem {
    id: string;
    title: string;
    description: string;
    content_type: 'Post' | 'Reel' | 'YouTube';
    scheduled_datetime: string;
    status: string;
    client_id: string;
    is_emergency?: boolean;
    clients?: { company_name: string };
}

export default function PostingDashboard() {
    const [view, setView] = useState<'dashboard' | 'client' | 'master' | 'company'>('dashboard');
    const [queue, setQueue] = useState<ContentItem[]>([]);
    const [calendarData, setCalendarData] = useState<ContentItem[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>('all');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const [loading, setLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [postingId, setPostingId] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [activeItem, setActiveItem] = useState<any>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [statusNote, setStatusNote] = useState('');
    const [user, setUser] = useState<any>(null);
    const [todayStats, setTodayStats] = useState({ total: 0, completed: 0, percentage: 0, remaining: 0 });
    const [emergencyTasks, setEmergencyTasks] = useState<ContentItem[]>([]);
    const [dayTasks, setDayTasks] = useState<ContentItem[]>([]);
    const [showCompanyCalendar, setShowCompanyCalendar] = useState(true);

    const router = useRouter();
    const supabase = createClient();

    const getClientBatchType = (clientId: string) => {
        if (clientId === 'all') return '1-1';
        const client = clients.find(c => c.id === clientId);
        return client?.batch_type || '1-1';
    };

    const getPeriodLabel = () => {
        return `Current Month (${format(startOfMonth(currentMonth), 'MMM d')} - ${format(endOfMonth(currentMonth), 'MMM d')})`;
    };

    const isDayInPeriod = (date: Date) => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        return date >= start && date <= end;
    };

    // Fetch stats for the meter
    const fetchTodayStats = async () => {
        try {
            // For today's stats, we usually just care about the current calendar month's overview 
            // but for consistency let's use the same logic if a client is selected
            const res = await postingApi.getMasterCalendar(format(new Date(), 'yyyy-MM'), undefined, undefined, true);
            const data = res.data as ContentItem[];
            const today = new Date();
            const todayItems = data.filter(item => isSameDay(parseISO(item.scheduled_datetime), today));
            const totalToday = todayItems.length;
            const completedToday = todayItems.filter(item => item.status === 'POSTED').length;
            setTodayStats({
                total: totalToday,
                completed: completedToday,
                remaining: totalToday - completedToday,
                percentage: totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0
            });

            // Fetch all emergency tasks
            const emergencyRes = await emergencyApi.getAll();
            setEmergencyTasks(emergencyRes.data);
        } catch (err) { console.error('Error fetching today stats:', err); }
    };

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUser(user);
        };
        const fetchSettings = async () => {
            try {
                const res = await settingsApi.getSettings();
                const calendarSetting = res.data.find(s => s.key === 'show_company_calendar');
                if (calendarSetting) {
                    setShowCompanyCalendar(calendarSetting.value === true || calendarSetting.value === 'true');
                }
            } catch (err) {
                console.error('Error fetching settings:', err);
            }
        };
        fetchUser();
        fetchClients();
        fetchTodayStats();
        fetchSettings();
    }, []);

    useEffect(() => {
        if (view === 'dashboard') {
            fetchTodayQueue();
        } else if (view === 'client' && selectedClient && selectedClient !== 'all') {
            fetchClientCalendar();
        } else if (view === 'master' || view === 'company') {
            fetchMasterCalendar();
        }
    }, [view, selectedClient, currentMonth]);

    const fetchClients = async () => {
        try {
            const res = await postingApi.getClients();
            setClients(res.data);
            if (res.data.length > 0 && selectedClient === 'all') {
                // Keep 'all' for master, but maybe select first for client view if needed
            }
        } catch (err) { console.error(err); }
    };

    const fetchTodayQueue = async () => {
        setLoading(true);
        try {
            const res = await postingApi.getToday();
            setQueue(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchClientCalendar = async () => {
        if (selectedClient === 'all') return;
        setLoading(true);
        try {
            const currentMonthStr = format(currentMonth, 'yyyy-MM');
            const res = await postingApi.getCalendar(selectedClient, currentMonthStr, 'WAITING FOR POSTING');
            setCalendarData(res.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchMasterCalendar = async () => {
        setLoading(true);
        try {
            const currentMonthStr = format(currentMonth, 'yyyy-MM');
            let asOfDate;
            if (view === 'company') {
                const d = new Date();
                d.setDate(d.getDate() - 7);
                asOfDate = d.toISOString();
            }
            const res = await postingApi.getMasterCalendar(
                currentMonthStr,
                selectedClient === 'all' ? undefined : selectedClient,
                view === 'company' ? undefined : 'WAITING FOR POSTING',
                undefined,
                asOfDate
            );
            setCalendarData(res.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleMarkPosted = async (id: string) => {
        setPostingId(id);
        try {
            const actorId = user?.id;
            await postingApi.markAsPosted(id, actorId);
            setToast('Content marked as POSTED!');
            setTimeout(() => setToast(null), 3000);
            
            // Refresh everything
            await Promise.all([
                fetchTodayStats(),
                fetchTodayQueue(),
                view === 'client' ? fetchClientCalendar() : Promise.resolve(),
                view === 'master' ? fetchMasterCalendar() : Promise.resolve()
            ]);
            
            if (activeItem?.item?.id === id) {
                const res = await postingApi.getContentDetails(id);
                setActiveItem(res.data);
            }
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to mark as posted');
        } finally { setPostingId(null); }
    };

    const handleUndo = async (id: string) => {
        setPostingId(id);
        try {
            await postingApi.undoStatus(id);
            setToast('Reverted to Waiting for Posting');
            setTimeout(() => setToast(null), 3000);
            
            // Refresh everything
            await Promise.all([
                fetchTodayStats(),
                fetchTodayQueue(),
                view === 'client' ? fetchClientCalendar() : Promise.resolve(),
                view === 'master' ? fetchMasterCalendar() : Promise.resolve()
            ]);

            if (activeItem?.item?.id === id) {
                const res = await postingApi.getContentDetails(id);
                setActiveItem(res.data);
            }
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to undo status');
        } finally { setPostingId(null); }
    };

    const handleUndoStatus = async () => {
        if (!activeItem) return;
        if (!window.confirm('Are you sure you want to undo the last status change?')) return;
        try {
            await postingApi.undoStatus(activeItem.item.id);
            let asOfDate;
            if (view === 'company') {
                const d = new Date(); d.setDate(d.getDate() - 7);
                asOfDate = d.toISOString();
            }
            const res = await postingApi.getContentDetails(activeItem.item.id, asOfDate);
            setActiveItem(res.data);
            fetchMasterCalendar();
            fetchTodayQueue();
        } catch (err) {
            console.error(err);
            alert('Failed to undo status change. It might be because there is no more history to undo.');
        }
    };

    const handleItemClick = async (item: ContentItem) => {
        try {
            // Find all tasks on the same day as the clicked item
            const day = parseISO(item.scheduled_datetime);
            
            // Try to find tasks in calendarData first, fallback to queue if in dashboard view
            let sourceList = calendarData.length > 0 ? calendarData : queue;
            
            // If the item itself isn't in the source list (e.g. from emergency tasks), add it
            const tasksOnDay = sourceList.filter(i => isSameDay(parseISO(i.scheduled_datetime), day));
            
            // Ensure the clicked item is included if it's from a different source (like emergencyTasks)
            if (!tasksOnDay.some(t => t.id === item.id)) {
                tasksOnDay.push(item);
            }

            // Sort them by time
            tasksOnDay.sort((a, b) => new Date(a.scheduled_datetime).getTime() - new Date(b.scheduled_datetime).getTime());
            
            setDayTasks(tasksOnDay);

            let asOfDate;
            if (view === 'company') {
                const d = new Date();
                d.setDate(d.getDate() - 7);
                asOfDate = d.toISOString();
            }

            const res = await postingApi.getContentDetails(item.id, asOfDate);
            setActiveItem(res.data);
            setIsDetailsOpen(true);
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
            let asOfDate;
            if (view === 'company') {
                const d = new Date();
                d.setDate(d.getDate() - 7);
                asOfDate = d.toISOString();
            }
            const res = await postingApi.getContentDetails(nextTask.id, asOfDate);
            setActiveItem(res.data);
        } catch (err) { console.error(err); }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const getDays = () => {
        const isBiMonthly = selectedClient !== 'all' && getClientBatchType(selectedClient) === '15-15';
        if (!isBiMonthly) {
            return eachDayOfInterval({
                start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
                end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
            });
        }

        const periodStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 15);
        const periodEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 14);
        
        return eachDayOfInterval({
            start: startOfWeek(periodStart, { weekStartsOn: 1 }),
            end: endOfWeek(periodEnd, { weekStartsOn: 1 })
        });
    };

    const days = getDays();

    const monthTotal = calendarData.length;
    const monthCompleted = calendarData.filter(i => (i.status || '').toUpperCase() === 'POSTED').length;
    const monthPercentage = monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const weekItems = calendarData.filter(item => {
        const itemDate = parseISO(item.scheduled_datetime);
        return itemDate >= weekStart && itemDate <= weekEnd;
    });
    const weekTotal = weekItems.length;
    const weekCompleted = weekItems.filter(i => (i.status || '').toUpperCase() === 'POSTED').length;
    const weekPercentage = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;
    
    const monthStatusCounts = calendarData.reduce(
        (acc, item) => {
            if (!isDayInPeriod(parseISO(item.scheduled_datetime))) return acc;
            const normalizedStatus = (item.status || '').toUpperCase();
            if (normalizedStatus.includes('CONTENT')) acc.content += 1;
            if (normalizedStatus.includes('DESIGN')) acc.design += 1;
            if (normalizedStatus === 'POSTED') acc.posted += 1;
            if (item.content_type === 'Reel') acc.reels += 1;
            if (item.content_type === 'Post') acc.posts += 1;
            return acc;
        },
        { content: 0, design: 0, posted: 0, reels: 0, posts: 0 }
    );

    return (
        <div className="dashboard-container">
            <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 2100 }}>
                <NotificationBell />
            </div>
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="logo-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src="/logo.png" alt="TrueUp Media" className="logo-img" style={{ height: '28px', width: 'auto' }} />
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>POSTING</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="sidebar-close" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 sidebar-nav">
                    <p className="sidebar-label">Navigation</p>
                    <div
                        onClick={() => setView('dashboard')}
                        className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
                    >
                        <LayoutDashboard size={20} />
                        <span>Today's Queue</span>
                    </div>
                    <div
                        onClick={() => setView('client')}
                        className={`nav-item ${view === 'client' ? 'active' : ''}`}
                    >
                        <CalendarIcon size={20} />
                        <span>Client Calendar</span>
                    </div>
                    <div
                        onClick={() => setView('master')}
                        className={`nav-item ${view === 'master' ? 'active' : ''}`}
                    >
                        <Globe size={20} />
                        <span>Master Calendar</span>
                    </div>
                    {showCompanyCalendar && (
                        <div
                            onClick={() => setView('company')}
                            className={`nav-item ${view === 'company' ? 'active' : ''}`}
                        >
                            <CalendarClock size={20} />
                            <span>Company Calendar</span>
                        </div>
                    )}

                    {view === 'client' && (
                        <>
                            <div className="sidebar-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Clients</span>
                                <span style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '6px', color: 'var(--accent)', border: '1px solid var(--border)' }}>{clients.length}</span>
                            </div>
                            <div className="client-list">
                                {clients
                                    .sort((a, b) => (a.company_name || '').localeCompare(b.company_name || ''))
                                    .map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => setSelectedClient(c.id)}
                                            className={`client-item ${selectedClient === c.id ? 'selected' : ''}`}
                                        >
                                            <div className="client-avatar">
                                                {c.company_name?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <span>{c.company_name}</span>
                                        </div>
                                    ))}
                            </div>
                        </>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gridColumn: '1 / -1', marginBottom: '4px' }}>
                        <span className="sidebar-label" style={{ margin: 0, padding: 0 }}>Appearance</span>
                        <ThemeToggle style={{ width: '28px', height: '28px', borderRadius: '8px' }} />
                    </div>
                    <div className="user-info-box">
                        <div className="user-avatar" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))', color: 'white' }}>PT</div>
                        <div style={{ minWidth: 0 }}>
                            <p className="user-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Posting Team</p>
                            <p className="user-role">TrueUp Media</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="logout-btn" title="Sign Out">
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <div className="mobile-header-top">
                    <div className="menu-toggle" onClick={() => setIsSidebarOpen(true)}>
                        <Menu size={24} />
                    </div>
                    <img src="/logo.png" alt="TrueUp Media" style={{ height: '24px', width: 'auto' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <NotificationBell />
                    </div>
                </div>

                <header className="page-header">
                    <div className="header-content">
                        <div className="header-info">
                            <h1 className="page-title">
                                {view === 'dashboard' && "Today's Posting Queue"}
                                {view === 'client' && 'Client Calendar'}
                                {view === 'master' && 'Master Calendar'}
                                {view === 'company' && 'Company Calendar'}
                            </h1>
                            <p className="page-subtitle">
                                {view === 'dashboard' && `${format(new Date(), 'EEEE, MMMM d')} — Content ready for publishing`}
                                {view === 'client' && 'Manage posting schedule for individual clients'}
                                {view === 'master' && 'Review company-wide posting pipeline'}
                                {view === 'company' && 'Historical view of content statuses (-7 days)'}
                            </p>
                        </div>

                        <div className="header-controls">
                            {view === 'client' && (
                                <div className="client-dropdown-wrapper">
                                    <select
                                        className="client-dropdown"
                                        value={selectedClient}
                                        onChange={(e) => setSelectedClient(e.target.value)}
                                    >
                                        <option value="all" disabled={selectedClient !== 'all'}>Select a client</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.company_name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="dropdown-chevron" />
                                </div>
                            )}

                            {(view === 'master' || view === 'company') && (
                                <div className="master-filters-container">
                                    <div className="filter-icon-box">
                                        <Filter size={14} />
                                    </div>
                                    <div className="client-dropdown-wrapper">
                                        <select
                                            className="client-dropdown"
                                            value={selectedClient}
                                            onChange={(e) => setSelectedClient(e.target.value)}
                                        >
                                            <option value="all">All Clients</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id}>{c.company_name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="dropdown-chevron" />
                                    </div>
                                </div>
                            )}

                            {view !== 'dashboard' && (
                                <div className="month-nav">
                                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="month-btn"><ChevronLeft size={20} /></button>
                                    <span className="month-label">{getPeriodLabel()}</span>
                                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="month-btn"><ChevronRight size={20} /></button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {view === 'dashboard' && (
                    <div className="daily-stats-banner">
                        <div className="posting-stats-grid">
                            <div className="progress-meter-card" style={{ padding: '20px' }}>
                                <h3 className="stat-label">Today&apos;s Progress</h3>
                                <div className="progress-values">
                                    <span className="current">{todayStats.completed}</span>
                                    <span className="separator">/</span>
                                    <span className="total">{todayStats.total}</span>
                                    <span className="unit">Tasks</span>
                                </div>
                                <div className="meter-labels">
                                    <span className="percentage">{todayStats.percentage}% Done</span>
                                </div>
                            </div>

                            <div className="progress-meter-card" style={{ padding: '20px' }}>
                                <h3 className="stat-label">Week&apos;s Progress</h3>
                                <div className="progress-values">
                                    <span className="current">{weekCompleted}</span>
                                    <span className="separator">/</span>
                                    <span className="total">{weekTotal}</span>
                                    <span className="unit">Tasks</span>
                                </div>
                                <div className="meter-labels">
                                    <span className="percentage">{weekPercentage}% Done</span>
                                </div>
                            </div>

                            <div className="progress-meter-card" style={{ padding: '20px' }}>
                                <h3 className="stat-label">Period Progress</h3>
                                <div className="progress-values">
                                    <span className="current">{monthCompleted}</span>
                                    <span className="separator">/</span>
                                    <span className="total">{monthTotal}</span>
                                    <span className="unit">Tasks</span>
                                </div>
                                <div className="meter-labels">
                                    <span className="percentage">{monthPercentage}% Done</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'dashboard' && emergencyTasks.length > 0 && (
                    <div className="emergency-panel">
                        <div className="emergency-panel-header">
                            <ShieldAlert size={24} color="#ef4444" />
                            <h2 className="emergency-panel-title">All Emergency Tasks</h2>
                        </div>
                        <div className="emergency-list">
                            {emergencyTasks.map(task => (
                                <div 
                                    key={task.id} 
                                    className="emergency-card"
                                    onClick={() => handleItemClick(task)}
                                >
                                    <div className="emergency-card-icon">
                                        {task.content_type === 'Post' ? <FileText size={20} /> : <Video size={20} />}
                                    </div>
                                    <div className="emergency-card-body">
                                        <div className="emergency-card-client">{task.clients?.company_name.toUpperCase()}</div>
                                        <div className="emergency-card-details">
                                            <span className="type">{task.content_type}</span>
                                            <span className="dot">•</span>
                                            <span className="time">{format(parseISO(task.scheduled_datetime), 'h:mm a')}</span>
                                        </div>
                                    </div>
                                    <div className="emergency-card-arrow">
                                        <ArrowRight size={18} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'dashboard' && (
                    <div className="dashboard-view">
                        <div className="posting-queue-section" style={{ marginTop: '24px' }}>
                            <div className="dashboard-card">
                                <div className="card-header">
                                    <h3 className="card-title">Live Posting Queue</h3>
                                    <span className="card-badge">Action Required</span>
                                </div>
                                
                                {loading ? (
                                    <div className="posting-queue">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="queue-item" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                                                <Skeleton className="h-10 w-full" />
                                            </div>
                                        ))}
                                    </div>
                                ) : queue.length === 0 ? (
                                    <div className="posting-empty-state">
                                        <div className="empty-icon"><CheckCircle2 size={36} /></div>
                                        <h3>All Caught Up!</h3>
                                        <p>No content is currently waiting to be posted.</p>
                                    </div>
                                ) : (
                                    <div className="posting-queue">
                                        {queue.map(item => (
                                            <div key={item.id} className={`queue-item ${item.status === 'POSTED' ? 'is-posted' : ''}`}>
                                                <div className="queue-item-left" onClick={() => handleItemClick(item)}>
                                                    <div className="queue-time-badge">
                                                        <span className="time-text">{format(parseISO(item.scheduled_datetime), 'hh:mm')}</span>
                                                        <span className="ampm-text">{format(parseISO(item.scheduled_datetime), 'a')}</span>
                                                    </div>
                                                    <div className="queue-item-info">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span className="queue-item-client">{item.clients?.company_name}</span>
                                                            {item.status === 'POSTED' && <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />}
                                                        </div>
                                                        <span className="queue-item-title">{item.title}</span>
                                                    </div>
                                                </div>
                                                <div className="queue-item-right">
                                                    <span className={`queue-type-badge ${item.content_type.toLowerCase()}`}>
                                                        {item.content_type === 'Post' ? <FileText size={12} /> : <Video size={12} />}
                                                        {item.content_type}
                                                    </span>
                                                    {item.status === 'POSTED' ? (
                                                        <button
                                                            className="btn-rollback"
                                                            onClick={() => handleUndo(item.id)}
                                                            disabled={postingId === item.id}
                                                            title="Revert to waiting"
                                                        >
                                                            {postingId === item.id ? '...' : 'Undo'}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="btn-mark-posted"
                                                            onClick={() => handleMarkPosted(item.id)}
                                                            disabled={postingId === item.id}
                                                        >
                                                            {postingId === item.id ? 'Posting...' : 'Mark as Posted'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {(view === 'client' || view === 'master' || view === 'company') && (
                    <div className="calendar-card">
                        <div className="status-summary-row" style={{ padding: '24px 24px 0 24px' }}>
                            <div className="status-pill status-pill-content">
                                <span className="status-pill-label">Content</span>
                                <span className="status-pill-count">{monthStatusCounts.content}</span>
                            </div>
                            <div className="status-pill status-pill-design">
                                <span className="status-pill-label">Design</span>
                                <span className="status-pill-count">{monthStatusCounts.design}</span>
                            </div>
                            <div className="status-pill status-pill-posted">
                                <span className="status-pill-label">Posted</span>
                                <span className="status-pill-count">{monthStatusCounts.posted}</span>
                            </div>
                            <div className="status-pill status-pill-reels">
                                <span className="status-pill-label">Reels</span>
                                <span className="status-pill-count">{monthStatusCounts.reels}</span>
                            </div>
                            <div className="status-pill status-pill-posts">
                                <span className="status-pill-label">Posts</span>
                                <span className="status-pill-count">{monthStatusCounts.posts}</span>
                            </div>
                        </div>
                        <div className="calendar-grid">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                <div key={day} className="calendar-header-cell">
                                    <span className="desktop-day">{day}</span>
                                    <span className="mobile-day">{day.charAt(0)}</span>
                                </div>
                            ))}

                            {loading ? (
                                Array.from({ length: 35 }).map((_, idx) => (
                                    <div key={idx} className="calendar-day" style={{ minHeight: '110px' }}>
                                        <Skeleton className="h-4 w-4 mb-2" />
                                        <Skeleton className="h-4 w-full" />
                                    </div>
                                ))
                            ) : (
                                days.map((day, idx) => {
                                    const dayContent = calendarData.filter(item => {
                                        const itemDate = parseISO(item.scheduled_datetime);
                                        return isSameDay(itemDate, day);
                                    });
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => { if (dayContent.length > 0) handleItemClick(dayContent[0]); }}
                                            className={`calendar-day ${!isDayInPeriod(day) ? 'other-month' : ''} ${isSameDay(day, new Date()) ? 'today' : ''}`}
                                            style={{ minHeight: '110px', cursor: dayContent.length > 0 ? 'pointer' : 'default' }}
                                        >
                                            <span className="day-number">{format(day, 'd')}</span>
                                            <div className="day-items desktop-only">
                                                {dayContent.map(item => (
                                                    <div
                                                        key={item.id}
                                                        onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                                                        className={`content-item ${item.content_type.toLowerCase()} ${item.is_emergency ? 'emergency' : ''}`}
                                                    >
                                                        {item.content_type === 'Post' ? <FileText size={10} /> : <Video size={10} />}
                                                        <span className="truncate">
                                                            {(view === 'master' || view === 'company') ? `[${item.clients?.company_name?.substring(0, 3)}] ` : ''}
                                                            {item.title}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mobile-day-indicators">
                                                {dayContent.map(item => (
                                                    <div 
                                                        key={item.id}
                                                        className={`mobile-dot ${item.content_type.toLowerCase()} ${item.is_emergency ? 'emergency' : ''}`}
                                                    ></div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Details Modal */}
            {isDetailsOpen && activeItem && (
                <div className="modal-overlay" onClick={() => setIsDetailsOpen(false)}>
                    <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h3 className="modal-title">{activeItem.item.title}</h3>
                                {dayTasks.length > 1 && (
                                    <span className="task-counter" style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                        Task {dayTasks.findIndex(t => t.id === activeItem.item.id) + 1} of {dayTasks.length}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {dayTasks.length > 1 && (
                                    <div className="task-nav-buttons" style={{ display: 'flex', gap: '4px', marginRight: '12px', paddingRight: '12px', borderRight: '1px solid var(--border)' }}>
                                        <button 
                                            onClick={() => navigateToTask('prev')}
                                            className="nav-btn"
                                            style={{ 
                                                width: '32px', height: '32px', borderRadius: '8px', 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                                color: 'var(--text-primary)', cursor: 'pointer'
                                            }}
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        <button 
                                            onClick={() => navigateToTask('next')}
                                            className="nav-btn"
                                            style={{ 
                                                width: '32px', height: '32px', borderRadius: '8px', 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                                color: 'var(--text-primary)', cursor: 'pointer'
                                            }}
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                )}
                                <button onClick={() => { setIsDetailsOpen(false); setStatusNote(''); }} className="modal-close"><X size={20} /></button>
                            </div>
                        </div>
                        
                        <div className="modal-body" style={{ padding: '32px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                <div className="detail-section">
                                    <div className="detail-field">
                                        <label className="detail-label">Client</label>
                                        <p className="detail-value">{activeItem.item.clients?.company_name}</p>
                                    </div>
                                    <div className="detail-field">
                                        <label className="detail-label">Scheduled For</label>
                                        <div className="date-item">
                                            <Clock size={16} />
                                            <span className="date-display">{format(parseISO(activeItem.item.scheduled_datetime), 'PPP p')}</span>
                                        </div>
                                    </div>
                                    <div className="detail-field">
                                        <label className="detail-label">Description</label>
                                        <p className="detail-text">{activeItem.item.description || 'No description provided.'}</p>
                                    </div>
                                </div>
                                <div className="detail-section">
                                    <div className="detail-field">
                                        <label className="detail-label">Status</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                                            <span className={`status-badge ${activeItem.item.status.toLowerCase().replace(/ /g, '-')}`}>
                                                {activeItem.item.status}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {activeItem.item.status === 'WAITING FOR POSTING' && view !== 'company' && (
                                        <button
                                            className="btn-mark-posted"
                                            style={{ width: '100%', marginTop: '24px', padding: '16px', fontSize: '16px' }}
                                            onClick={() => handleMarkPosted(activeItem.item.id)}
                                            disabled={postingId === activeItem.item.id}
                                        >
                                            {postingId === activeItem.item.id ? 'Posting...' : 'Mark as Posted'}
                                        </button>
                                    )}

                                    {view === 'company' && (() => {
                                        const flows: any = {
                                            'Reel': ['PENDING', 'CONTENT NOT STARTED', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
                                            'YouTube': ['PENDING', 'CONTENT NOT STARTED', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
                                            'Post': ['PENDING', 'CONTENT NOT STARTED', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED', 'WAITING FOR APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED']
                                        };
                                        const flow = flows[activeItem.item.content_type] || [];
                                        const currentIdx = flow.indexOf(activeItem.item.status);
                                        const nextStatus = flow[currentIdx + 1];
                                        const isSpecialStatus = activeItem.item.status === 'SHOOT DONE' || activeItem.item.status === 'POSTED';

                                        if (!nextStatus || isSpecialStatus) return null;

                                        return (
                                            <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                                <label className="detail-label">Advance to Next Step</label>
                                                <textarea 
                                                    placeholder="Add a note (optional)..."
                                                    value={statusNote}
                                                    onChange={(e) => setStatusNote(e.target.value)}
                                                    style={{ width: '100%', padding: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', marginBottom: '12px', resize: 'none', height: '60px' }}
                                                />
                                                <button 
                                                    className="btn-mark-posted"
                                                    style={{ width: '100%', padding: '12px', background: 'var(--accent)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                                    onClick={async () => {
                                                        try {
                                                            await postingApi.updateStatus(activeItem.item.id, nextStatus, statusNote.trim() || undefined);
                                                            const d = new Date(); d.setDate(d.getDate() - 7);
                                                            const res = await postingApi.getContentDetails(activeItem.item.id, d.toISOString());
                                                            setActiveItem(res.data);
                                                            setStatusNote('');
                                                            fetchMasterCalendar();
                                                        } catch (err) { alert('Failed to update status'); }
                                                    }}
                                                >
                                                    Advance to {nextStatus}
                                                    <ChevronRight size={18} />
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div style={{ marginTop: '32px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <label className="detail-label" style={{ marginBottom: 0 }}>Status History</label>
                                    <button 
                                        onClick={handleUndoStatus}
                                        style={{ 
                                            display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', 
                                            background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', 
                                            border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', 
                                            fontSize: '11px', fontWeight: 700, cursor: 'pointer' 
                                        }}
                                    >
                                        <Undo2 size={12} />
                                        Undo Last Step
                                    </button>
                                </div>
                                <div className="history-timeline" style={{ marginTop: '16px' }}>
                                    {activeItem.history?.map((h: any, i: number) => (
                                        <div key={i} className="history-item" style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent)', marginTop: '4px' }}></div>
                                            <div>
                                                <p style={{ fontWeight: 600, fontSize: '14px' }}>{h.old_status} → {h.new_status}</p>
                                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                    {h.users?.name || 'System'} • {format(parseISO(h.changed_at), 'MMM d, h:mm a')}
                                                </p>
                                                {h.note && <p style={{ fontSize: '13px', fontStyle: 'italic', marginTop: '4px' }}>"{h.note}"</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className="posting-toast">
                    <CheckCircle2 size={20} />
                    {toast}
                </div>
            )}
        </div>
    );
}
