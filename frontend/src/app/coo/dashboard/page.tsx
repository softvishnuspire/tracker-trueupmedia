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
    Calendar
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
import { getClientAbbreviation, getISTDate } from '@/lib/utils';
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

    const handleItemClick = (item: ContentItem) => {
        // Redirect to calendar details directly
        router.push(`/coo/master-calendar?taskId=${item.id}`);
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
