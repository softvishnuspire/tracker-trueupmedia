'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
    parseISO,
    startOfDay,
    endOfDay
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
    Check,
    AlertTriangle,
    ShieldAlert,
    ArrowRight,
    CalendarClock,
    Undo2,
    Layers,
    Film,
    User as UserIcon,
    Phone,
    Mail,
    Search,
    Plus
} from 'lucide-react';
import { phApi, emergencyApi, dashboardApi, settingsApi, ContentItem } from '@/lib/api';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';
import FreelancerTaskModal from '@/components/FreelancerTaskModal';
import './ph.css';

// Using imported ContentItem from @/lib/api

export default function ProductionHeadDashboard() {
    const [view, setView] = useState<'dashboard' | 'client' | 'master' | 'company' | 'employees'>('dashboard');
    const [pendingTasks, setPendingTasks] = useState<ContentItem[]>([]);
    const [calendarData, setCalendarData] = useState<ContentItem[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const contentApprovedStatuses = ['CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED'];
    const shootDoneStatuses = ['SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'];
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
    const [todayStats, setTodayStats] = useState({ 
        total: 0, 
        completed: 0, 
        percentage: 0, 
        remaining: 0,
        pendingReels: 0,
        pendingPosts: 0,
        monthPosts: 0,
        monthReels: 0,
        monthShoots: 0,
        monthPending: 0,
        pendingShoots: 0
    });
    const [weekStats, setWeekStats] = useState({ total: 0, completed: 0, percentage: 0 });
    const [emergencyTasks, setEmergencyTasks] = useState<ContentItem[]>([]);
    const [dayTasks, setDayTasks] = useState<ContentItem[]>([]);
    const [showCompanyCalendar, setShowCompanyCalendar] = useState(true);
    const [employees, setEmployees] = useState<any[]>([]);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assigningToEmployee, setAssigningToEmployee] = useState<any>(null);
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [isFreelancerModalOpen, setIsFreelancerModalOpen] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);

    const router = useRouter();
    const supabase = createClient();

    const fetchClients = useCallback(async () => {
        try {
            const res = await phApi.getClients();
            setClients(res.data);
        } catch (err) { console.error(err); }
    }, []);

    const fetchEmployees = useCallback(async () => {
        try {
            const res = await phApi.getEmployees();
            setEmployees(res.data);
        } catch (err) { console.error('Error fetching employees:', err); }
    }, []);

    const fetchTodayStats = useCallback(async () => {
        try {
            const clientId = selectedClient === 'all' ? undefined : selectedClient;
            const res = await phApi.getMasterCalendar(format(new Date(), 'yyyy-MM'), clientId, undefined);
            const data = res.data as ContentItem[];
            const today = new Date();
            const todayItems = data.filter(item => 
                isSameDay(parseISO(item.scheduled_datetime), today)
            );
            const totalToday = todayItems.length;

            const completedToday = todayItems.filter(item => 
                shootDoneStatuses.includes((item.status || '').toUpperCase())
            ).length;
            
            setCalendarData(data);

            // Calculate Weekly Stats
            const startOfWk = startOfWeek(new Date(), { weekStartsOn: 1 });
            const endOfWk = endOfWeek(new Date(), { weekStartsOn: 1 });
            const weekItems = data.filter(item => {
                const d = parseISO(item.scheduled_datetime);
                return d >= startOfWk && d <= endOfWk;
            });
            const totalWeek = weekItems.length;
            const completedWeek = weekItems.filter(item => 
                shootDoneStatuses.includes((item.status || '').toUpperCase())
            ).length;
            setWeekStats({
                total: totalWeek,
                completed: completedWeek,
                percentage: totalWeek > 0 ? Math.round((completedWeek / totalWeek) * 100) : 0
            });

            // Fetch all dashboard lists
            const [emergencyRes, pendingRes] = await Promise.all([
                emergencyApi.getAll(),
                dashboardApi.getPendingImportant()
            ]);
            
            let allEmergency = emergencyRes.data || [];
            let allPending = pendingRes.data || [];

            // Client filtering for lists
            if (selectedClient !== 'all') {
                allEmergency = allEmergency.filter(t => t.client_id === selectedClient);
                allPending = allPending.filter(t => t.client_id === selectedClient);
            }
            
            setEmergencyTasks(allEmergency);
            setPendingTasks(allPending);

            const pReels = allPending.filter((t: ContentItem) => t.content_type === 'Reel').length;
            const pPosts = allPending.filter((t: ContentItem) => t.content_type === 'Post').length;
            const pShoots = allPending.filter((t: ContentItem) => t.content_type === 'Reel' || t.content_type === 'YouTube').length;

            // Monthly Totals
            const mPosts = data.filter(i => i.content_type === 'Post').length;
            const mReels = data.filter(i => i.content_type === 'Reel').length;
            const mShoots = data.filter(i => i.content_type === 'Reel' || i.content_type === 'YouTube').length;
            const mPending = data.filter(i => !shootDoneStatuses.includes((i.status || '').toUpperCase())).length;

            setTodayStats(prev => ({
                ...prev,
                total: totalToday,
                completed: completedToday,
                remaining: totalToday - completedToday,
                percentage: totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0,
                pendingReels: pReels,
                pendingPosts: pPosts,
                monthPosts: mPosts,
                monthReels: mReels,
                monthShoots: mShoots,
                monthPending: mPending,
                pendingShoots: pShoots
            }));
        } catch (err) { console.error('Error fetching dashboard lists:', err); }
    }, [selectedClient]);

    const selectedClientData = clients.find(c => c.id === selectedClient);
    const isBiMonthlyView = (view === 'client' || view === 'master') && selectedClient && selectedClient !== 'all' && selectedClientData?.batch_type === '15-15';

    const periodStart = isBiMonthlyView
        ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 15)
        : startOfMonth(currentMonth);

    const nextMonthDate = addMonths(currentMonth, 1);
    const periodEnd = isBiMonthlyView
        ? new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), 15)
        : endOfMonth(currentMonth);

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

    const fetchClientCalendar = useCallback(async () => {
        if (selectedClient === 'all') return;
        setLoading(true);
        try {
            const currentMonthStr = format(currentMonth, 'yyyy-MM');
            const res = await phApi.getCalendar(selectedClient, currentMonthStr, undefined, true);
            let data = res.data || [];
            
            const client = clients.find(c => c.id === selectedClient);
            if (client?.batch_type === '15-15') {
                const nextMonthStr = format(addMonths(currentMonth, 1), 'yyyy-MM');
                const nextRes = await phApi.getCalendar(selectedClient, nextMonthStr, undefined, true);
                data = [...data, ...(nextRes.data || [])];
            }
            
            setCalendarData(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [selectedClient, currentMonth, clients]);

    const fetchMasterCalendar = useCallback(async () => {
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
            let data = res.data || [];
            
            const client = clients.find(c => c.id === selectedClient);
            if (client?.batch_type === '15-15') {
                const nextMonthStr = format(addMonths(currentMonth, 1), 'yyyy-MM');
                const nextRes = await phApi.getMasterCalendar(nextMonthStr, selectedClient, undefined, asOfDate);
                data = [...data, ...(nextRes.data || [])];
            }
            
            setCalendarData(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [view, selectedClient, currentMonth, clients]);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                router.push('/');
                return;
            }
            console.log('PH Dashboard Session User:', session.user);
            setUser(session.user);
            
            // Fetch profile to get role
            const { data: profile } = await supabase
                .from('users')
                .select('role, role_identifier')
                .eq('user_id', session.user.id)
                .single();
            
            const role = profile?.role_identifier || profile?.role || session.user.user_metadata?.role;
            const upperRole = role?.toUpperCase();
            setUserRole(upperRole);
            
            const allowedRoles = ['PRODUCTION HEAD', 'PH', 'ADMIN', 'GM', 'GENERAL MANAGER'];
            if (upperRole && !allowedRoles.includes(upperRole)) {
                console.warn(`[RoleGuard] Access denied to /ph/dashboard for role: ${upperRole}`);
                router.push('/');
                return;
            }
            
            // Fetch employees for assignment
            fetchEmployees();
        };
        checkUser();
    }, [router, supabase, fetchEmployees]);


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
    }, [supabase.auth, fetchClients, fetchTodayStats]);


    useEffect(() => {
        if (view === 'dashboard') {
            fetchTodayStats();
        } else if (view === 'client' && selectedClient && selectedClient !== 'all') {
            fetchClientCalendar();
        } else if (view === 'master' || view === 'company') {
            fetchMasterCalendar();
        }
    }, [view, selectedClient, currentMonth, fetchTodayStats, fetchClientCalendar, fetchMasterCalendar]);

    const getEmployeeName = (id: string) => {
        if (!id) return 'Unassigned';
        const emp = employees.find(e => e.user_id === id);
        return emp ? emp.name : 'Unknown';
    };

    const handleAssignEmployee = async (userId: string) => {
        if (!activeItem) return;
        try {
            await phApi.assignEmployee(activeItem.item.id, userId);
            setToast('Assignment updated successfully');
            
            // Update local state
            const updatedItem = { ...activeItem.item, assigned_to: userId || null };
            if (userId) {
                const emp = employees.find(e => e.user_id === userId);
                updatedItem.assigned_employee = emp ? { name: emp.name } : undefined;
            } else {
                updatedItem.assigned_employee = undefined;
            }
            
            setActiveItem({ ...activeItem, item: updatedItem });
            setCalendarData(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
            setPendingTasks(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
        } catch (err: any) {
            console.error('Assignment error:', err);
            setToast(err.response?.data?.error || 'Failed to update assignment');
        }
    };

    const fetchTodayQueue = async () => {
        // Obsolete - fetching integrated into fetchTodayStats
    };


    const handleUpdateStatus = async (id: string, nextStatus: string) => {
        setActionId(id);
        try {
            const actorId = user?.id;
            await phApi.updateStatus(id, nextStatus, undefined, actorId);
            setToast(`Status updated to ${nextStatus}`);
            setTimeout(() => setToast(null), 3000);
            
            await Promise.all([
                fetchTodayStats(),
                view === 'client' ? fetchClientCalendar() : Promise.resolve(),
                view === 'master' ? fetchMasterCalendar() : Promise.resolve(),
                view === 'company' ? fetchMasterCalendar() : Promise.resolve()
            ]);
            
            if (activeItem?.item?.id === id) {
                const res = await phApi.getContentDetails(id);
                setActiveItem(res.data);
            }
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to update status');
        } finally { setActionId(null); }
    };

    const handleUndo = async (id: string) => {
        setActionId(id);
        try {
            await phApi.undoStatus(id);
            setToast('Status reverted');
            setTimeout(() => setToast(null), 3000);
            
            await Promise.all([
                fetchTodayStats(),
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


    const handleItemClick = async (item: ContentItem) => {
        try {
            const day = parseISO(item.scheduled_datetime);
            const sourceList = calendarData.length > 0 ? calendarData : [];
            const tasksOnDay = sourceList.filter(i => isSameDay(parseISO(i.scheduled_datetime), day));
            
            if (!tasksOnDay.some(t => t.id === item.id)) {
                tasksOnDay.push(item);
            }

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
        start: startOfWeek(periodStart, { weekStartsOn: 1 }),
        end: endOfWeek(periodEnd, { weekStartsOn: 1 })
    });

    const monthStatusCounts = calendarData.reduce(
        (acc, item) => {
            const normalizedStatus = (item.status || '').toUpperCase();
            const normalizedType = (item.content_type || '').toUpperCase();

            // Overall Pipeline
            acc.overallTotal += 1;
            if (shootDoneStatuses.includes(normalizedStatus)) {
                acc.overallCompleted += 1;
            }

            // Reels
            if (normalizedType === 'REEL') {
                acc.reelsTotal += 1;
                if (shootDoneStatuses.includes(normalizedStatus)) {
                    acc.reelsCompleted += 1;
                }
            }

            // Posts
            if (normalizedType === 'POST') {
                acc.postsTotal += 1;
                if (normalizedStatus === 'DESIGNING COMPLETED' || shootDoneStatuses.includes(normalizedStatus)) {
                    acc.postsCompleted += 1;
                }
            }

            // Shoots (Reels + YouTube)
            if (normalizedType === 'REEL' || normalizedType === 'YOUTUBE') {
                acc.shootsTotal += 1;
                if (shootDoneStatuses.includes(normalizedStatus)) {
                    acc.shootsCompleted += 1;
                }
            }

            // Legacy compatibility
            if (contentApprovedStatuses.includes(normalizedStatus)) acc.contentApproved += 1;
            if (normalizedStatus === 'POSTED') acc.posted += 1;

            return acc;
        },
        { 
            overallTotal: 0, overallCompleted: 0, 
            reelsTotal: 0, reelsCompleted: 0, 
            postsTotal: 0, postsCompleted: 0, 
            shootsTotal: 0, shootsCompleted: 0,
            contentApproved: 0, posted: 0 
        }
    );

    const monthPercentage = monthStatusCounts.overallTotal > 0 ? Math.round((monthStatusCounts.overallCompleted / monthStatusCounts.overallTotal) * 100) : 0;
    const reelsPercentage = monthStatusCounts.reelsTotal > 0 ? Math.round((monthStatusCounts.reelsCompleted / monthStatusCounts.reelsTotal) * 100) : 0;
    const postsPercentage = monthStatusCounts.postsTotal > 0 ? Math.round((monthStatusCounts.postsCompleted / monthStatusCounts.postsTotal) * 100) : 0;
    const shootsPercentage = monthStatusCounts.shootsTotal > 0 ? Math.round((monthStatusCounts.shootsCompleted / monthStatusCounts.shootsTotal) * 100) : 0;

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
                    <div onClick={() => setView('employees')} className={`nav-item ${view === 'employees' ? 'active' : ''}`}>
                        <UserIcon size={20} />
                        <span>Employee Management</span>
                    </div>

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
                            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {view === 'dashboard' && "Production Dashboard"}
                                {view === 'client' && (
                                    <>
                                        <span>Client Production</span>
                                        {selectedClient && selectedClient !== 'all' && (
                                            <span style={{ 
                                                fontSize: '14px', 
                                                background: 'rgba(99, 102, 241, 0.1)', 
                                                color: 'var(--accent)', 
                                                padding: '4px 12px', 
                                                borderRadius: '20px', 
                                                fontWeight: 700,
                                                border: '1px solid rgba(99, 102, 241, 0.2)'
                                            }}>
                                                Team Lead: {clients.find(c => c.id === selectedClient)?.team_lead?.name || 'Not Assigned'}
                                            </span>
                                        )}
                                    </>
                                )}
                                {view === 'master' && 'Master Production Schedule'}
                                {view === 'company' && 'Company Calendar'}
                                {view === 'employees' && 'Employee Management'}
                            </h1>
                            <p className="page-subtitle">
                                {view === 'dashboard' && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Clock size={16} className="text-accent" />
                                        {format(new Date(), 'EEEE, MMMM d')}
                                    </span>
                                )}
                                {view === 'client' && 'Manage shoot schedule for individual clients'}
                                {view === 'master' && 'Review company-wide production pipeline'}
                                {view === 'company' && 'Historical view of production schedule (-7 days)'}
                                {view === 'employees' && 'Assign and manage clients for individual employees'}
                            </p>

                        </div>

                        <div className="header-controls">
                            {view === 'dashboard' && (
                                <div className="client-dropdown-wrapper">
                                    <select className="client-dropdown" value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
                                        <option value="all">All Clients</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                                    </select>
                                    <ChevronDown size={16} className="dropdown-chevron" />
                                </div>
                            )}

                            {view === 'client' && (
                                <div className="client-dropdown-wrapper">
                                    <select className="client-dropdown" value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
                                        <option value="all">Select a client</option>
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
                                            <option value="freelancer">Freelancer Clients</option>
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

                            {(view === 'master' || view === 'company') && (userRole === 'ADMIN' || userRole === 'GM' || userRole === 'GENERAL MANAGER' || userRole === 'PRODUCTION HEAD' || userRole === 'PH') && (
                                <button 
                                    onClick={() => setIsFreelancerModalOpen(true)}
                                    className="month-btn"
                                    style={{ 
                                        background: 'linear-gradient(135deg, var(--accent) 0%, #4f46e5 100%)', 
                                        color: 'white',
                                        border: 'none',
                                        marginLeft: '8px',
                                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                                    }}
                                    title="Create Freelancer Task"
                                >
                                    <Plus size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                <FreelancerTaskModal 
                    isOpen={isFreelancerModalOpen}
                    onClose={() => setIsFreelancerModalOpen(false)}
                    onSuccess={() => fetchMasterCalendar()}
                />

                {view === 'dashboard' && (
                    <div className="daily-stats-banner" style={{ width: '100%' }}>
                        <div className="posting-stats-grid">
                            {/* Monthly Pipeline */}
                            <div className="progress-meter-card">
                                <div className="card-icon-overlay"><Layers size={24} /></div>
                                <h3 className="stat-label">Monthly Pipeline</h3>
                                <div className="progress-values">
                                    <span className="current">{monthStatusCounts.overallCompleted}</span>
                                    <span className="separator">/</span>
                                    <span className="total">{monthStatusCounts.overallTotal}</span>
                                    <span className="unit">Items</span>
                                </div>
                                <div className="meter-labels">
                                    <span className="percentage">{monthPercentage}% Shot</span>
                                    <div className="progress-bar-container">
                                        <div className="progress-bar-fill" style={{ width: `${monthPercentage}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Reels Progress */}
                            <div className="progress-meter-card" style={{ borderLeft: '4px solid #a855f7' }}>
                                <div className="card-icon-overlay"><Video size={24} style={{ color: '#a855f7' }} /></div>
                                <h3 className="stat-label">Reels Progress</h3>
                                <div className="progress-values">
                                    <span className="current" style={{ color: '#a855f7' }}>{monthStatusCounts.reelsCompleted}</span>
                                    <span className="separator">/</span>
                                    <span className="total">{monthStatusCounts.reelsTotal}</span>
                                    <span className="unit">Reels</span>
                                </div>
                                <div className="meter-labels">
                                    <span className="percentage">{reelsPercentage}% Done</span>
                                    <div className="progress-bar-container">
                                        <div className="progress-bar-fill" style={{ width: `${reelsPercentage}%`, background: 'linear-gradient(90deg, #a855f7, #c084fc)' }}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Posts Progress */}
                            <div className="progress-meter-card" style={{ borderLeft: '4px solid #6366f1' }}>
                                <div className="card-icon-overlay"><FileText size={24} style={{ color: '#6366f1' }} /></div>
                                <h3 className="stat-label">Posts Progress</h3>
                                <div className="progress-values">
                                    <span className="current" style={{ color: '#6366f1' }}>{monthStatusCounts.postsCompleted}</span>
                                    <span className="separator">/</span>
                                    <span className="total">{monthStatusCounts.postsTotal}</span>
                                    <span className="unit">Posts</span>
                                </div>
                                <div className="meter-labels">
                                    <span className="percentage">{postsPercentage}% Done</span>
                                    <div className="progress-bar-container">
                                        <div className="progress-bar-fill" style={{ width: `${postsPercentage}%`, background: 'linear-gradient(90deg, #6366f1, #818cf8)' }}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Shoot Done Progress */}
                            <div className="progress-meter-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                                <div className="card-icon-overlay"><Film size={24} style={{ color: '#f59e0b' }} /></div>
                                <h3 className="stat-label">Shoots Done</h3>
                                <div className="progress-values">
                                    <span className="current" style={{ color: '#f59e0b' }}>{monthStatusCounts.shootsCompleted}</span>
                                    <span className="separator">/</span>
                                    <span className="total">{monthStatusCounts.shootsTotal}</span>
                                    <span className="unit">Shoots</span>
                                </div>
                                <div className="meter-labels">
                                    <span className="percentage">{shootsPercentage}% Shot</span>
                                    <div className="progress-bar-container">
                                        <div className="progress-bar-fill" style={{ width: `${shootsPercentage}%`, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'dashboard' && (
                    <div className="emergency-panel">
                        <div className="emergency-panel-header">
                            <ShieldAlert size={24} color="#ef4444" />
                            <h2 className="emergency-panel-title">Emergency Tasks</h2>
                        </div>
                        <div className="emergency-list">
                            {emergencyTasks.length > 0 ? (
                                emergencyTasks.map(task => (
                                    <div 
                                        key={task.id} 
                                        className="emergency-card"
                                        onClick={() => handleItemClick(task)}
                                    >
                                        <div className="emergency-card-icon">
                                            {task.content_type === 'Post' ? <FileText size={20} /> : <Video size={20} />}
                                        </div>
                                        <div className="emergency-card-info">
                                            <p className="emergency-card-client">{task.clients?.company_name}</p>
                                            <p className="emergency-card-type">{task.content_type} • {format(parseISO(task.scheduled_datetime), 'h:mm a')}</p>
                                        </div>
                                        <ArrowRight size={18} color="var(--text-muted)" />
                                    </div>
                                ))
                            ) : (
                                <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic', padding: '10px' }}>No emergency tasks active.</p>
                            )}
                        </div>
                    </div>
                )}

                {view === 'dashboard' && (
                    <div className="emergency-panel" style={{ marginTop: '24px', borderColor: 'var(--accent)' }}>
                        <div className="emergency-panel-header">
                            <Clock size={24} color="var(--accent)" />
                            <h2 className="emergency-panel-title">Pending Important Tasks</h2>
                        </div>
                        <div className="emergency-list">
                            {pendingTasks.length > 0 ? (
                                pendingTasks.map(task => (
                                    <div 
                                        key={task.id} 
                                        className="emergency-card"
                                        onClick={() => handleItemClick(task)}
                                        style={{ borderLeftColor: 'var(--accent)' }}
                                    >
                                        <div className="emergency-card-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)' }}>
                                            {task.content_type === 'Post' ? <FileText size={20} /> : <Video size={20} />}
                                        </div>
                                        <div className="emergency-card-info">
                                            <p className="emergency-card-client">{task.clients?.company_name}</p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <p className="emergency-card-type">{task.content_type} • {format(parseISO(task.scheduled_datetime), 'MMM d, h:mm a')}</p>
                                                <span style={{ fontSize: '10px', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>{task.status}</span>
                                            </div>
                                        </div>
                                        <ArrowRight size={18} color="var(--text-muted)" />
                                    </div>
                                ))
                            ) : (
                                <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic', padding: '10px' }}>No pending tasks for today.</p>
                            )}
                        </div>
                    </div>
                )}



                {(view === 'client' || view === 'master' || view === 'company') && (
                    <div className="status-summary-row">
                        <div className="status-pill status-pill-reels">
                            <span className="status-pill-label">Reels</span>
                            <span className="status-pill-count">{monthStatusCounts.reelsTotal}</span>
                        </div>
                        <div className="status-pill status-pill-posts">
                            <span className="status-pill-label">Posts</span>
                            <span className="status-pill-count">{monthStatusCounts.postsTotal}</span>
                        </div>
                        <div className="status-pill status-pill-content-approved">
                            <span className="status-pill-label">Content Approved</span>
                            <span className="status-pill-count">{monthStatusCounts.contentApproved}</span>
                        </div>
                        <div className="status-pill status-pill-shoot-done">
                            <span className="status-pill-label">Shoot Done</span>
                            <span className="status-pill-count">{monthStatusCounts.shootsCompleted}</span>
                        </div>
                        <div className="status-pill status-pill-posted">
                            <span className="status-pill-label">Posted</span>
                            <span className="status-pill-count">{monthStatusCounts.posted}</span>
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
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
                                                            {item.content_type === 'Post' ? <FileText size={10} /> : <Video size={10} />}
                                                            <span className="truncate" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                {(view === 'master' || view === 'company') ? `[${item.freelancer_name ? item.freelancer_name.substring(0, 3).toUpperCase() : item.clients?.company_name?.substring(0, 3)}] ` : ''}
                                                                {item.content_type}
                                                                {item.assigned_to ? (
                                                                    <span className="assignment-badge assigned" title={`Assigned to ${getEmployeeName(item.assigned_to)}`} style={{ transform: 'scale(0.8)', padding: '2px 6px' }}>
                                                                        <span className="assignment-dot"></span>
                                                                        <span className="assignment-name">{getEmployeeName(item.assigned_to)}</span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="assignment-badge unassigned" title="Unassigned" style={{ transform: 'scale(0.8)', padding: '2px 6px' }}>
                                                                        <span className="assignment-dot"></span>
                                                                        <span className="assignment-name">Unassigned</span>
                                                                    </span>
                                                                )}
                                                            </span>
                                                            {['CONTENT READY', 'WAITING FOR APPROVAL', 'SHOOT DONE', 'EDITED', 'DESIGNING COMPLETED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'].includes(item.status) ? (
                                                                <Check size={10} style={{ color: '#10b981', flexShrink: 0 }} />
                                                            ) : (
                                                                <AlertTriangle size={10} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                                            )}
                                                        </div>
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

                {view === 'employees' && (
                    <div className="employees-view">
                        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '24px' }}>
                            {employees.map((emp: any) => {
                                const assignedClients = clients.filter(c => {
                                    if (emp.role_identifier === 'REEL') {
                                        return c.reel_employee_id === emp.user_id;
                                    } else if (emp.role_identifier === 'POST') {
                                        return c.post_employee_id === emp.user_id;
                                    } else {
                                        return c.employee_id === emp.user_id || c.reel_employee_id === emp.user_id || c.post_employee_id === emp.user_id;
                                    }
                                });
                                return (
                                    <div key={emp.user_id} className="employee-card-premium">
                                        <div className="employee-card-header">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                <div className="employee-avatar-large">
                                                    {emp.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="employee-card-name">
                                                        {emp.name} 
                                                        <span className="role-id-tag">({emp.role_identifier || 'EMP'})</span>
                                                    </h3>
                                                    <p className="employee-card-role">
                                                        {emp.role_identifier === 'REEL' ? 'REEL EDITOR' : emp.role_identifier === 'POST' ? 'POSTER EDITOR' : 'EMPLOYEE'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                className="btn-assign-client"
                                                onClick={() => {
                                                    setAssigningToEmployee(emp);
                                                    setIsAssignModalOpen(true);
                                                }}
                                            >
                                                <Plus size={16} />
                                                Assign Client
                                            </button>
                                        </div>

                                        <div className="assigned-clients-section">
                                            <h4 className="section-title">ASSIGNED CLIENTS ({assignedClients.length})</h4>
                                            <div className="client-tags-grid">
                                                {assignedClients.map(client => (
                                                    <div key={client.id} className="client-tag-pill">
                                                        <span>{client.company_name}</span>
                                                        <button 
                                                            className="remove-tag"
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (confirm(`Unassign ${client.company_name} from ${emp.name}?`)) {
                                                                    try {
                                                                        await phApi.assignEmployeeToClient(client.id, null, emp.user_id);
                                                                        // Refresh data
                                                                        const cRes = await phApi.getClients();
                                                                        setClients(cRes.data);
                                                                        fetchTodayStats();
                                                                        fetchMasterCalendar();
                                                                        fetchClientCalendar();
                                                                        setToast(`Unassigned ${client.company_name}`);
                                                                        setTimeout(() => setToast(null), 3000);
                                                                    } catch (err) {
                                                                        console.error(err);
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {assignedClients.length === 0 && (
                                                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', gridColumn: '1/-1' }}>No clients assigned yet.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>

            {isAssignModalOpen && assigningToEmployee && (
                <div className="modal-overlay" onClick={() => setIsAssignModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <div>
                                <h3 className="modal-title">Assign Client to {assigningToEmployee.name}</h3>
                                <p className="modal-subtitle">Select a client to enable auto-assignment for production tasks.</p>
                            </div>
                            <button onClick={() => setIsAssignModalOpen(false)} className="modal-close"><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="search-box" style={{ marginBottom: '20px', width: '100%' }}>
                                <Search size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Search clients..." 
                                    value={clientSearchTerm}
                                    onChange={(e) => setClientSearchTerm(e.target.value)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '14px', width: '100%' }} 
                                />
                            </div>
                            <div className="client-selection-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {clients
                                    .filter(c => c.company_name.toLowerCase().includes(clientSearchTerm.toLowerCase()))
                                    .map(client => {
                                        const isAlreadyAssigned = 
                                            assigningToEmployee.role_identifier === 'REEL' ? client.reel_employee_id === assigningToEmployee.user_id :
                                            assigningToEmployee.role_identifier === 'POST' ? client.post_employee_id === assigningToEmployee.user_id :
                                            client.employee_id === assigningToEmployee.user_id;

                                        return (
                                            <div 
                                                key={client.id} 
                                                className={`client-selection-item ${isAlreadyAssigned ? 'already-assigned' : ''}`}
                                                onClick={async () => {
                                                    if (isAlreadyAssigned) return;
                                                    console.log(`[Assign] Attempting to assign client ${client.id} to employee ${assigningToEmployee.user_id}`);
                                                    try {
                                                        const res = await phApi.assignEmployeeToClient(client.id, assigningToEmployee.user_id);
                                                        console.log('[Assign] Success:', res.data);
                                                        // Refresh data
                                                        const cRes = await phApi.getClients();
                                                        setClients(cRes.data);
                                                        fetchTodayStats();
                                                        fetchMasterCalendar();
                                                        fetchClientCalendar();
                                                        setToast(`Assigned ${client.company_name} to ${assigningToEmployee.name}`);
                                                        setTimeout(() => setToast(null), 3000);
                                                        setIsAssignModalOpen(false);
                                                    } catch (err: any) {
                                                        alert(err.response?.data?.error || 'Failed to assign client');
                                                    }
                                                }}
                                                style={{ 
                                                    padding: '12px 16px', 
                                                    borderRadius: '10px', 
                                                    cursor: isAlreadyAssigned ? 'default' : 'pointer',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: '8px',
                                                    background: isAlreadyAssigned ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-elevated)',
                                                    border: isAlreadyAssigned ? '1px solid var(--accent)' : '1px solid var(--border)',
                                                    opacity: isAlreadyAssigned ? 0.7 : 1
                                                }}
                                            >
                                                <span style={{ fontWeight: 600 }}>{client.company_name}</span>
                                                {(() => {
                                                    if (assigningToEmployee.role_identifier === 'REEL') {
                                                        if (client.reel_employee_id) {
                                                            const isCurrent = client.reel_employee_id === assigningToEmployee.user_id;
                                                            return (
                                                                <span style={{ fontSize: '11px', color: isCurrent ? 'var(--accent)' : 'var(--text-muted)' }}>
                                                                    {isCurrent ? 'Currently Assigned (Reel)' : `Reel Editor: ${employees.find((e: any) => e.user_id === client.reel_employee_id)?.name || 'Other'}`}
                                                                </span>
                                                            );
                                                        }
                                                        return <span style={{ fontSize: '11px', color: 'var(--success)' }}>Reel Editor Available</span>;
                                                    } else if (assigningToEmployee.role_identifier === 'POST') {
                                                        if (client.post_employee_id) {
                                                            const isCurrent = client.post_employee_id === assigningToEmployee.user_id;
                                                            return (
                                                                <span style={{ fontSize: '11px', color: isCurrent ? 'var(--accent)' : 'var(--text-muted)' }}>
                                                                    {isCurrent ? 'Currently Assigned (Post)' : `Poster Editor: ${employees.find((e: any) => e.user_id === client.post_employee_id)?.name || 'Other'}`}
                                                                </span>
                                                            );
                                                        }
                                                        return <span style={{ fontSize: '11px', color: 'var(--success)' }}>Poster Editor Available</span>;
                                                    } else {
                                                        if (client.employee_id) {
                                                            const isCurrent = client.employee_id === assigningToEmployee.user_id;
                                                            return (
                                                                <span style={{ fontSize: '11px', color: isCurrent ? 'var(--accent)' : 'var(--text-muted)' }}>
                                                                    {isCurrent ? 'Currently Assigned' : `Assigned to ${employees.find((e: any) => e.user_id === client.employee_id)?.name || 'Other'}`}
                                                                </span>
                                                            );
                                                        }
                                                        return <span style={{ fontSize: '11px', color: 'var(--success)' }}>Available</span>;
                                                    }
                                                })()}
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                                    <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent)' }}>
                                        Team Lead: {activeItem.item.clients?.team_lead?.name || 'Not Assigned'}
                                    </p>
                                    <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent)' }}>
                                        Assigned To: {activeItem.item.assigned_employee ? `${activeItem.item.assigned_employee.name} ${activeItem.item.assigned_employee.role_identifier ? `(${activeItem.item.assigned_employee.role_identifier})` : ''}` : 'Not Assigned'}
                                    </p>
                                </div>
                                {activeItem.item.freelancer_name && (
                                    <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                                        <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '8px' }}>Freelancer Details</p>
                                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                                <UserIcon size={14} className="text-muted" />
                                                <span style={{ fontWeight: 600 }}>{activeItem.item.freelancer_name}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                                <Phone size={14} className="text-muted" />
                                                <span style={{ fontWeight: 600 }}>{activeItem.item.freelancer_phone}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                                <Mail size={14} className="text-muted" />
                                                <span style={{ fontWeight: 600 }}>{activeItem.item.freelancer_email}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                                                {employees.map((emp: any) => (
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
                                    
                                    {(() => {
                                        const flows: any = {
                                            'Reel': ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
                                            'YouTube': ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
                                            'Post': ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED']
                                        };
                                        const flow = flows[activeItem.item.content_type] || [];
                                        const currentIdx = flow.indexOf(activeItem.item.status);
                                        const nextStatus = flow[currentIdx + 1];
                                        const limitIdx = flow.indexOf('APPROVED');

                                        if (!nextStatus || currentIdx >= limitIdx) return null;

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
                                                            let asOfDate;
                                                            if (view === 'company') {
                                                                const d = new Date(); d.setDate(d.getDate() - 7);
                                                                asOfDate = d.toISOString();
                                                            }
                                                            const res = await phApi.getContentDetails(activeItem.item.id, asOfDate);
                                                            setActiveItem(res.data);
                                                            setStatusNote('');
                                                            
                                                            // Refresh data
                                                            fetchTodayStats();
                                                            if (view === 'client') fetchClientCalendar();
                                                            else fetchMasterCalendar();
                                                        } catch (err: any) { 
                                                            console.error(err);
                                                            alert(err.response?.data?.error || 'Failed to update status'); 
                                                        }
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
                                        onClick={() => handleUndo(activeItem.item.id)}
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
                                <div className="timeline-container" style={{ marginTop: '16px' }}>
                                    <div className="timeline-line"></div>
                                    {(() => {
                                        const flows: any = {
                                            'Reel': ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
                                            'YouTube': ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
                                            'Post': ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED']
                                        };
                                        const flow = flows[activeItem.item.content_type] || [];
                                        const currentIdx = flow.indexOf(activeItem.item.status);

                                        return flow.map((status: string, idx: number) => {
                                            const isCompleted = idx < currentIdx || activeItem.item.status === 'POSTED';
                                            const isCurrent = idx === currentIdx && activeItem.item.status !== 'POSTED';
                                            const historyEntry = activeItem.history?.find((h: any) => h.new_status === status);

                                            return (
                                                <div key={status} className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                                                    <div className="step-indicator">
                                                        {isCompleted ? <Check size={14} /> : isCurrent ? <div className="current-dot" /> : null}
                                                    </div>
                                                    <div className="step-content">
                                                        <span className="step-title">{status}</span>
                                                        {historyEntry && (
                                                            <div className="step-meta">
                                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span className="step-user">{historyEntry.users?.role_identifier || historyEntry.users?.name || 'System'}</span>
                                                                    <span className="step-time">{format(parseISO(historyEntry.changed_at), 'MMM d, HH:mm')}</span>
                                                                </div>
                                                                {historyEntry.note && <p className="step-note">&quot;{historyEntry.note}&quot;</p>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
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
