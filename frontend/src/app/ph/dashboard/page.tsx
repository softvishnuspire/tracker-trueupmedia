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
    Clock,
    ShieldAlert,
    ArrowRight,
    CalendarClock,
    Undo2
} from 'lucide-react';
import { phApi, emergencyApi, settingsApi } from '@/lib/api';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';
import './ph.css';

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
    assigned_to?: string;
    employee_task_status?: 'PENDING' | 'COMPLETED';
}

export default function ProductionHeadDashboard() {
    const [view, setView] = useState<'dashboard' | 'client' | 'master' | 'company'>('dashboard');
    const [queue, setQueue] = useState<ContentItem[]>([]);
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
    const [todayStats, setTodayStats] = useState({ total: 0, completed: 0, percentage: 0, remaining: 0 });
    const [weekStats, setWeekStats] = useState({ total: 0, completed: 0, percentage: 0 });
    const [emergencyTasks, setEmergencyTasks] = useState<ContentItem[]>([]);
    const [dayTasks, setDayTasks] = useState<ContentItem[]>([]);
    const [showCompanyCalendar, setShowCompanyCalendar] = useState(true);
    const [employees, setEmployees] = useState<any[]>([]);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }
            console.log('PH Dashboard Session User:', session.user);
            setUser(session.user);
        };
        checkUser();
    }, []);

    const getPeriodLabel = () => {
        return format(currentMonth, 'MMMM yyyy');
    };

    const isDayInPeriod = (date: Date) => {
        return isSameMonth(date, currentMonth);
    };

    const fetchTodayStats = async () => {
        try {
            const res = await phApi.getMasterCalendar(format(new Date(), 'yyyy-MM'), undefined, undefined);
            const data = res.data as ContentItem[];
            const today = new Date();
            const todayItems = data.filter(item => 
                isSameDay(parseISO(item.scheduled_datetime), today) && 
                ['Reel', 'YouTube'].includes(item.content_type)
            );
            const totalToday = todayItems.length;
            const completedToday = todayItems.filter(item => item.status === 'SHOOT DONE' || item.status === 'POSTED').length;
            
            setTodayStats({
                total: totalToday,
                completed: completedToday,
                remaining: totalToday - completedToday,
                percentage: totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0
            });

            // Calculate Weekly Stats
            const startOfWk = startOfWeek(new Date(), { weekStartsOn: 1 });
            const endOfWk = endOfWeek(new Date(), { weekStartsOn: 1 });
            const weekItems = data.filter(item => {
                const d = parseISO(item.scheduled_datetime);
                return d >= startOfWk && d <= endOfWk && ['Reel', 'YouTube'].includes(item.content_type);
            });
            const totalWeek = weekItems.length;
            const completedWeek = weekItems.filter(item => item.status === 'SHOOT DONE' || item.status === 'POSTED').length;
            setWeekStats({
                total: totalWeek,
                completed: completedWeek,
                percentage: totalWeek > 0 ? Math.round((completedWeek / totalWeek) * 100) : 0
            });

            // Fetch all emergency tasks (filtered for PH - usually backend does this but let's be safe)
            const emergencyRes = await emergencyApi.getAll();
            setEmergencyTasks(emergencyRes.data.filter((i: any) => i.content_type !== 'Post'));
        } catch (err) { console.error('Error fetching today stats:', err); }
    };

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUser(user);
        };
        fetchUser();
        fetchClients();
        fetchTodayStats();

        // Fetch settings for feature toggles
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
        fetchSettings();
    }, []);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await phApi.getEmployees();
                setEmployees(res.data);
            } catch (err) {
                console.error('Error fetching employees:', err);
            }
        };
        fetchEmployees();
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
            const res = await phApi.getClients();
            setClients(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchTodayQueue = async () => {
        setLoading(true);
        try {
            const res = await phApi.getToday();
            setQueue(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchClientCalendar = async () => {
        if (selectedClient === 'all') return;
        setLoading(true);
        try {
            const currentMonthStr = format(currentMonth, 'yyyy-MM');
            const res = await phApi.getCalendar(selectedClient, currentMonthStr, undefined, true);
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
            const res = await phApi.getMasterCalendar(currentMonthStr, selectedClient === 'all' ? undefined : selectedClient, undefined, asOfDate);
            setCalendarData(res.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleMarkShootDone = async (id: string) => {
        setActionId(id);
        try {
            const actorId = user?.id;
            await phApi.updateStatus(id, 'SHOOT DONE', actorId);
            setToast('Shoot marked as DONE!');
            setTimeout(() => setToast(null), 3000);
            
            await Promise.all([
                fetchTodayStats(),
                fetchTodayQueue(),
                view === 'client' ? fetchClientCalendar() : Promise.resolve(),
                view === 'master' ? fetchMasterCalendar() : Promise.resolve()
            ]);
            
            if (activeItem?.item?.id === id) {
                const res = await phApi.getContentDetails(id);
                setActiveItem(res.data);
            }
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to mark as shoot done');
        } finally { setActionId(null); }
    };

    const handleUndo = async (id: string) => {
        setActionId(id);
        try {
            await phApi.undoStatus(id);
            setToast('Reverted to Content Approved');
            setTimeout(() => setToast(null), 3000);
            
            await Promise.all([
                fetchTodayStats(),
                fetchTodayQueue(),
                view === 'client' ? fetchClientCalendar() : Promise.resolve(),
                view === 'master' ? fetchMasterCalendar() : Promise.resolve()
            ]);

            if (activeItem?.item?.id === id) {
                const res = await phApi.getContentDetails(id);
                setActiveItem(res.data);
            }
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to undo status');
        } finally { setActionId(null); }
    };

    const handleUndoStatus = async () => {
        if (!activeItem) return;
        if (!window.confirm('Are you sure you want to undo the last status change?')) return;
        try {
            await phApi.undoStatus(activeItem.item.id);
            let asOfDate;
            if (view === 'company') {
                const d = new Date(); d.setDate(d.getDate() - 7);
                asOfDate = d.toISOString();
            }
            const res = await phApi.getContentDetails(activeItem.item.id, asOfDate);
            setActiveItem(res.data);
            fetchMasterCalendar();
            fetchTodayQueue();
        } catch (err) {
            console.error(err);
            alert('Failed to undo status change. It might be because there is no more history to undo.');
        }
    };

    const handleAssignEmployee = async (employeeId: string) => {
        if (!activeItem) return;
        try {
            await phApi.assignEmployee(activeItem.item.id, employeeId || null as any);
            const res = await phApi.getContentDetails(activeItem.item.id);
            setActiveItem(res.data);
            setToast('Employee assignment updated');
            setTimeout(() => setToast(null), 3000);
            
            // Refresh calendars/queue to reflect potential changes
            if (view === 'dashboard') fetchTodayQueue();
            else if (view === 'master' || view === 'company') fetchMasterCalendar();
            else if (view === 'client') fetchClientCalendar();
            
        } catch (err) {
            console.error(err);
            alert('Failed to assign employee');
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

            const res = await phApi.getContentDetails(item.id, asOfDate);
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
            const res = await phApi.getContentDetails(nextTask.id, asOfDate);
            setActiveItem(res.data);
        } catch (err) { console.error(err); }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
    });

    const monthTotal = calendarData.filter(i => ['Reel', 'YouTube'].includes(i.content_type)).length;
    const monthCompleted = calendarData.filter(i => (i.status === 'SHOOT DONE' || i.status === 'POSTED') && ['Reel', 'YouTube'].includes(i.content_type)).length;
    const monthPercentage = monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0;

    return (
        <div className="dashboard-container">
            <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 2100 }}>
                <NotificationBell />
            </div>

            {isSidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
            )}

            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="logo-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src="/logo.png" alt="TrueUp Media" className="logo-img" style={{ height: '28px', width: 'auto' }} />
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>PRODUCTION</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="sidebar-close" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 sidebar-nav">
                    <p className="sidebar-label">Navigation</p>
                    <div onClick={() => setView('dashboard')} className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}>
                        <LayoutDashboard size={20} />
                        <span>Shoot Queue</span>
                    </div>
                    <div onClick={() => setView('client')} className={`nav-item ${view === 'client' ? 'active' : ''}`}>
                        <CalendarIcon size={20} />
                        <span>Client Production</span>
                    </div>
                    <div onClick={() => setView('master')} className={`nav-item ${view === 'master' ? 'active' : ''}`}>
                        <Globe size={20} />
                        <span>Master Schedule</span>
                    </div>
                    {showCompanyCalendar && (
                        <div onClick={() => setView('company')} className={`nav-item ${view === 'company' ? 'active' : ''}`}>
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
                                {clients.map(c => (
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gridColumn: '1 / -1', marginBottom: '4px' }}>
                        <span className="sidebar-label" style={{ margin: 0, padding: 0 }}>Appearance</span>
                        <ThemeToggle style={{ width: '28px', height: '28px', borderRadius: '8px' }} />
                    </div>
                    <div className="user-info-box">
                        <div className="user-avatar" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white' }}>PH</div>
                        <div style={{ minWidth: 0 }}>
                            <p className="user-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Production Head</p>
                            <p className="user-role">Shoot & Logistics</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="logout-btn" title="Sign Out">
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <div className="mobile-header-top">
                    <div className="menu-toggle" onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></div>
                    <img src="/logo.png" alt="TrueUp Media" style={{ height: '24px', width: 'auto' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><NotificationBell /></div>
                </div>

                <header className="page-header">
                    <div className="header-content">
                        <div className="header-info">
                            <h1 className="page-title">
                                {view === 'dashboard' && "Today's Shoot Queue"}
                                {view === 'client' && 'Client Production'}
                                {view === 'master' && 'Master Production Schedule'}
                                {view === 'company' && 'Company Calendar'}
                            </h1>
                            <p className="page-subtitle">
                                {view === 'dashboard' && `${format(new Date(), 'EEEE, MMMM d')} — Content approved for shooting`}
                                {view === 'client' && 'Manage shoot schedule for individual clients'}
                                {view === 'master' && 'Review company-wide production pipeline'}
                                {view === 'company' && 'Historical view of production schedule (-7 days)'}
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

                            {(view === 'master' || view === 'company') && (
                                <div className="master-filters-container">
                                    <div className="filter-icon-box"><Filter size={14} /></div>
                                    <div className="client-dropdown-wrapper">
                                        <select className="client-dropdown" value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
                                            <option value="all">All Clients</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
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
                            <div className="progress-meter-card">
                                <h3 className="stat-label">Today's Shoots</h3>
                                <div className="progress-values">
                                    <span className="current">{todayStats.completed}</span>
                                    <span className="separator">/</span>
                                    <span className="total">{todayStats.total}</span>
                                    <span className="unit">Shoots</span>
                                </div>
                                <div className="meter-labels">
                                    <span className="percentage">{todayStats.percentage}% Done</span>
                                </div>
                            </div>
                            <div className="progress-meter-card">
                                <h3 className="stat-label">Week's Production</h3>
                                <div className="progress-values">
                                    <span className="current">{weekStats.completed}</span>
                                    <span className="separator">/</span>
                                    <span className="total">{weekStats.total}</span>
                                    <span className="unit">Shoots</span>
                                </div>
                                <div className="meter-labels">
                                    <span className="percentage">{weekStats.percentage}% Done</span>
                                </div>
                            </div>
                            <div className="progress-meter-card">
                                <h3 className="stat-label">Monthly Pipeline</h3>
                                <div className="progress-values">
                                    <span className="current">{monthCompleted}</span>
                                    <span className="separator">/</span>
                                    <span className="total">{monthTotal}</span>
                                    <span className="unit">Items</span>
                                </div>
                                <div className="meter-labels">
                                    <span className="percentage">{monthPercentage}% Shot</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'dashboard' && emergencyTasks.length > 0 && (
                    <div className="emergency-panel">
                        <div className="emergency-panel-header">
                            <ShieldAlert size={24} color="#ef4444" />
                            <h2 className="emergency-panel-title">Urgent Shoots</h2>
                        </div>
                        <div className="emergency-list">
                            {emergencyTasks.map(task => (
                                <div key={task.id} className="emergency-card" onClick={() => handleItemClick(task)}>
                                    <div className="emergency-card-icon"><Video size={20} /></div>
                                    <div className="emergency-card-body">
                                        <div className="emergency-card-client">{task.clients?.company_name.toUpperCase()}</div>
                                        <div className="emergency-card-details">
                                            <span className="type">{task.content_type}</span>
                                            <span className="dot">•</span>
                                            <span className="time">{format(parseISO(task.scheduled_datetime), 'h:mm a')}</span>
                                        </div>
                                    </div>
                                    <div className="emergency-card-arrow"><ArrowRight size={18} /></div>
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
                                    <h3 className="card-title">Live Shoot Queue</h3>
                                    <span className="card-badge">Production Mode</span>
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
                                        <h3>No Shoots Pending</h3>
                                        <p>Great job! All content for today has been processed.</p>
                                    </div>
                                ) : (
                                    <div className="posting-queue">
                                        {queue.map(item => (
                                            <div key={item.id} className={`queue-item ${item.status === 'SHOOT DONE' || item.status === 'POSTED' ? 'is-posted' : ''}`}>
                                                <div className="queue-item-left" onClick={() => handleItemClick(item)}>
                                                    <div className="queue-time-badge">
                                                        <span className="time-text">{format(parseISO(item.scheduled_datetime), 'hh:mm')}</span>
                                                        <span className="ampm-text">{format(parseISO(item.scheduled_datetime), 'a')}</span>
                                                    </div>
                                                    <div className="queue-item-info">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span className="queue-item-client">{item.clients?.company_name}</span>
                                                            {(item.status === 'SHOOT DONE' || item.status === 'POSTED') && <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />}
                                                        </div>
                                                        <span className="queue-item-title">{item.title}</span>
                                                    </div>
                                                </div>
                                                <div className="queue-item-right">
                                                    <span className={`queue-type-badge ${item.content_type.toLowerCase()}`}>
                                                        <Video size={12} />
                                                        {item.content_type}
                                                    </span>
                                                    {item.status === 'SHOOT DONE' ? (
                                                        <button className="btn-rollback" onClick={() => handleUndo(item.id)} disabled={actionId === item.id} title="Revert to Content Approved">
                                                            {actionId === item.id ? '...' : 'Undo'}
                                                        </button>
                                                    ) : item.status === 'POSTED' ? (
                                                        <span className="status-badge posted">Posted</span>
                                                    ) : (
                                                        <button className="btn-mark-posted" style={{ background: 'var(--accent)' }} onClick={() => handleMarkShootDone(item.id)} disabled={actionId === item.id}>
                                                            {actionId === item.id ? 'Saving...' : 'Mark Shoot Done'}
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
                                        <Skeleton className="h-4 w-4 mb-2" /><Skeleton className="h-4 w-full" />
                                    </div>
                                ))
                            ) : (
                                days.map((day, idx) => {
                                    const dayContent = calendarData.filter(item => isSameDay(parseISO(item.scheduled_datetime), day));
                                    return (
                                        <div key={idx} onClick={() => { if (dayContent.length > 0) handleItemClick(dayContent[0]); }} className={`calendar-day ${!isDayInPeriod(day) ? 'other-month' : ''} ${isSameDay(day, new Date()) ? 'today' : ''}`} style={{ minHeight: '110px', cursor: dayContent.length > 0 ? 'pointer' : 'default' }}>
                                            <span className="day-number">{format(day, 'd')}</span>
                                            <div className="day-items desktop-only">
                                                {dayContent.map(item => (
                                                    <div key={item.id} onClick={(e) => { e.stopPropagation(); handleItemClick(item); }} className={`content-item ${item.content_type.toLowerCase()} ${item.is_emergency ? 'emergency' : ''}`}>
                                                        <Video size={10} />
                                                        <span className="truncate">{(view === 'master' || view === 'company') ? `[${item.clients?.company_name?.substring(0, 3)}] ` : ''}{item.title}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mobile-day-indicators">
                                                {dayContent.map(item => <div key={item.id} className={`mobile-dot ${item.content_type.toLowerCase()} ${item.is_emergency ? 'emergency' : ''}`}></div>)}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </main>

            {isDetailsOpen && activeItem && (
                <div className="modal-overlay" onClick={() => setIsDetailsOpen(false)}>
                    <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span className={`status-badge ${activeItem.item.status.toLowerCase().replace(/ /g, '-')}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                                        {activeItem.item.status}
                                    </span>
                                    {dayTasks.length > 1 && (
                                        <span className="task-counter" style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase' }}>
                                            • Task {dayTasks.findIndex(t => t.id === activeItem.item.id) + 1} of {dayTasks.length}
                                        </span>
                                    )}
                                </div>
                                <h3 className="modal-title">{activeItem.item.title}</h3>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {dayTasks.length > 1 && (
                                    <div className="task-nav-buttons" style={{ display: 'flex', gap: '4px', marginRight: '8px', paddingRight: '12px', borderRight: '1px solid var(--border)' }}>
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
                                        <div className="date-item"><Clock size={16} /><span className="date-display">{format(parseISO(activeItem.item.scheduled_datetime), 'PPP p')}</span></div>
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
                                            <span className={`status-badge ${activeItem.item.status.toLowerCase().replace(/ /g, '-')}`}>{activeItem.item.status}</span>
                                        </div>
                                    </div>

                                    <div className="detail-field" style={{ marginTop: '20px' }}>
                                        <label className="detail-label">Employee Assignment</label>
                                        <div style={{ position: 'relative', marginTop: '8px' }}>
                                            <select 
                                                className="client-dropdown" 
                                                style={{ width: '100%', paddingRight: '32px' }}
                                                value={activeItem.item.assigned_to || ''} 
                                                onChange={(e) => handleAssignEmployee(e.target.value)}
                                            >
                                                <option value="">Unassigned</option>
                                                {employees.map(emp => (
                                                    <option key={emp.user_id} value={emp.user_id}>{emp.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                                        </div>
                                        {activeItem.item.assigned_to && (
                                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Task Status:</span>
                                                <span className={`status-badge ${activeItem.item.employee_task_status?.toLowerCase() || 'pending'}`} style={{ fontSize: '10px' }}>
                                                    {activeItem.item.employee_task_status || 'PENDING'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {activeItem.item.status === 'CONTENT APPROVED' && view !== 'company' && (
                                        <button className="btn-mark-posted" style={{ width: '100%', marginTop: '24px', padding: '16px', fontSize: '16px', background: 'var(--accent)' }} onClick={() => handleMarkShootDone(activeItem.item.id)} disabled={actionId === activeItem.item.id}>
                                            {actionId === activeItem.item.id ? 'Saving...' : 'Mark Shoot Done'}
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
                                                            await phApi.updateStatus(activeItem.item.id, nextStatus, statusNote.trim() || undefined);
                                                            const d = new Date(); d.setDate(d.getDate() - 7);
                                                            const res = await phApi.getContentDetails(activeItem.item.id, d.toISOString());
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
                                    <label className="detail-label" style={{ marginBottom: 0 }}>Production History</label>
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
                                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{h.users?.name || 'System'} • {format(parseISO(h.changed_at), 'MMM d, h:mm a')}</p>
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

            {toast && (
                <div className="posting-toast"><CheckCircle2 size={20} />{toast}</div>
            )}
        </div>
    );
}
