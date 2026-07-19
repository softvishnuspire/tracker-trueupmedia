'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    parseISO,
    subDays,
    startOfDay,
    endOfDay,
    subMonths,
    addMonths
} from 'date-fns';
import {
    LayoutDashboard,
    Globe,
    Users,
    Activity,
    FileText,
    Video,
    Film,
    Filter,
    ChevronDown,
    Plus,
    Clock,
    ShieldAlert,
    ArrowRight,
    MessageSquare,
    Calendar,
    X,
    AlertTriangle,
    Undo2,
    Loader2,
    Check,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import {
    gmApi,
    cooApi,
    emergencyApi,
    dashboardApi,
    adminApi,
    tlApi,
    ContentItem,
    PocNote,
    Client,
    ContentDetails,
    settingsApi
} from '@/lib/api';
import { getClientAbbreviation, getISTDate, formatIST } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import { Skeleton } from '@/components/ui/skeleton';
import ScheduleExport from '@/components/ScheduleExport';
import FreelancerTaskModal from '@/components/FreelancerTaskModal';
import { isCrossMonthRescheduled, get15BiMonthlyPeriod } from '@/utils/calendarUtils';
import './coo.css';

export default function CooDashboard() {
    const DISPLAY_OFFSET_DAYS = 7;
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>('');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [calendarData, setCalendarData] = useState<ContentItem[]>([]);
    const [globalCalendarData, setGlobalCalendarData] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [emergencyTasks, setEmergencyTasks] = useState<ContentItem[]>([]);
    const [pendingTasks, setPendingTasks] = useState<ContentItem[]>([]);
    const [pocNotes, setPocNotes] = useState<PocNote[]>([]);
    const [showCompanyCalendar, setShowCompanyCalendar] = useState(true);

    const shootDoneStatuses = [
        'SHOOT DONE',
        'EDITING IN PROGRESS',
        'EDITED',
        'WAITING FOR FINAL APPROVAL',
        'APPROVED',
        'WAITING FOR POSTING',
        'POSTED'
    ];

    const contentApprovedStatuses = [
        'CONTENT READY',
        'WAITING FOR APPROVAL',
        'CONTENT APPROVED',
        'SHOOT DONE',
        'EDITING IN PROGRESS',
        'EDITED',
        'WAITING FOR FINAL APPROVAL',
        'APPROVED',
        'WAITING FOR POSTING',
        'POSTED',
        'DESIGNING IN PROGRESS',
        'DESIGNING COMPLETED'
    ];

    const router = useRouter();
    const supabase = createClient();

    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isFreelancerModalOpen, setIsFreelancerModalOpen] = useState(false);

    const getDisplayDate = (scheduledDateTime: string) => subDays(getISTDate(scheduledDateTime), DISPLAY_OFFSET_DAYS);
    const getCalendarItemDate = (item: ContentItem) =>
        showCompanyCalendar ? getDisplayDate(item.scheduled_datetime) : getISTDate(item.scheduled_datetime);

    const selectedClientData = clients.find(c => c.id === selectedClient);
    const isBiMonthlyView = selectedClient && selectedClient !== 'all' && selectedClientData?.batch_type === '15-15';

    const { periodStart, periodEnd } = isBiMonthlyView
        ? get15BiMonthlyPeriod(currentMonth)
        : { periodStart: startOfMonth(currentMonth), periodEnd: endOfMonth(currentMonth) };

    const isDayInPeriod = (day: Date): boolean => {
        if (!isBiMonthlyView) return isSameMonth(day, currentMonth);
        return day >= startOfDay(periodStart) && day <= endOfDay(periodEnd);
    };

    const fetchClientCalendar = useCallback(async (clientId: string) => {
        if (!clientId) return [];
        try {
            const client = clients.find(c => c.id === clientId);
            const is1515 = client?.batch_type === '15-15';

            let data = [];
            if (is1515) {
                const isSecondHalf = currentMonth.getDate() >= 15;
                const startMonth = isSecondHalf ? currentMonth : subMonths(currentMonth, 1);
                const endMonth = isSecondHalf ? addMonths(currentMonth, 1) : currentMonth;

                // local helper functions to avoid global function dependency
                const formatMonth = (d: Date) => format(d, 'yyyy-MM');
                
                const [resStart, resEnd] = await Promise.all([
                    gmApi.getCalendar(clientId, formatMonth(startMonth)),
                    gmApi.getCalendar(clientId, formatMonth(endMonth))
                ]);
                data = [...(resStart.data || []), ...(resEnd.data || [])];
            } else {
                data = (await gmApi.getCalendar(clientId, format(currentMonth, 'yyyy-MM'))).data || [];
            }
            return data;
        } catch (error) {
            console.error('Error fetching client calendar:', error);
            return [];
        }
    }, [currentMonth, clients]);

    const fetchMasterCalendar = useCallback(async () => {
        try {
            const monthStr = format(currentMonth, 'yyyy-MM');
            const res = await gmApi.getMasterCalendar(
                monthStr,
                selectedClient === 'all' ? undefined : selectedClient
            );
            return res.data || [];
        } catch (error) {
            console.error('Error fetching master calendar:', error);
            return [];
        }
    }, [currentMonth, selectedClient]);

    const fetchGlobalData = useCallback(async () => {
        try {
            const res = await gmApi.getMasterCalendar(format(currentMonth, 'yyyy-MM'));
            setGlobalCalendarData(res.data || []);
        } catch (err) {
            console.error("Error fetching global data:", err);
        }
    }, [currentMonth]);

    const fetchPocNotes = useCallback(async () => {
        try {
            const clientId = selectedClient === 'all' ? undefined : selectedClient;
            const res = await gmApi.getPocNotes(format(currentMonth, 'yyyy-MM'), undefined, clientId);
            setPocNotes(res.data || []);
        } catch (err) {
            console.error('Error fetching POC notes:', err);
        }
    }, [currentMonth, selectedClient]);

    const fetchDashboardStats = useCallback(async () => {
        setLoading(true);
        try {
            let calendarData = [];
            if (selectedClient && selectedClient !== 'all') {
                calendarData = await fetchClientCalendar(selectedClient);
            } else {
                calendarData = await fetchMasterCalendar();
            }

            setCalendarData(calendarData);

            // Fetch all dashboard lists
            const [emergencyRes, pendingRes] = await Promise.all([
                emergencyApi.getAll(),
                dashboardApi.getPendingImportant()
            ]);

            setEmergencyTasks(emergencyRes.data || []);
            setPendingTasks(pendingRes.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [selectedClient, fetchClientCalendar, fetchMasterCalendar]);

    const fetchClients = useCallback(async () => {
        try {
            const res = await gmApi.getClients();
            setClients(res.data);
            if (res.data.length > 0 && !selectedClient) {
                setSelectedClient(res.data[0].id);
            }
        } catch (err) {
            console.error('Error fetching clients:', err);
        }
    }, [selectedClient]);

    useEffect(() => {
        fetchClients();
        const fetchUserEffect = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                const { data: profile } = await supabase
                    .from('users')
                    .select('role, role_identifier')
                    .eq('user_id', user.id)
                    .single();
                
                const role = profile?.role_identifier || profile?.role || user.user_metadata?.role;
                setUserRole(role?.toUpperCase());
            }
        };
        fetchUserEffect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supabase]);

    useEffect(() => {
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
        if (clients.length > 0) {
            fetchDashboardStats();
            fetchPocNotes();
        }
        fetchGlobalData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedClient, currentMonth, clients.length]);

    const [selectedItem, setSelectedItem] = useState<ContentDetails | null>(null);
    const [dayTasks, setDayTasks] = useState<ContentItem[]>([]);
    const [statusNote, setStatusNote] = useState('');
    const [actionId, setActionId] = useState<string | null>(null);

    const handleItemClick = async (item: ContentItem) => {
        try {
            const res = await cooApi.getContentDetails(item.id);
            const fetchedItem = res.data.item;
            
            // Find all tasks on the same day
            const day = getCalendarItemDate(fetchedItem);
            const tasksOnDay = calendarData.filter(i => isSameDay(getCalendarItemDate(i), day));
            
            if (!tasksOnDay.some(t => t.id === fetchedItem.id)) {
                tasksOnDay.push(fetchedItem);
            }
            
            tasksOnDay.sort((a, b) => new Date(a.scheduled_datetime).getTime() - new Date(b.scheduled_datetime).getTime());
            
            setDayTasks(tasksOnDay);
            setSelectedItem(res.data);
            setStatusNote('');
        } catch (err) {
            console.error(err);
        }
    };

    const navigateToTask = async (direction: 'next' | 'prev') => {
        if (!selectedItem || dayTasks.length <= 1) return;
        
        const currentIndex = dayTasks.findIndex(t => t.id === selectedItem.item.id);
        let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        
        if (nextIndex < 0) nextIndex = dayTasks.length - 1;
        if (nextIndex >= dayTasks.length) nextIndex = 0;
        
        const nextTask = dayTasks[nextIndex];
        try {
            const res = await cooApi.getContentDetails(nextTask.id);
            setSelectedItem(res.data);
            setStatusNote('');
        } catch (err) { console.error(err); }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!selectedItem) return;
        const targetId = selectedItem.item.id;
        setActionId(`status-${targetId}`);
        const currentNote = statusNote;
        try {
            await cooApi.updateStatus(targetId, newStatus, currentNote.trim() || undefined);
            const res = await cooApi.getContentDetails(targetId);
            setSelectedItem(res.data);
            setStatusNote('');
            fetchDashboardStats();
        } catch (err) {
            console.error(err);
        } finally {
            setActionId(null);
        }
    };

    const handleUndoStatus = async () => {
        if (!selectedItem) return;
        if (!window.confirm('Are you sure you want to undo the last status change?')) return;
        const targetId = selectedItem.item.id;
        setActionId(`undo-${targetId}`);
        try {
            await cooApi.undoStatus(targetId);
            const res = await cooApi.getContentDetails(targetId);
            setSelectedItem(res.data);
            fetchDashboardStats();
        } catch (err) {
            console.error(err);
        } finally {
            setActionId(null);
        }
    };

    const globalMonthCounts = globalCalendarData.filter(item => {
        const itemDate = parseISO(item.scheduled_datetime);
        return isSameMonth(itemDate, currentMonth) && !isCrossMonthRescheduled(item);
    }).reduce(
        (acc, item) => {
            const status = (item.status || '').toUpperCase();
            const type = (item.content_type || '').toUpperCase();
            const isShot = shootDoneStatuses.includes(status);
            const isDone = status === 'POSTED' || status === 'WAITING FOR POSTING' || status === 'COMPLETED' || status === 'SCHEDULED';
            
            acc.totalItems += 1;
            if (status === 'POSTED') acc.posted += 1;
            if (contentApprovedStatuses.includes(status)) acc.contentApproved += 1;
            if (status === 'DESIGNING IN PROGRESS') acc.designingInProgress += 1;

            if (type === 'REEL' || type === 'YOUTUBE') {
                acc.totalReels += 1;
                if (isShot) acc.shotReels += 1;
                if (isDone) acc.doneReels += 1;
            } else if (type === 'POST') {
                acc.totalPosts += 1;
                if (isShot) acc.shotPosts += 1;
                if (isDone) acc.donePosts += 1;
            }
            return acc;
        },
        { 
            totalReels: 0, totalPosts: 0, shotReels: 0, shotPosts: 0, doneReels: 0, donePosts: 0,
            totalItems: 0, posted: 0, contentApproved: 0, designingInProgress: 0
        }
    );

    const monthStatusCounts = calendarData.filter(item => isDayInPeriod(getCalendarItemDate(item)) && !isCrossMonthRescheduled(item)).reduce(
        (acc, item) => {
            const status = (item.status || '').toUpperCase();
            const type = (item.content_type || '').toUpperCase();
            const isShot = shootDoneStatuses.includes(status);
            const isDone = status === 'POSTED' || status === 'WAITING FOR POSTING' || status === 'COMPLETED' || status === 'SCHEDULED';
            
            acc.total += 1;
            if (isDone) acc.completed += 1;
            if (status === 'POSTED') acc.posted += 1;
            if (contentApprovedStatuses.includes(status)) acc.contentApproved += 1;
            if (status === 'DESIGNING IN PROGRESS') acc.designingInProgress += 1;

            acc.statusCounts[status] = (acc.statusCounts[status] || 0) + 1;

            if (type === 'REEL' || type === 'YOUTUBE') {
                acc.reels += 1;
                if (isDone) acc.completedReels += 1;
                if (isShot) acc.shootDone += 1;
            } else if (type === 'POST') {
                acc.posts += 1;
                if (isDone) acc.completedPosts += 1;
                if (isShot) acc.shotPosts += 1;
            }

            return acc;
        },
        { 
            total: 0, completed: 0, reels: 0, posts: 0, 
            completedReels: 0, completedPosts: 0, 
            shootDone: 0, contentApproved: 0,
            statusCounts: {} as Record<string, number>,
            posted: 0, designingInProgress: 0, shotPosts: 0
        }
    );

    const activeStats = {
        totalItems: globalMonthCounts.totalItems,
        totalReels: globalMonthCounts.totalReels,
        totalPosts: globalMonthCounts.totalPosts,
        shotReels: globalMonthCounts.shotReels,
        shotPosts: globalMonthCounts.shotPosts,
        doneReels: globalMonthCounts.doneReels,
        donePosts: globalMonthCounts.donePosts,
        posted: globalMonthCounts.posted,
        contentApproved: globalMonthCounts.contentApproved,
        designingInProgress: globalMonthCounts.designingInProgress
    };

    const activeClientPocNotes = pocNotes
        .filter(note => selectedClient === 'all' || note.client_id === selectedClient)
        .sort((a, b) => new Date(b.note_date).getTime() - new Date(a.note_date).getTime())
        .slice(0, 5);

    return (
        <div className="dashboard-view" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <header className="page-header page-header-safe">
                <div className="header-content">
                    <div className="header-info">
                        <h1 className="page-title">Dashboard Overview</h1>
                        <p className="page-subtitle">Monitor operational health and pipeline metrics</p>
                    </div>

                    <div className="header-controls">
                        {(userRole === 'ADMIN' || userRole === 'COO' || userRole === 'GM' || userRole === 'GENERAL MANAGER' || userRole === 'PRODUCTION HEAD' || userRole === 'PH') && (
                            <button 
                                onClick={() => setIsFreelancerModalOpen(true)}
                                className="month-btn"
                                style={{ 
                                    background: 'linear-gradient(135deg, var(--accent) 0%, #4f46e5 100%)', 
                                    color: 'white',
                                    border: 'none',
                                    marginLeft: '8px',
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                                title="Create Freelancer Task"
                            >
                                <Plus size={18} />
                                <span>Create Freelancer Task</span>
                            </button>
                        )}

                        <ScheduleExport
                            data={calendarData}
                            clientName={selectedClient === 'all' ? 'TrueUp Media' : selectedClientData?.company_name || 'Client'}
                            month={currentMonth}
                        />
                    </div>
                </div>
            </header>

            {/* Premium Stats Grid - Decoupled Global View */}
            <div className="premium-stats-grid" style={{ marginTop: '12px', marginBottom: '24px' }}>
                {/* Monthly Pipeline */}
                <div className="premium-stat-card pipeline">
                    <div className="card-accent-line"></div>
                    <div className="card-top">
                        <div className="label-group">
                            <span className="stat-label">MONTHLY PIPELINE</span>
                        </div>
                        <LayersIcon size={20} className="stat-icon" />
                    </div>
                    <div className="card-main">
                        <div className="value-group">
                            <span className="main-value">{activeStats.shotReels + activeStats.shotPosts}</span>
                            <span className="separator">/</span>
                            <span className="total-value">{activeStats.totalReels + activeStats.totalPosts}</span>
                            <span className="unit">ITEMS</span>
                        </div>
                    </div>
                    <div className="card-footer">
                        <div className="percentage-info">
                            <span className="pct-value">{Math.round(((activeStats.shotReels + activeStats.shotPosts) / (activeStats.totalReels + activeStats.totalPosts || 1)) * 100)}%</span>
                            <span className="pct-label">Shot</span>
                        </div>
                        <div className="progress-track">
                            <div 
                                className="progress-fill" 
                                style={{ width: `${((activeStats.shotReels + activeStats.shotPosts) / (activeStats.totalReels + activeStats.totalPosts || 1)) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Reels Progress */}
                <div className="premium-stat-card reels">
                    <div className="card-accent-line"></div>
                    <div className="card-top">
                        <div className="label-group">
                            <span className="stat-label">REELS PROGRESS</span>
                        </div>
                        <Video size={20} className="stat-icon" />
                    </div>
                    <div className="card-main">
                        <div className="value-group">
                            <span className="main-value">{activeStats.doneReels}</span>
                            <span className="separator">/</span>
                            <span className="total-value">{activeStats.totalReels}</span>
                            <span className="unit">REELS</span>
                        </div>
                    </div>
                    <div className="card-footer">
                        <div className="percentage-info">
                            <span className="pct-value">{Math.round((activeStats.doneReels / (activeStats.totalReels || 1)) * 100)}%</span>
                            <span className="pct-label">Done</span>
                        </div>
                        <div className="progress-track">
                            <div 
                                className="progress-fill" 
                                style={{ width: `${(activeStats.doneReels / (activeStats.totalReels || 1)) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Posts Progress */}
                <div className="premium-stat-card posts">
                    <div className="card-accent-line"></div>
                    <div className="card-top">
                        <div className="label-group">
                            <span className="stat-label">POSTS PROGRESS</span>
                        </div>
                        <FileText size={20} className="stat-icon" />
                    </div>
                    <div className="card-main">
                        <div className="value-group">
                            <span className="main-value">{activeStats.donePosts}</span>
                            <span className="separator">/</span>
                            <span className="total-value">{activeStats.totalPosts}</span>
                            <span className="unit">POSTS</span>
                        </div>
                    </div>
                    <div className="card-footer">
                        <div className="percentage-info">
                            <span className="pct-value">{Math.round((activeStats.donePosts / (activeStats.totalPosts || 1)) * 100)}%</span>
                            <span className="pct-label">Done</span>
                        </div>
                        <div className="progress-track">
                            <div 
                                className="progress-fill" 
                                style={{ width: `${(activeStats.donePosts / (activeStats.totalPosts || 1)) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Shoots Done */}
                <div className="premium-stat-card shoots">
                    <div className="card-accent-line"></div>
                    <div className="card-top">
                        <div className="label-group">
                            <span className="stat-label">SHOOTS DONE</span>
                        </div>
                        <Film size={20} className="stat-icon" />
                    </div>
                    <div className="card-main">
                        <div className="value-group">
                            <span className="main-value">{activeStats.shotReels}</span>
                            <span className="separator">/</span>
                            <span className="total-value">{activeStats.totalReels}</span>
                            <span className="unit">SHOOTS</span>
                        </div>
                    </div>
                    <div className="card-footer">
                        <div className="percentage-info">
                            <span className="pct-value">{Math.round((activeStats.shotReels / (activeStats.totalReels || 1)) * 100)}%</span>
                            <span className="pct-label">Shot</span>
                        </div>
                        <div className="progress-track">
                            <div 
                                className="progress-fill" 
                                style={{ width: `${(activeStats.shotReels / (activeStats.totalReels || 1)) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            <FreelancerTaskModal 
                isOpen={isFreelancerModalOpen}
                onClose={() => setIsFreelancerModalOpen(false)}
                onSuccess={() => fetchDashboardStats()}
            />

            <div className="unified-dashboard">
                {/* Unified Header with Integrated Filter */}
                <div className="dashboard-card unified-main-card">
                    <div className="unified-card-header">
                        <div className="header-text">
                            <h2 className="card-title">Operational Command Center</h2>
                            <p className="card-subtitle">Real-time health and production flow monitoring</p>
                        </div>
                        <div className="header-actions">
                            <div className="client-filter-box">
                                <Filter size={16} className="filter-icon" />
                                <select
                                    className="client-select-dropdown"
                                    value={selectedClient}
                                    onChange={(e) => setSelectedClient(e.target.value)}
                                >
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.company_name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="select-chevron" />
                            </div>
                        </div>
                    </div>

                    {/* Operational Command Center Content */}
                    <div className="unified-body-grid">
                        {/* Left Panel: POC Activity & Status Hub */}
                        <div className="unified-progress-panel">
                            <div className="panel-section">
                                <div className="section-header">
                                    <div className="icon-badge">
                                        <MessageSquare size={12} />
                                    </div>
                                    <h4 className="section-label">POC COMMUNICATION</h4>
                                </div>
                                
                                <div className="poc-feed-compact">
                                    {activeClientPocNotes.length > 0 ? (
                                        activeClientPocNotes.map((note, idx) => (
                                            <div key={note.id || idx} className="poc-feed-item">
                                                <div className="note-meta">
                                                    <span className="note-author">{note.users?.name?.split(' ')[0] || 'TL'}</span>
                                                    <span className="note-date">{format(parseISO(note.note_date), 'MMM d')}</span>
                                                </div>
                                                <p className="note-text">{note.note_text}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="poc-empty-state">
                                            <p>No recent notes</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="panel-divider"></div>

                            <div className="panel-section">
                                <div className="section-header">
                                    <div className="icon-badge">
                                        <Activity size={12} />
                                    </div>
                                    <h4 className="section-label">TASK LIFECYCLE</h4>
                                </div>
                                
                                 <div className="lifecycle-list">
                                     {(() => {
                                         const periodItems = calendarData.filter(item => isDayInPeriod(getCalendarItemDate(item)));
                                         const flows: Record<string, string[]> = {
                                             'REEL': [
                                                 'PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED',
                                                 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
                                             ],
                                             'YOUTUBE': [
                                                 'PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED',
                                                 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
                                             ],
                                             'POST': [
                                                 'PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED',
                                                 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
                                             ]
                                         };

                                         const milestones = ['CONTENT APPROVED', 'WAITING FOR FINAL APPROVAL', 'POSTED'];

                                         return milestones.map(milestone => {
                                             let numerator = 0;
                                             let denominator = 0;

                                             periodItems.forEach(item => {
                                                 const type = (item.content_type || '').toUpperCase();
                                                 const status = (item.status || '').toUpperCase();
                                                 const flow = flows[type] || flows['REEL'];

                                                 const milestoneIdx = flow.indexOf(milestone);
                                                 if (milestoneIdx !== -1) {
                                                     denominator += 1;
                                                     const statusIdx = flow.indexOf(status);
                                                     if (statusIdx >= milestoneIdx) {
                                                         numerator += 1;
                                                     }
                                                 }
                                             });

                                             const pct = denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

                                             return (
                                                 <div key={milestone} className="lifecycle-item">
                                                     <div className="lifecycle-info">
                                                         <span className="lifecycle-name">{milestone}</span>
                                                         <span className="lifecycle-count">{numerator} / {denominator}</span>
                                                     </div>
                                                     <div className="lifecycle-bar-bg">
                                                         <div 
                                                             className="lifecycle-bar-fill" 
                                                             style={{ width: `${pct}%` }}
                                                         ></div>
                                                     </div>
                                                 </div>
                                             );
                                         });
                                     })()}
                                 </div>
                            </div>

                            <div className="panel-actions-vertical">
                                <button onClick={() => router.push('/coo/team')} className="action-btn-hub">
                                    <Users size={14} />
                                    <span>Manage Teams</span>
                                </button>
                                <button onClick={() => router.push('/coo/master-calendar')} className="action-btn-hub">
                                    <Globe size={14} />
                                    <span>Master Calendar</span>
                                </button>
                            </div>
                        </div>

                        {/* Right Panel: Detailed Pipeline */}
                        <div className="unified-pipeline-panel">
                            <div className="pipeline-header">
                                <h4 className="panel-title">Production Progress</h4>
                                <span className="live-tag">LIVE</span>
                            </div>
                            
                            <div className="unified-status-list">
                                {/* Shoot Done Progress */}
                                <div className="unified-pipeline-item">
                                    <div className="item-meta">
                                        <span className="status-label">SHOOT DONE</span>
                                        <span className="status-count">{monthStatusCounts.shootDone} / {monthStatusCounts.reels}</span>
                                    </div>
                                    <div className="status-bar-bg">
                                        <div className="status-bar-fill" style={{ width: `${monthStatusCounts.reels > 0 ? Math.round((monthStatusCounts.shootDone / monthStatusCounts.reels) * 100) : 0}%`, background: '#06b6d4' }}></div>
                                    </div>
                                </div>

                                {/* Monthly Pipeline */}
                                <div className="unified-pipeline-item">
                                    <div className="item-meta">
                                        <span className="status-label">MONTHLY PIPELINE</span>
                                        <span className="status-count">{monthStatusCounts.completedReels + monthStatusCounts.completedPosts} / {monthStatusCounts.reels + monthStatusCounts.posts}</span>
                                    </div>
                                    <div className="status-bar-bg">
                                        <div className="status-bar-fill" style={{ width: `${(monthStatusCounts.reels + monthStatusCounts.posts) > 0 ? Math.round(((monthStatusCounts.completedReels + monthStatusCounts.completedPosts) / (monthStatusCounts.reels + monthStatusCounts.posts)) * 100) : 0}%` }}></div>
                                    </div>
                                </div>

                                {/* Total Reels */}
                                <div className="unified-pipeline-item">
                                    <div className="item-meta">
                                        <span className="status-label">TOTAL REELS</span>
                                        <span className="status-count">{monthStatusCounts.completedReels} / {monthStatusCounts.reels}</span>
                                    </div>
                                    <div className="status-bar-bg">
                                        <div className="status-bar-fill" style={{ width: `${monthStatusCounts.reels > 0 ? Math.round((monthStatusCounts.completedReels / monthStatusCounts.reels) * 100) : 0}%`, background: '#a855f7' }}></div>
                                    </div>
                                </div>

                                {/* Total Posts */}
                                <div className="unified-pipeline-item">
                                    <div className="item-meta">
                                        <span className="status-label">TOTAL POSTS</span>
                                        <span className="status-count">{monthStatusCounts.completedPosts} / {monthStatusCounts.posts}</span>
                                    </div>
                                    <div className="status-bar-bg">
                                        <div className="status-bar-fill" style={{ width: `${monthStatusCounts.posts > 0 ? Math.round((monthStatusCounts.completedPosts / monthStatusCounts.posts) * 100) : 0}%`, background: '#3b82f6' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Emergency Panels */}
                {emergencyTasks.length > 0 && (
                    <div className="emergency-panel" style={{ marginTop: '24px' }}>
                        <div className="emergency-panel-header">
                            <ShieldAlert size={24} color="#ef4444" />
                            <h2 className="emergency-panel-title">Emergency Tasks</h2>
                        </div>
                        <div className="emergency-list">
                            {emergencyTasks.map((task: ContentItem) => (
                                <div key={task.id} className="emergency-card" onClick={() => handleItemClick(task)}>
                                    <div className="emergency-card-icon">
                                        {task.content_type === 'Post' ? <FileText size={20} /> : <Video size={20} />}
                                    </div>
                                    <div className="emergency-card-info">
                                        <p className="emergency-card-client">{task.clients?.company_name}</p>
                                        <p className="emergency-card-type">{(task.content_type === 'Special Poster' || task.content_type === 'Special Day Poster' ? '🎉 ' : '') + task.content_type} • {format(parseISO(task.scheduled_datetime), 'h:mm a')}</p>
                                    </div>
                                    <ArrowRight size={18} color="var(--text-muted)" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {pendingTasks.length > 0 && (
                    <div className="emergency-panel" style={{ marginTop: '24px', borderColor: 'var(--accent)' }}>
                        <div className="emergency-panel-header">
                            <Clock size={24} color="var(--accent)" />
                            <h2 className="emergency-panel-title">Pending Important Tasks</h2>
                        </div>
                        <div className="emergency-list">
                            {pendingTasks.map((task: ContentItem) => (
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
                                            <p className="emergency-card-type">{(task.content_type === 'Special Poster' || task.content_type === 'Special Day Poster' ? '🎉 ' : '') + task.content_type} • {format(parseISO(task.scheduled_datetime), 'MMM d, h:mm a')}</p>
                                            <span style={{ fontSize: '10px', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>{task.status}</span>
                                        </div>
                                    </div>
                                    <ArrowRight size={18} color="var(--text-muted)" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {selectedItem && (
                <div className="modal-overlay">
                    <div className="modal-content modal-lg">
                        <div className="modal-header">
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                    <span className={`type-badge ${selectedItem.item.content_type.toLowerCase()}`}>
                                        {selectedItem.item.content_type === 'Special Poster' || selectedItem.item.content_type === 'Special Day Poster' ? '🎉 ' + selectedItem.item.content_type : selectedItem.item.content_type}
                                    </span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>•</span>
                                    {selectedItem.item.clients?.company_name && (
                                        <Link href={`/coo/client-calendar/${selectedItem.item.client_id}`} className="client-link-hover">
                                            {selectedItem.item.clients?.company_name}
                                        </Link>
                                    )}
                                    {selectedItem.item.clients?.team_lead?.name && (
                                        <>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>•</span>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 500 }}>
                                                TL: {selectedItem.item.clients.team_lead.name}
                                            </span>
                                        </>
                                    )}
                                    {dayTasks.length > 1 && (
                                        <>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>•</span>
                                            <span className="task-counter" style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase' }}>
                                                Task {dayTasks.findIndex(t => t.id === selectedItem.item.id) + 1} of {dayTasks.length}
                                            </span>
                                        </>
                                    )}
                                </div>
                                <h3 className="modal-title">{selectedItem.item.title || (selectedItem.item.content_type === 'Special Poster' || selectedItem.item.content_type === 'Special Day Poster' ? '🎉 ' + selectedItem.item.content_type : selectedItem.item.content_type)}</h3>
                                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)', marginTop: '4px' }}>
                                    Team Lead: {selectedItem.item.clients?.team_lead?.name || 'Not Assigned'}
                                </p>
                                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)', marginTop: '2px' }}>
                                    Assigned To: {selectedItem.item.assigned_employee ? `${selectedItem.item.assigned_employee.name} ${selectedItem.item.assigned_employee.role_identifier ? `(${selectedItem.item.assigned_employee.role_identifier})` : ''}` : 'Not Assigned'}
                                </p>
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
                                <button onClick={() => setSelectedItem(null)} className="modal-close"><X size={20}/></button>
                            </div>
                        </div>

                        <div className="detail-grid" style={{ padding: '32px' }}>
                            <div className="detail-info">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                        {selectedItem.item.is_rescheduled && selectedItem.item.original_scheduled_datetime ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', gridColumn: 'span 1' }}>
                                                <div>
                                                    <label className="detail-label">Calendar Date</label>
                                                    <div className="date-item">
                                                        <Calendar size={14} />
                                                        <span className="date-display">
                                                            Actual Date: {formatIST(getDisplayDate(selectedItem.item.original_scheduled_datetime), 'dd/MM/yyyy')} rescheduled to {formatIST(getDisplayDate(selectedItem.item.scheduled_datetime), 'dd/MM/yy')}
                                                        </span>
                                                    </div>
                                                </div>
                                                {selectedItem.item.reschedule_history && selectedItem.item.reschedule_history.length > 0 && (
                                                    <div style={{ padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border)', width: '100%' }}>
                                                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Reschedule History</span>
                                                        {selectedItem.item.reschedule_history.map((h: any, idx: number) => (
                                                            <div key={idx} style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
                                                                <span>{idx + 1}.</span>
                                                                <span>{formatIST(getDisplayDate(h.from), 'dd/MM/yyyy')}</span>
                                                                <span>➔</span>
                                                                <span>{formatIST(getDisplayDate(h.to), 'dd/MM/yy')}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="detail-label">Calendar Date</label>
                                                <div className="date-item">
                                                    <Calendar size={14} />
                                                    <span className="date-display">{format(getDisplayDate(selectedItem.item.scheduled_datetime), 'MMM d, yyyy')}</span>
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <label className="detail-label">Posting Time</label>
                                            <div className="date-item">
                                                <Clock size={14} />
                                                <span className="date-display">{formatIST(selectedItem.item.scheduled_datetime, 'hh:mm a')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="detail-label">Workflow Status (Historical)</label>
                                <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
                                    <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '4px' }}>Current Status</p>
                                    <p style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)' }}>{selectedItem.item.status}</p>
                                </div>

                                {(() => {
                                    const flows: any = {
                                        Reel: ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
                                        YouTube: ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'],
                                        Post: ['PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED']
                                    };
                                    const flow = flows[selectedItem.item.content_type] || [];
                                    const currentIdx = flow.indexOf(selectedItem.item.status);
                                    const nextStatus = flow[currentIdx + 1];
                                    const isSpecialStatus = selectedItem.item.status === 'POSTED';

                                    if (!nextStatus || isSpecialStatus) return null;

                                    return (
                                        <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                            <label className="detail-label">Advance to Next Step</label>
                                            <textarea
                                                placeholder="Add a note (optional)..."
                                                value={statusNote}
                                                onChange={(e) => setStatusNote(e.target.value)}
                                                style={{ width: '100%', padding: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', marginBottom: '12px', resize: 'none', height: '60px' }}
                                            />
                                            <button
                                                onClick={() => handleStatusUpdate(nextStatus)}
                                                disabled={actionId !== null}
                                                style={{ width: '100%', padding: '12px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                                            >
                                                {actionId === `status-${selectedItem.item.id}` ? (
                                                    <>
                                                        Advancing...
                                                        <Loader2 size={16} className="spinner-btn-icon" />
                                                    </>
                                                ) : (
                                                    <>
                                                        Advance to {nextStatus}
                                                        <ChevronRight size={18} />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })()}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label className="detail-label" style={{ marginBottom: 0 }}>Activity Log</label>
                                    <button 
                                        onClick={handleUndoStatus} 
                                        disabled={actionId !== null}
                                        className="btn-undo" 
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' }}
                                    >
                                        {actionId === `undo-${selectedItem.item.id}` ? (
                                            <Loader2 size={14} className="spinner-btn-icon" />
                                        ) : (
                                            <Undo2 size={14} />
                                        )}
                                        Undo Last Action
                                    </button>
                                </div>
                                <div style={{ marginTop: '24px', position: 'relative', paddingLeft: '12px', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{
                                        position: 'absolute', left: '23px', top: '12px', bottom: '12px',
                                        width: '2px', background: 'linear-gradient(to bottom, #10b981 0%, var(--border) 100%)', opacity: 0.3, zIndex: 1
                                    }}></div>
                                    {(() => {
                                        const flows: any = {
                                            Reel: [
                                                'PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED',
                                                'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
                                            ],
                                            YouTube: [
                                                'PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED',
                                                'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
                                            ],
                                            Post: [
                                                'PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED',
                                                'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
                                            ]
                                        };
                                        const flow = flows[selectedItem.item.content_type] || [];
                                        const currentStatus = selectedItem.item.status;
                                        const currentIdx = flow.indexOf(currentStatus);

                                        return flow.map((status: string, idx: number) => {
                                            const isCompleted = idx < currentIdx || currentStatus === 'POSTED';
                                            const isCurrent = idx === currentIdx && currentStatus !== 'POSTED';
                                            const historyEntry = selectedItem.history.find((h: any) => h.new_status === status);

                                            return (
                                                <div key={status} style={{
                                                    display: 'flex', alignItems: 'flex-start', gap: '20px',
                                                    paddingBottom: idx === flow.length - 1 ? 0 : '32px',
                                                    position: 'relative', zIndex: 2
                                                }}>
                                                    <div style={{
                                                        width: '24px', height: '24px', borderRadius: '50%',
                                                        background: isCompleted ? '#10b981' : isCurrent ? 'var(--accent)' : 'var(--bg-surface)',
                                                        border: `2px solid ${isCompleted ? '#10b981' : isCurrent ? 'var(--accent)' : '#ef4444'}`,
                                                        flexShrink: 0, marginTop: '2px', display: 'flex',
                                                        alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        {isCompleted ? (
                                                            <Check size={14} color="white" strokeWidth={3} />
                                                        ) : isCurrent ? (
                                                            <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%' }}></div>
                                                        ) : (
                                                            <div style={{ width: '6px', height: '6px', background: '#ef4444', borderRadius: '50%' }}></div>
                                                        )}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <span style={{
                                                            fontSize: isCurrent ? '15px' : '14px', fontWeight: 800,
                                                            color: isCompleted ? '#10b981' : isCurrent ? 'var(--text-primary)' : '#ef4444',
                                                            letterSpacing: '0.02em'
                                                        }}>{status}</span>
                                                        {historyEntry && (
                                                            <div style={{
                                                                display: 'flex', flexDirection: 'column', marginTop: '6px',
                                                                padding: '10px 14px', background: 'rgba(255, 255, 255, 0.03)',
                                                                borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)'
                                                            }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                        {historyEntry.users?.role_identifier || historyEntry.users?.name || 'Updated'}
                                                                    </span>
                                                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                        {format(parseISO(historyEntry.changed_at), 'MMM d, HH:mm')}
                                                                    </span>
                                                                </div>
                                                                {historyEntry.note && (
                                                                    <div style={{
                                                                        marginTop: '8px', padding: '8px 12px',
                                                                        background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px',
                                                                        fontSize: '12px', color: 'var(--text-secondary)',
                                                                        fontStyle: 'italic', borderLeft: '3px solid var(--accent)'
                                                                    }}>
                                                                        "{historyEntry.note}"
                                                                    </div>
                                                                )}
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
        </div>
    );
}

// Simple wrapper icon component to avoid importing all of lucide-react if not needed,
// but Layers is standard.
function LayersIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m12 3-10 5 10 5 10-5-10-5Z" />
            <path d="m2 17 10 5 10-5" />
            <path d="m2 12 10 5 10-5" />
        </svg>
    );
}
