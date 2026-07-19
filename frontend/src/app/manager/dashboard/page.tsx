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
    subDays,
    parseISO,
    isBefore,
    startOfDay,
    addDays,
    endOfDay,
    getDate
} from 'date-fns';
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Plus,
    LayoutDashboard,
    Globe,
    Users,
    Clock,
    FileText,
    Video,
    CheckCircle2,
    Calendar as CalendarIcon,
    X,
    ArrowRight,
    LogOut,
    Filter,
    Menu,
    Edit,
    Trash2,
    Check,
    CalendarClock,
    Undo2,
    AlertTriangle,
    ShieldAlert,
    Search,
    User as UserIcon,
    Phone,
    Mail,
    Layers,
    Film,
    MessageSquare,
    Activity,
    Circle,
    RefreshCcw,
    TrendingUp,
    Target,
    UserCircle2,
    Briefcase,
    Trophy,
    Download,
    Loader2
} from 'lucide-react';
import {
    gmApi,
    phApi,
    emergencyApi,
    dashboardApi,
    adminApi,
    tlApi,
    ContentItem,
    PocNote,
    StatusHistoryItem,
    Client,
    TeamMember,
    ContentDetails,
    settingsApi,
    TlTrackingStats,
    EmployeeTrackingStats
} from '@/lib/api';
import { downloadAllEmployeesReport, downloadEmployeeReport } from '@/utils/pdfExport';
import { getClientAbbreviation, formatIST, formatISTForm, convertISTToUTC, getISTDate } from '@/lib/utils';
import { isCrossMonthRescheduled, get15BiMonthlyPeriod } from '@/utils/calendarUtils';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/ToastProvider';
import { usePageLoading } from '@/components/ui/TopProgressBar';
import NotificationBell from '@/components/NotificationBell';
import ScheduleExport from '@/components/ScheduleExport';
import FreelancerTaskModal from '@/components/FreelancerTaskModal';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import './manager.css';
import StreakSystemView from '@/components/StreakSystemView';

const TrackingRadialProgress = ({ progress, size = 60, strokeWidth = 6, color = "var(--accent)" }: { progress: number, size?: number, strokeWidth?: number, color?: string }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress * circumference);

    return (
        <div className="radial-progress-container" style={{ position: 'relative', width: size, height: size }}>
            <svg width={size} height={size}>
                <circle
                    stroke="var(--border)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1s ease-in-out' }}
                    strokeLinecap="round"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
            <div style={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)',
                fontSize: '10px',
                fontWeight: 800,
                color: 'var(--text-primary)'
            }}>
                {Math.round(progress * 100)}%
            </div>
        </div>
    );
};

interface TeamLead extends TeamMember {
    clients: Client[];
}

const isTaskActiveForRole = (task: ContentItem, roleIdentifier?: string) => {
  const status = (task.status || '').toUpperCase();
  if (roleIdentifier === 'REEL') {
    const completedStatuses = ['EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'];
    return !completedStatuses.includes(status);
  }
  if (roleIdentifier === 'POST') {
    const completedStatuses = ['DESIGNING COMPLETED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'];
    return !completedStatuses.includes(status);
  }
  const defaultCompleted = ['APPROVED', 'WAITING FOR POSTING', 'POSTED'];
  return !defaultCompleted.includes(status);
};

export default function ManagerDashboard() {
    const DISPLAY_OFFSET_DAYS = 7;
    const { success: toastSuccess, error: toastError } = useToast();
    const { startLoading, stopLoading } = usePageLoading();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>('');
    const [clientSearchQuery, setClientSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<string>('all');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const [calendarData, setCalendarData] = useState<ContentItem[]>([]);
    const [globalCalendarData, setGlobalCalendarData] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'dashboard' | 'client' | 'master' | 'company' | 'teams' | 'poc' | 'tracking' | 'employees' | 'streaks'>('dashboard');
    const [productionEmployees, setProductionEmployees] = useState<any[]>([]);
    const [isEmployeeAssignModalOpen, setIsEmployeeAssignModalOpen] = useState(false);
    const [isTaskAssignModalOpen, setIsTaskAssignModalOpen] = useState(false);
    const [assigningToEmployee, setAssigningToEmployee] = useState<any>(null);
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [taskSearchTerm, setTaskSearchTerm] = useState('');
    const [assignableTasks, setAssignableTasks] = useState<ContentItem[]>([]);
    const fetchAssignableTasks = useCallback(async () => {
        try {
            const currentMonthStr = format(currentMonth, 'yyyy-MM');
            const res = await phApi.getMasterCalendar(currentMonthStr, undefined, undefined);
            setAssignableTasks(res.data);
        } catch (err) {
            console.error('Error fetching assignable tasks:', err);
        }
    }, [currentMonth]);
    const [dailyAgenda, setDailyAgenda] = useState<{ date: Date, items: ContentItem[] } | null>(null);

    // Tracking Panel States
    const [trackingStats, setTrackingStats] = useState<{ teamLeads: TlTrackingStats[], employees: EmployeeTrackingStats[], date: string } | null>(null);
    const [trackingLoading, setTrackingLoading] = useState(true);
    const [trackingTab, setTrackingTab] = useState<'tl' | 'employee'>('employee');
    const [trackingSearchQuery, setTrackingSearchQuery] = useState('');
    const [trackingDate, setTrackingDate] = useState(new Date().toISOString().split('T')[0]);
    const [expandedEmpClients, setExpandedEmpClients] = useState<Record<string, boolean>>({});

    const filteredTLs = trackingStats?.teamLeads.filter((tl: TlTrackingStats) => 
        tl.name.toLowerCase().includes(trackingSearchQuery.toLowerCase()) || 
        tl.email.toLowerCase().includes(trackingSearchQuery.toLowerCase())
    ) || [];

    const filteredEmployees = trackingStats?.employees.filter((emp: EmployeeTrackingStats) => 
        emp.name.toLowerCase().includes(trackingSearchQuery.toLowerCase()) || 
        emp.email.toLowerCase().includes(trackingSearchQuery.toLowerCase())
    ) || [];
    const [emergencyTasks, setEmergencyTasks] = useState<ContentItem[]>([]);
    const [pendingTasks, setPendingTasks] = useState<ContentItem[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [pocNotes, setPocNotes] = useState<PocNote[]>([]);
    const [selectedPocClient, setSelectedPocClient] = useState<string>('all');
    const [selectedPocNote, setSelectedPocNote] = useState<PocNote | null>(null);
    const [isPocDetailsOpen, setIsPocDetailsOpen] = useState(false);
    const [isPocEditing, setIsPocEditing] = useState(false);
    const [pocEditNoteText, setPocEditNoteText] = useState('');
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

    // Team leads state
    const [teamLeads, setTeamLeads] = useState<TeamLead[]>([]);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignTarget, setAssignTarget] = useState<{ teamLead: TeamLead } | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
    const [activeItem, setActiveItem] = useState<ContentDetails | null>(null);
    const [statusNote, setStatusNote] = useState('');
    const [user, setUser] = useState<User | null>(null);
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [dayTasks, setDayTasks] = useState<ContentItem[]>([]);
    const [isFreelancerModalOpen, setIsFreelancerModalOpen] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [employees, setEmployees] = useState<any[]>([]);


    const isMasterMode = view === 'master' || view === 'company';
    const isCompanyMode = view === 'company';
    const getDisplayDate = (scheduledDateTime: string) => subDays(getISTDate(scheduledDateTime), DISPLAY_OFFSET_DAYS);
    const getCalendarItemDate = (item: ContentItem) =>
        isCompanyMode ? getDisplayDate(item.scheduled_datetime) : getISTDate(item.scheduled_datetime);

    const [formData, setFormData] = useState({
        content_type: 'Post' as ContentItem['content_type'],
        time: '10:00',
        title: '',
        description: ''
    });

    // Batch cycle helpers
    const getClientBatchType = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        return client?.batch_type || '1-1';
    };

    const selectedClientData = clients.find(c => c.id === selectedClient);
    const isBiMonthlyView = (view === 'client' || view === 'master' || view === 'dashboard') && selectedClient && selectedClient !== 'all' && selectedClientData?.batch_type === '15-15';

    const { periodStart, periodEnd } = isBiMonthlyView
        ? get15BiMonthlyPeriod(currentMonth)
        : { periodStart: startOfMonth(currentMonth), periodEnd: endOfMonth(currentMonth) };

    const isDayInPeriod = (day: Date): boolean => {
        if (!isBiMonthlyView) return isSameMonth(day, currentMonth);
        return day >= startOfDay(periodStart) && day <= endOfDay(periodEnd);
    };



    const fetchClientCalendar = useCallback(async (clientId: string, isSilent = false) => {
        if (!clientId) return [];
        if (!isSilent) {
            startLoading();
            if (calendarData.length === 0) {
                setLoading(true);
            } else {
                setIsRefreshing(true);
            }
        }
        try {
            const client = clients.find(c => c.id === clientId);
            const is1515 = client?.batch_type === '15-15';

            let data = [];
            if (is1515) {
                const isSecondHalf = currentMonth.getDate() >= 15;
                const startMonth = isSecondHalf ? currentMonth : subMonths(currentMonth, 1);
                const endMonth = isSecondHalf ? addMonths(currentMonth, 1) : currentMonth;

                const [resStart, resEnd] = await Promise.all([
                    gmApi.getCalendar(clientId, format(startMonth, 'yyyy-MM')),
                    gmApi.getCalendar(clientId, format(endMonth, 'yyyy-MM'))
                ]);
                data = [...(resStart.data || []), ...(resEnd.data || [])];
            } else {
                const res = await gmApi.getCalendar(clientId, format(currentMonth, 'yyyy-MM'));
                data = res.data || [];
            }

            return data;
        } catch (error) {
            console.error('Error fetching client calendar:', error);
            toastError('Failed to refresh client calendar.');
            return [];
        } finally {
            setLoading(false);
            setIsRefreshing(false);
            if (!isSilent) stopLoading();
        }
    }, [currentMonth, clients, calendarData.length, startLoading, stopLoading, toastError]);

    const fetchMasterCalendar = useCallback(async (isSilent = false) => {
        if (!isSilent) {
            startLoading();
            if (calendarData.length === 0) {
                setLoading(true);
            } else {
                setIsRefreshing(true);
            }
        }
        try {
            if (view === 'company') {
                const monthWindows = [subMonths(currentMonth, 1), currentMonth, addMonths(currentMonth, 1)];
                const responses = await Promise.all(
                    monthWindows.map((monthDate) =>
                        gmApi.getMasterCalendar(
                            format(monthDate, 'yyyy-MM'),
                            selectedClient === 'all' ? undefined : selectedClient,
                            selectedType === 'all' ? undefined : selectedType
                        )
                    )
                );
                const merged = responses.flatMap((response) => response.data || []);
                return Array.from(new Map(merged.map((item) => [item.id, item])).values());
            }

            // For master view with a specific client selected that is 15-15
            const client = clients.find(c => c.id === selectedClient);
            let data = [];

            if (client?.batch_type === '15-15') {
                const isSecondHalf = currentMonth.getDate() >= 15;
                const startMonth = isSecondHalf ? currentMonth : subMonths(currentMonth, 1);
                const endMonth = isSecondHalf ? addMonths(currentMonth, 1) : currentMonth;

                const [resStart, resEnd] = await Promise.all([
                    gmApi.getMasterCalendar(
                        format(startMonth, 'yyyy-MM'),
                        selectedClient,
                        selectedType === 'all' ? undefined : selectedType
                    ),
                    gmApi.getMasterCalendar(
                        format(endMonth, 'yyyy-MM'),
                        selectedClient,
                        selectedType === 'all' ? undefined : selectedType
                    )
                ]);
                data = [...(resStart.data || []), ...(resEnd.data || [])];
            } else {
                const monthStr = format(currentMonth, 'yyyy-MM');
                const res = await gmApi.getMasterCalendar(
                    monthStr,
                    selectedClient === 'all' ? undefined : selectedClient,
                    selectedType === 'all' ? undefined : selectedType
                );
                data = res.data || [];
            }

            return data;
        } catch (error) {
            console.error('Error fetching master calendar:', error);
            toastError('Failed to refresh master calendar.');
            return [];
        } finally {
            setLoading(false);
            setIsRefreshing(false);
            if (!isSilent) stopLoading();
        }
    }, [currentMonth, view, selectedClient, selectedType, clients, calendarData.length, startLoading, stopLoading, toastError]);

    const fetchGlobalData = useCallback(async () => {
        try {
            const res = await gmApi.getMasterCalendar(format(currentMonth, 'yyyy-MM'));
            setGlobalCalendarData(res.data || []);
        } catch (err) {
            console.error("Error fetching global data:", err);
        }
    }, [currentMonth]);

    const fetchTrackingStats = useCallback(async (date = trackingDate, isSilent = false) => {
        if (!isSilent) {
            if (!trackingStats) {
                setTrackingLoading(true);
            }
        } else {
            setTrackingLoading(true);
        }
        try {
            const res = await adminApi.getTrackingStats(date);
            setTrackingStats(res.data);
        } catch (err: any) {
            console.error('Error fetching tracking stats:', err);
            const detailMsg = err.response?.data?.details || err.response?.data?.error || 'Failed to refresh tracking stats.';
            toastError(detailMsg);
        } finally {
            setTrackingLoading(false);
        }
    }, [trackingDate, trackingStats, toastError]);
    const fetchProductionEmployees = useCallback(async () => {
        try {
            const res = await phApi.getEmployees();
            setProductionEmployees(res.data);
            const clientsRes = await phApi.getClients();
            setClients(clientsRes.data);
        } catch (err) { console.error('Error fetching production employees:', err); }
    }, []);

    useEffect(() => {
        if (view === 'master' || view === 'company') {
            fetchMasterCalendar().then(setCalendarData);
        } else if (view === 'client' && selectedClient && selectedClient !== 'all') {
            fetchClientCalendar(selectedClient).then(setCalendarData);
        } else if (view === 'teams') {
            fetchTeamLeads();
        } else if (view === 'poc') {
            fetchPocNotes();
        } else if (view === 'dashboard') {
            fetchDashboardStats();
        } else if (view === 'tracking') {
            fetchTrackingStats(trackingDate);
        } else if (view === 'employees') {
            fetchProductionEmployees();
            fetchAssignableTasks();
        }
        fetchGlobalData();
    }, [selectedClient, selectedType, selectedPocClient, currentMonth, view, clients.length, teamLeads.length, trackingDate, fetchGlobalData, fetchTrackingStats, fetchProductionEmployees, fetchAssignableTasks]);

    useEffect(() => {
        if (view === 'tracking') {
            fetchTrackingStats(trackingDate);
        }
    }, [trackingDate, view, fetchTrackingStats]);

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

    const latestState = React.useRef({ view, selectedClient, activeItemId: activeItem?.item?.id, isDetailsOpen });
    useEffect(() => {
        latestState.current = { view, selectedClient, activeItemId: activeItem?.item?.id, isDetailsOpen };
    }, [view, selectedClient, activeItem?.item?.id, isDetailsOpen]);

    useEffect(() => {
        const syncStateFromUrl = () => {
            const params = new URLSearchParams(window.location.search);
            const viewParam = params.get('view') || 'dashboard';
            const clientIdParam = params.get('clientId') || '';
            const taskIdParam = params.get('taskId') || '';

            const currentState = latestState.current;

            if (viewParam !== currentState.view) {
                setView(viewParam as any);
            }
            if (clientIdParam !== currentState.selectedClient) {
                setSelectedClient(clientIdParam);
            }
            if (taskIdParam) {
                if (currentState.activeItemId !== taskIdParam) {
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
                } else if (!currentState.isDetailsOpen) {
                    setIsDetailsOpen(true);
                }
            } else {
                if (currentState.isDetailsOpen) {
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
    }, [loading]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const viewParam = params.get('view') || 'dashboard';
        const clientIdParam = params.get('clientId') || '';

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
            const clientIdParam = params.get('clientId') || '';
            if (viewParam === view && clientIdParam === selectedClient) {
                if (params.has('taskId')) {
                    params.delete('taskId');
                    const newSearch = params.toString();
                    window.history.replaceState(null, '', newSearch ? `?${newSearch}` : window.location.pathname);
                }
            }
        }
    }, [isDetailsOpen, view, selectedClient]);

    const fetchPocNotes = useCallback(async (isSilent = false) => {
        if (!isSilent) {
            startLoading();
            if (pocNotes.length === 0) setLoading(true);
            else setIsRefreshing(true);
        }
        try {
            const clientId = selectedPocClient === 'all' ? undefined : selectedPocClient;
            const res = await gmApi.getPocNotes(format(currentMonth, 'yyyy-MM'), undefined, clientId);
            setPocNotes(res.data || []);
        } catch (err) {
            console.error('Error fetching POC notes:', err);
            toastError('Failed to refresh POC notes.');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
            if (!isSilent) stopLoading();
        }
    }, [currentMonth, selectedPocClient, pocNotes.length, startLoading, stopLoading, toastError]);

    const fetchTeamLeads = useCallback(async (isSilent = false) => {
        if (!isSilent) {
            startLoading();
            if (teamLeads.length === 0) setLoading(true);
            else setIsRefreshing(true);
        }
        try {
            const res = await gmApi.getTeamLeads();
            // For each team lead, fetch their assigned clients
            const leadsWithClients = await Promise.all(res.data.map(async (lead: TeamMember) => {
                const clientsRes = await gmApi.getTeamLeadClients(lead.user_id);
                return { ...lead, clients: clientsRes.data };
            }));
            setTeamLeads(leadsWithClients);
        } catch (err) {
            console.error(err);
            toastError('Failed to refresh team leads.');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
            if (!isSilent) stopLoading();
        }
    }, [teamLeads.length, startLoading, stopLoading, toastError]);

    const isItemCompleted = (item: ContentItem) => {
        const s = (item.status || '').toUpperCase();
        return s === 'POSTED' || s === 'SCHEDULED' || s === 'COMPLETED' || s === 'WAITING FOR POSTING';
    };

    const fetchClients = useCallback(async () => {
        try {
            const res = await gmApi.getClients();
            console.log('Clients loaded:', res.data);
            setClients(res.data);
            // clients table PK is "id"
            // Don't auto-select client if we want to show the selection grid
            if (res.data.length > 0 && !selectedClient && view !== 'client') {
                setSelectedClient(res.data[0].id);
            }
        } catch (err) { console.error('Error fetching clients:', err); }
    }, [selectedClient, view]);

    const fetchEmployees = useCallback(async () => {
        try {
            const res = await adminApi.getTeam();
            setEmployees(res.data);
        } catch (err) { console.error(err); }
    }, []);



    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    const getEmployeeName = (id: string | null | undefined) => {
        if (!id) return 'Unassigned';
        const emp = employees.find(e => e.user_id === id);
        return emp ? emp.name : 'Unassigned';
    };



    const [stats, setStats] = useState({
        totalClients: 0,
        totalTeams: 0,
        monthlyContent: 0,
        statusBreakdown: {} as Record<string, number>,
        pendingCount: 0,
        completedCount: 0,
        pendingReels: 0,
        pendingPosts: 0,
        completedReels: 0,
        completedPosts: 0,
        reelsCount: 0,
        postsCount: 0,
        youtubeCount: 0,
        videoCount: 0,
        shootDoneCount: 0,
        shootDoneReels: 0,
        shootDonePosts: 0,
        contentApprovedCount: 0,
        weeksPending: 0
    });

    const [todayStats, setTodayStats] = useState({ total: 0, completed: 0, percentage: 0, remaining: 0 });
    const [masterWeekStats, setMasterWeekStats] = useState({ total: 0, completed: 0, percentage: 0 });
    const [companyStats] = useState({
        today: { total: 0, completed: 0, percentage: 0 },
        week: { total: 0, completed: 0, percentage: 0 },
        month: { total: 0, completed: 0, percentage: 0 }
    });

    const fetchDashboardStats = useCallback(async (isSilent = false) => {
        if (!isSilent) {
            startLoading();
            if (calendarData.length === 0) {
                setLoading(true);
            } else {
                setIsRefreshing(true);
            }
        }
        try {
            let data = [];
            if (selectedClient && selectedClient !== 'all') {
                data = await fetchClientCalendar(selectedClient, isSilent);
            } else {
                data = await fetchMasterCalendar(isSilent);
            }

            const periodData = data.filter((item: ContentItem) => isDayInPeriod(parseISO(item.scheduled_datetime)));

            const breakdown = periodData.reduce((acc: Record<string, number>, item: ContentItem) => {
                acc[item.status] = (acc[item.status] || 0) + 1;
                return acc;
            }, {});


            // Calculate today's stats
            const today = new Date();
            const todayItems = data.filter((item: ContentItem) => isSameDay(parseISO(item.scheduled_datetime), today));
            const totalToday = todayItems.length;
            const completedToday = todayItems.filter((item: ContentItem) => isItemCompleted(item)).length;

            setTodayStats({
                total: totalToday,
                completed: completedToday,
                remaining: totalToday - completedToday,
                percentage: totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0
            });

            // Master Week
            const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
            const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
            const weekItems = data.filter((item: ContentItem) => {
                const itemDate = parseISO(item.scheduled_datetime);
                return itemDate >= weekStart && itemDate <= weekEnd;
            });
            const totalWeek = weekItems.length;
            const completedWeek = weekItems.filter((item: ContentItem) => isItemCompleted(item)).length;
            setMasterWeekStats({
                total: totalWeek,
                completed: completedWeek,
                percentage: totalWeek > 0 ? Math.round((completedWeek / totalWeek) * 100) : 0
            });

            const completedItems = periodData.filter((item: ContentItem) => isItemCompleted(item));
            const pendingItems = periodData.filter((item: ContentItem) => !isItemCompleted(item));

            const completedCount = completedItems.length;
            const pendingCount = pendingItems.length;

            const completedReels = completedItems.filter((item: ContentItem) => (item.content_type || '').toUpperCase() === 'REEL').length;
            const completedPosts = completedItems.filter((item: ContentItem) => (item.content_type || '').toUpperCase() === 'POST').length;

            const pendingReels = pendingItems.filter((item: ContentItem) => (item.content_type || '').toUpperCase() === 'REEL').length;
            const pendingPosts = pendingItems.filter((item: ContentItem) => (item.content_type || '').toUpperCase() === 'POST').length;

            const reelsCount = periodData.filter((item: ContentItem) => (item.content_type || '').toUpperCase() === 'REEL').length;
            const postsCount = periodData.filter((item: ContentItem) => (item.content_type || '').toUpperCase() === 'POST').length;
            const youtubeCount = periodData.filter((item: ContentItem) => (item.content_type || '').toUpperCase() === 'YOUTUBE').length;
            const videoCount = reelsCount + youtubeCount;

            // Unified Production Logic
            const shootDoneItems = periodData.filter((item: ContentItem) => {
                const s = (item.status || '').toUpperCase();
                const type = (item.content_type || '').toUpperCase();
                if ((type === 'REEL' || type === 'YOUTUBE') && shootDoneStatuses.includes(s)) return true;
                if (type === 'POST' && (s === 'DESIGNING COMPLETED' || shootDoneStatuses.includes(s))) return true;
                return false;
            });

            const shootDoneCount = shootDoneItems.length;
            const shootDoneReels = shootDoneItems.filter((item: ContentItem) => (item.content_type || '').toUpperCase() === 'REEL').length;
            const shootDonePosts = shootDoneItems.filter((item: ContentItem) => (item.content_type || '').toUpperCase() === 'POST').length;

            const contentApprovedCount = periodData.filter((item: ContentItem) => 
                contentApprovedStatuses.includes((item.status || '').toUpperCase())
            ).length;

            setStats({
                totalClients: clients.length,
                totalTeams: teamLeads.length,
                monthlyContent: periodData.length,
                statusBreakdown: breakdown,
                completedCount,
                pendingCount,
                completedReels,
                completedPosts,
                pendingReels,
                pendingPosts,
                reelsCount,
                postsCount,
                youtubeCount,
                videoCount,
                shootDoneCount,
                shootDoneReels,
                shootDonePosts,
                contentApprovedCount,
                weeksPending: data.filter((item: ContentItem) => {
                    const itemDate = parseISO(item.scheduled_datetime);
                    const now = new Date();
                    const sevenDaysFromNow = endOfDay(addDays(now, 7));
                    return itemDate >= startOfDay(now) && itemDate <= sevenDaysFromNow && !isItemCompleted(item);
                }).length
            });
            setCalendarData(data);

            // Fetch all dashboard lists
            const [emergencyRes, pendingRes] = await Promise.all([
                emergencyApi.getAll(),
                dashboardApi.getPendingImportant()
            ]);

            setEmergencyTasks(emergencyRes.data || []);
            setPendingTasks(pendingRes.data || []);
        } catch (err) {
            console.error(err);
            toastError('Failed to refresh dashboard stats.');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
            if (!isSilent) stopLoading();
        }
    }, [clients.length, teamLeads.length, selectedClient, fetchClientCalendar, fetchMasterCalendar, isDayInPeriod, calendarData.length, startLoading, stopLoading, toastError]);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    useEffect(() => {
        const fetchUserEffect = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                // Fetch profile to get role
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
    }, [supabase]);


    const days = viewMode === 'month'
        ? eachDayOfInterval({
            start: startOfWeek(periodStart, { weekStartsOn: 1 }),
            end: endOfWeek(periodEnd, { weekStartsOn: 1 })
        })
        : eachDayOfInterval({
            start: startOfWeek(currentMonth, { weekStartsOn: 1 }),
            end: endOfWeek(currentMonth, { weekStartsOn: 1 })
        });

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

            // Track status distribution for the Activity Hub
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

    const assignedTotals = (() => {
        if (selectedClient && selectedClient !== 'all') {
            const client = clients.find(c => c.id === selectedClient);
            return {
                reels: client?.reels_per_month || 0,
                posts: client?.posts_per_month || 0
            };
        }
        // In master/company view with 'all' clients, sum them up
        return clients.reduce((acc, c) => ({
            reels: acc.reels + (c.reels_per_month || 0),
            posts: acc.posts + (c.posts_per_month || 0)
        }), { reels: 0, posts: 0 });
    })();


    const handlePrev = () => {
        if (viewMode === 'month') {
            setCurrentMonth(subMonths(currentMonth, 1));
        } else {
            setCurrentMonth(prev => new Date(prev.setDate(prev.getDate() - 7)));
        }
    };

    const handleNext = () => {
        if (viewMode === 'month') {
            setCurrentMonth(addMonths(currentMonth, 1));
        } else {
            setCurrentMonth(prev => new Date(prev.setDate(prev.getDate() + 7)));
        }
    };

    const handleAddClick = (date: Date) => {
        if (isMasterMode) return;
        setSelectedDate(date);
        setEditingItem(null);
        setIsRescheduling(false);
        setFormData({ content_type: 'Post', time: '10:00', title: '', description: '' });
        setIsModalOpen(true);
    };

    const handleItemClick = async (item: ContentItem) => {
        try {
            // Find all tasks on the same day as the clicked item
            const day = getCalendarItemDate(item);

            // Collect tasks from available sources
            const tasksOnDay = calendarData.filter(i => isSameDay(getCalendarItemDate(i), day));

            // If the item itself isn't in the list (e.g. from emergency tasks and calendar not loaded), add it
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
            // Clear current item first to show loading or just keep current while fetching
            const res = await gmApi.getContentDetails(nextTask.id);
            setActiveItem(res.data);
            // Ensure status note is cleared when switching tasks
            setStatusNote('');
        } catch (err) { console.error(err); }
    };

    const handleEditClick = (item: ContentItem) => {
        setIsRescheduling(false);
        setEditingItem(item);
        const dateStr = formatISTForm(item.scheduled_datetime, 'yyyy-MM-dd');
        const timeStr = formatISTForm(item.scheduled_datetime, 'HH:mm');
        setSelectedDate(new Date(dateStr + 'T00:00:00'));
        setFormData({
            content_type: item.content_type,
            time: timeStr,
            title: item.title || '',
            description: item.description || ''
        });
        setIsDetailsOpen(false);
        setIsModalOpen(true);
    };

    const handleRescheduleClick = (item: ContentItem) => {
        setIsRescheduling(true);
        setEditingItem(item);
        const dateStr = formatISTForm(item.scheduled_datetime, 'yyyy-MM-dd');
        const timeStr = formatISTForm(item.scheduled_datetime, 'HH:mm');
        setSelectedDate(new Date(dateStr + 'T00:00:00'));
        setFormData({
            content_type: item.content_type,
            time: timeStr,
            title: item.title || '',
            description: item.description || ''
        });
        setIsDetailsOpen(false);
        setIsModalOpen(true);
    };

    const handleDeleteContent = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this content item?')) return;
        setUpdatingId(id);
        const previousCalendarData = [...calendarData];
        const previousEmergencyTasks = [...emergencyTasks];
        const previousPendingTasks = [...pendingTasks];

        // Optimistically remove
        setCalendarData(prev => prev.filter(item => item.id !== id));
        setEmergencyTasks(prev => prev.filter(item => item.id !== id));
        setPendingTasks(prev => prev.filter(item => item.id !== id));
        setIsDetailsOpen(false);
        toastSuccess('Content item deleted successfully.');

        try {
            await gmApi.deleteContent(id);
            setTimeout(() => {
                if (view === 'master') fetchMasterCalendar(true).then(setCalendarData);
                else fetchClientCalendar(selectedClient, true).then(setCalendarData);
                fetchDashboardStats(true);
            }, 500);
        } catch (err: any) {
            console.error(err);
            setCalendarData(previousCalendarData);
            setEmergencyTasks(previousEmergencyTasks);
            setPendingTasks(previousPendingTasks);
            toastError(err.response?.data?.error || 'Failed to delete content');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!activeItem) return;
        setUpdatingId(activeItem.item.id);

        const previousActiveItem = { ...activeItem };
        const previousCalendarData = [...calendarData];
        const previousEmergencyTasks = [...emergencyTasks];
        const previousPendingTasks = [...pendingTasks];

        // Optimistic UI updates
        const updatedItem = { ...activeItem.item, status: newStatus };
        setActiveItem({
            ...activeItem,
            item: updatedItem
        });
        setCalendarData(prev => prev.map(item => item.id === activeItem.item.id ? updatedItem : item));
        setEmergencyTasks(prev => prev.map(item => item.id === activeItem.item.id ? updatedItem : item));
        setPendingTasks(prev => prev.map(item => item.id === activeItem.item.id ? updatedItem : item));
        toastSuccess(`Status updated to ${newStatus}`);

        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            const actorId = authUser?.id || user?.id;
            await gmApi.updateStatus(activeItem.item.id, newStatus, statusNote.trim() || undefined, actorId);
            setStatusNote('');

            setTimeout(async () => {
                try {
                    const res = await gmApi.getContentDetails(activeItem.item.id);
                    setActiveItem(res.data);
                    if (isMasterMode) fetchMasterCalendar(true).then(setCalendarData);
                    else fetchClientCalendar(selectedClient, true).then(setCalendarData);
                    fetchDashboardStats(true);
                } catch (refreshErr) {
                    console.error('Background refresh failed:', refreshErr);
                }
            }, 500);
        } catch (err: any) {
            console.error('Status update error (GM):', err);
            setActiveItem(previousActiveItem);
            setCalendarData(previousCalendarData);
            setEmergencyTasks(previousEmergencyTasks);
            setPendingTasks(previousPendingTasks);
            toastError(err.response?.data?.error || 'Failed to update status');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleUndoStatus = async () => {
        if (!activeItem) return;
        setUpdatingId(activeItem.item.id);

        const previousActiveItem = { ...activeItem };
        const previousCalendarData = [...calendarData];
        const previousEmergencyTasks = [...emergencyTasks];
        const previousPendingTasks = [...pendingTasks];

        // Optimistic UI updates (using second-to-last history item if available)
        let revertedStatus = activeItem.item.status;
        if (activeItem.history && activeItem.history.length > 1) {
            revertedStatus = activeItem.history[1].new_status || (activeItem.history[1] as any).status || activeItem.item.status;
        }
        const updatedItem = { ...activeItem.item, status: revertedStatus };
        setActiveItem({
            ...activeItem,
            item: updatedItem
        });
        setCalendarData(prev => prev.map(item => item.id === activeItem.item.id ? updatedItem : item));
        setEmergencyTasks(prev => prev.map(item => item.id === activeItem.item.id ? updatedItem : item));
        setPendingTasks(prev => prev.map(item => item.id === activeItem.item.id ? updatedItem : item));
        toastSuccess('Undoing last status change...');

        try {
            await gmApi.undoStatus(activeItem.item.id);
            toastSuccess('Status change undone.');

            setTimeout(async () => {
                try {
                    const res = await gmApi.getContentDetails(activeItem.item.id);
                    setActiveItem(res.data);
                    if (isMasterMode) fetchMasterCalendar(true).then(setCalendarData);
                    else fetchClientCalendar(selectedClient, true).then(setCalendarData);
                    fetchDashboardStats(true);
                } catch (refreshErr) {
                    console.error('Background refresh failed:', refreshErr);
                }
            }, 500);
        } catch (err: any) {
            console.error(err);
            setActiveItem(previousActiveItem);
            setCalendarData(previousCalendarData);
            setEmergencyTasks(previousEmergencyTasks);
            setPendingTasks(previousPendingTasks);
            toastError('Failed to undo status change.');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleToggleEmergency = async () => {
        if (!activeItem) return;
        setUpdatingId(activeItem.item.id);

        const previousActiveItem = { ...activeItem };
        const previousCalendarData = [...calendarData];
        const previousEmergencyTasks = [...emergencyTasks];

        const updatedItem = { ...activeItem.item, is_emergency: !activeItem.item.is_emergency };
        setActiveItem({
            ...activeItem,
            item: updatedItem
        });
        setCalendarData(prev => prev.map(item => item.id === activeItem.item.id ? updatedItem : item));
        if (updatedItem.is_emergency) {
            if (!emergencyTasks.some(t => t.id === updatedItem.id)) {
                setEmergencyTasks(prev => [updatedItem, ...prev]);
            }
        } else {
            setEmergencyTasks(prev => prev.filter(t => t.id !== updatedItem.id));
        }
        toastSuccess(`Emergency status toggled to ${updatedItem.is_emergency ? 'ON' : 'OFF'}`);

        try {
            const res: any = await emergencyApi.toggle(activeItem.item.id);
            if (res.data.success) {
                setTimeout(async () => {
                    try {
                        const detailsRes = await gmApi.getContentDetails(activeItem.item.id);
                        setActiveItem(detailsRes.data);
                        if (view === 'master') fetchMasterCalendar(true).then(setCalendarData);
                        else if (view === 'client') fetchClientCalendar(selectedClient, true).then(setCalendarData);
                        fetchDashboardStats(true);
                    } catch (refreshErr) {
                        console.error(refreshErr);
                    }
                }, 500);
            } else {
                throw new Error('Toggle failed on server');
            }
        } catch (err: any) {
            console.error('Emergency toggle error:', err);
            setActiveItem(previousActiveItem);
            setCalendarData(previousCalendarData);
            setEmergencyTasks(previousEmergencyTasks);
            toastError(err.response?.data?.error || 'Failed to toggle emergency status');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleAssignClient = async (clientId: string, teamLeadId: string) => {
        const previousTeamLeads = [...teamLeads];
        const previousClients = [...clients];

        const clientObj = clients.find(c => c.id === clientId);
        if (clientObj) {
            setTeamLeads(prev => prev.map(lead => {
                let updatedClients = lead.clients ? lead.clients.filter(c => c.id !== clientId) : [];
                if (lead.user_id === teamLeadId) {
                    updatedClients = [...updatedClients, clientObj];
                }
                return { ...lead, clients: updatedClients };
            }));
            toastSuccess('Client assigned successfully.');
        }

        try {
            await gmApi.assignClient(clientId, teamLeadId);
            setIsAssignModalOpen(false);

            setTimeout(() => {
                fetchTeamLeads(true);
                fetchClients();
            }, 500);
        } catch (err) {
            console.error(err);
            setTeamLeads(previousTeamLeads);
            setClients(previousClients);
            toastError('Error assigning client');
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const handlePocNoteClick = (note: PocNote) => {
        setSelectedPocNote(note);
        setPocEditNoteText(note.note_text);
        setIsPocEditing(false);
        setIsPocDetailsOpen(true);
    };

    const handleUpdatePocNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPocNote || !pocEditNoteText.trim()) return;
        setUpdatingId('poc-submitting');

        const previousPocNotes = [...pocNotes];
        const previousSelectedPocNote = { ...selectedPocNote };

        const updatedPocNote = { ...selectedPocNote, note_text: pocEditNoteText.trim() };
        setPocNotes(prev => prev.map(note => note.id === selectedPocNote.id ? updatedPocNote : note));
        setSelectedPocNote(updatedPocNote);
        setIsPocEditing(false);
        toastSuccess('POC Note updated.');

        try {
            const actorId = user?.id;
            const res = await tlApi.updatePocNote(selectedPocNote.id, {
                note_text: pocEditNoteText.trim(),
                actor_id: actorId
            });

            setTimeout(() => {
                setSelectedPocNote(res.data);
                fetchPocNotes(true);
            }, 500);
        } catch (err) {
            console.error('Error updating POC note:', err);
            setPocNotes(previousPocNotes);
            setSelectedPocNote(previousSelectedPocNote);
            toastError('Failed to update note');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDeletePocNote = async () => {
        if (!selectedPocNote) return;
        if (!window.confirm('Are you sure you want to delete this POC note? This action cannot be undone.')) return;

        const previousPocNotes = [...pocNotes];

        setPocNotes(prev => prev.filter(note => note.id !== selectedPocNote.id));
        setIsPocDetailsOpen(false);
        setSelectedPocNote(null);
        toastSuccess('POC Note deleted.');

        try {
            await tlApi.deletePocNote(selectedPocNote.id);
            setTimeout(() => {
                fetchPocNotes(true);
            }, 500);
        } catch (err) {
            console.error('Error deleting POC note:', err);
            setPocNotes(previousPocNotes);
            toastError('Failed to delete note');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const scheduled_datetime = convertISTToUTC(format(selectedDate!, 'yyyy-MM-dd'), formData.time);
        setUpdatingId('submitting');
        try {
            if (editingItem) {
                await gmApi.updateContent(editingItem.id, {
                    title: formData.title,
                    description: formData.description,
                    scheduled_datetime,
                    is_rescheduled: isRescheduling ? true : editingItem.is_rescheduled
                });
                toastSuccess('Content item updated successfully.');
            } else {
                await gmApi.addContent({
                    client_id: selectedClient,
                    title: formData.title,
                    description: formData.description,
                    content_type: formData.content_type,
                    scheduled_datetime
                });
                toastSuccess('Content item created successfully.');
            }
            setIsModalOpen(false);
            setIsRescheduling(false);

            setTimeout(() => {
                if (view === 'master') fetchMasterCalendar(true).then(setCalendarData);
                else fetchClientCalendar(selectedClient, true).then(setCalendarData);
                fetchDashboardStats(true);
            }, 500);
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'Error saving item';
            toastError(errorMsg);
        } finally {
            setUpdatingId(null);
        }
    };

    const getClientName = () => {
        const c = clients.find(c => c.id === selectedClient);
        return c?.company_name || 'Client';
    };

    const monthTotal = stats.monthlyContent;
    const monthCompleted = stats.statusBreakdown['POSTED'] || 0;
    // const monthPercentage = monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const weekItems = calendarData.filter((item) => {
        const itemDate = parseISO(item.scheduled_datetime);
        return itemDate >= weekStart && itemDate <= weekEnd;
    });
    const weekTotal = weekItems.length;
    const weekCompleted = weekItems.filter((item) => (item.status || '').toUpperCase() === 'POSTED').length;
    // const weekPercentage = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;

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
            <aside className={`sidebar ${isSidebarOpen ? 'mobile-open' : ''}`}>
                <div className="logo-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Image src="/logo.png" alt="TrueUp Media" width={100} height={28} className="logo-img" style={{ height: '28px', width: 'auto' }} />
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Manager</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="sidebar-close" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 sidebar-nav">
                    <p className="sidebar-label">Navigation</p>
                    <div
                        onClick={() => {
                            setView('dashboard');
                            if (selectedClient === 'all' && clients.length > 0) {
                                setSelectedClient(clients[0].id);
                            }
                        }}
                        className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
                    >
                        <LayoutDashboard size={20} />
                        <span>Dashboard Overview</span>
                    </div>
                    <div
                        onClick={() => {
                            setView('client');
                            setSelectedClient('');
                        }}
                        className={`nav-item ${view === 'client' ? 'active' : ''}`}
                    >
                        <CalendarIcon size={20} />
                        <span>Client Calendar</span>
                    </div>
                    <div
                        onClick={() => {
                            setView('master');
                            setSelectedClient('all');
                        }}
                        className={`nav-item ${view === 'master' ? 'active' : ''}`}
                    >
                        <Globe size={20} />
                        <span>Master Calendar</span>
                    </div>
                    {/* {showCompanyCalendar && (
                        <div
                            onClick={() => setView('company')}
                            className={`nav-item ${view === 'company' ? 'active' : ''}`}
                        >
                            <CalendarClock size={20} />
                            <span>Company Calendar</span>
                        </div>
                    )} */}
                    <div
                        onClick={() => setView('teams')}
                        className={`nav-item ${view === 'teams' ? 'active' : ''}`}
                    >
                        <Users size={20} />
                        <span>Teams</span>
                    </div>
                    <div
                        onClick={() => setView('employees')}
                        className={`nav-item ${view === 'employees' ? 'active' : ''}`}
                    >
                        <UserCircle2 size={20} />
                        <span>Employee Management</span>
                    </div>
                    <div
                        onClick={() => {
                            setView('poc');
                            setSelectedPocClient('all');
                        }}
                        className={`nav-item ${view === 'poc' ? 'active' : ''}`}
                    >
                        <FileText size={20} />
                        <span>POC Communication</span>
                    </div>
                    <div
                        onClick={() => setView('tracking')}
                        className={`nav-item ${view === 'tracking' ? 'active' : ''}`}
                    >
                        <Activity size={20} />
                        <span>Employee Tracking</span>
                    </div>
                    <div
                        onClick={() => setView('streaks')}
                        className={`nav-item ${view === 'streaks' ? 'active' : ''}`}
                    >
                        <Trophy size={20} />
                        <span>Streak System</span>
                    </div>

                    {view === 'client' && (
                        <div className="sidebar-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                            <span>Clients</span>
                            <span style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '6px', color: 'var(--accent)', border: '1px solid var(--border)' }}>{clients.length}</span>
                        </div>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <p className="sidebar-label" style={{ margin: 0 }}>Appearance</p>
                        <ThemeToggle style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
                    </div>
                    <div className="user-info-box">
                        <div className="user-avatar" style={{ background: 'var(--accent)', color: 'white' }}>M</div>
                        <div>
                            <p className="user-name">Manager</p>
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
                {/* Mobile Header Top */}
                <div className="mobile-header-top">
                    <div className="menu-toggle" onClick={() => setIsSidebarOpen(true)}>
                        <Menu size={24} />
                    </div>
                    <Image src="/logo.png" alt="TrueUp Media" width={100} height={24} className="logo-img" style={{ height: '24px', width: 'auto' }} />
                    <div style={{ width: '40px' }}></div> {/* Spacer */}
                </div>

                <header className="page-header page-header-safe">
                    <div className="header-content">
                        <div className="header-info">
                            <h1 className="page-title">
                                {view === 'dashboard' && 'Dashboard Overview'}
                                {view === 'client' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span>{selectedClient ? 'Client Calendar' : 'Client Calendars'}</span>
                                        {selectedClient && (
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
                                    </div>
                                )}
                                {view === 'master' && 'Master Calendar'}
                                {view === 'company' && 'Company Calendar'}
                                {view === 'teams' && 'Team Management'}
                                {view === 'employees' && 'Employee Management'}
                                {view === 'poc' && 'POC Communication'}
                            </h1>
                            <p className="page-subtitle">
                                {view === 'dashboard' && 'Monitor operational health and pipeline metrics'}
                                {view === 'client' && (selectedClient ? `Detailed planning for ${getClientName()}` : 'Access and manage individual content schedules for each client')}
                                {view === 'master' && 'Review and manage content production flow'}
                                {view === 'company' && 'Master view of all content shown 7 days before scheduled date'}
                                {view === 'teams' && 'Assign clients and manage team lead performance'}
                                {view === 'employees' && 'Assign and manage clients for individual employees'}
                                {view === 'poc' && 'Read communication notes added by Team Leads'}
                            </p>
                        </div>

                        <div className="header-controls">
                            {view === 'client' && selectedClient && (
                                <button
                                    onClick={() => setSelectedClient('')}
                                    className="btn-back-grid"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 16px',
                                        background: 'var(--bg-elevated)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        marginRight: '12px'
                                    }}
                                >
                                    <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
                                    Selection Grid
                                </button>
                            )}
                            {view === 'client' && selectedClient && (
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
                                            <option value="freelancer">Freelancer Clients</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id}>{c.company_name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="dropdown-chevron" />
                                    </div>
                                    <div className="filter-divider"></div>
                                    <div className="client-dropdown-wrapper">
                                        <select
                                            className="client-dropdown"
                                            value={selectedType}
                                            onChange={(e) => setSelectedType(e.target.value)}
                                        >
                                            <option value="all">All Types</option>
                                            <option value="Post">Posts</option>
                                            <option value="Reel">Reels</option>
                                            <option value="YouTube">YouTube</option>
                                            <option value="Special Poster">Special Posters</option>
                                        </select>
                                        <ChevronDown size={14} className="dropdown-chevron" />
                                    </div>
                                </div>
                            )}

                            {view === 'poc' && (
                                <div className="master-filters-container">
                                    <div className="filter-icon-box">
                                        <Filter size={14} />
                                    </div>
                                    <div className="client-dropdown-wrapper">
                                        <select
                                            className="client-dropdown"
                                            value={selectedPocClient}
                                            onChange={(e) => setSelectedPocClient(e.target.value)}
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

                            {view !== 'teams' && view !== 'dashboard' && (
                                <>
                                    <div className="view-mode-toggle">
                                        <button
                                            onClick={() => setViewMode('month')}
                                            className={`view-mode-btn ${viewMode === 'month' ? 'active' : ''}`}
                                        >Month</button>
                                        <button
                                            onClick={() => setViewMode('week')}
                                            className={`view-mode-btn ${viewMode === 'week' ? 'active' : ''}`}
                                        >Week</button>
                                    </div>

                                    <div className="month-nav">
                                        <button onClick={handlePrev} className="month-btn"><ChevronLeft size={20} /></button>
                                        <span className="month-label" style={{ minWidth: '180px', textAlign: 'center' }}>
                                            {viewMode === 'month'
                                                ? (isBiMonthlyView
                                                    ? `${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d, yyyy')}`
                                                    : format(currentMonth, 'MMMM yyyy'))
                                                : `Week of ${format(startOfWeek(currentMonth, { weekStartsOn: 1 }), 'MMM d')}`
                                            }
                                        </span>
                                        <button onClick={handleNext} className="month-btn"><ChevronRight size={20} /></button>
                                        {isRefreshing && (
                                            <div className="refreshing-banner" style={{ marginLeft: '12px' }}>
                                                <Loader2 size={12} className="spinner-btn-icon" />
                                                <span>Refreshing...</span>
                                            </div>
                                        )}
                                    </div>

                                    {(userRole === 'ADMIN' || userRole === 'GM' || userRole === 'GENERAL MANAGER' || userRole === 'MANAGER' || userRole === 'PRODUCTION HEAD' || userRole === 'PH') && (
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

                                    <ScheduleExport
                                        data={view === 'poc' ? [] : calendarData}
                                        clientName={selectedClient === 'all' ? 'TrueUp Media' : selectedClientData?.company_name || 'Client'}
                                        month={currentMonth}
                                        batchType={selectedClientData?.batch_type || '1-1'}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Premium Stats Grid - Decoupled Global View */}
                {view === 'dashboard' && (
                <div className="premium-stats-grid" style={{ marginTop: '12px' }}>
                    {/* Monthly Pipeline */}
                    <div className="premium-stat-card pipeline">
                        <div className="card-accent-line"></div>
                        <div className="card-top">
                            <div className="label-group">
                                <span className="stat-label">MONTHLY PIPELINE</span>
                            </div>
                            <Layers size={20} className="stat-icon" />
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
                )}

                <FreelancerTaskModal 
                    isOpen={isFreelancerModalOpen}
                    onClose={() => setIsFreelancerModalOpen(false)}
                    onSuccess={() => fetchMasterCalendar().then(setCalendarData)}
                />


                {(view === 'master' || view === 'company' || (view === 'client' && selectedClient)) && (
                    <div className="status-summary-row">
                        <div className="status-pill status-pill-reels">
                            <span className="status-pill-label">Reels</span>
                            <span className="status-pill-count">{monthStatusCounts.reels}</span>
                        </div>
                        <div className="status-pill status-pill-posts">
                            <span className="status-pill-label">Posts</span>
                            <span className="status-pill-count">{monthStatusCounts.posts}</span>
                        </div>
                        <div className="status-pill status-pill-content-approved">
                            <span className="status-pill-label">Content Approved</span>
                            <span className="status-pill-count">{monthStatusCounts.contentApproved}</span>
                        </div>
                        <div className="status-pill status-pill-shoot-done">
                            <span className="status-pill-label">Shoot Done</span>
                            <span className="status-pill-count">{monthStatusCounts.shootDone}</span>
                        </div>
                    </div>
                )}



                {/* Removed global loading bar in favor of inline skeletons */}

                {view === 'dashboard' && (
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
                                {/* Left Panel: Progress Gauges */}
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
                                        <button onClick={() => setView('teams')} className="action-btn-hub">
                                            <Users size={14} />
                                            <span>Manage Teams</span>
                                        </button>
                                        <button onClick={() => setView('master')} className="action-btn-hub">
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

                        {/* Emergency Panels Moved Here */}
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
                )}

                {view === 'teams' ? (
                    <div className="teams-container">
                        <div className="teams-grid">
                            {loading && teamLeads.length === 0 ? (
                                <>
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="team-card">
                                            <div className="team-card-header">
                                                <div className="lead-info">
                                                    <Skeleton className="h-10 w-10 rounded-full" />
                                                    <div className="space-y-2">
                                                        <Skeleton className="h-4 w-24" />
                                                        <Skeleton className="h-3 w-16" />
                                                    </div>
                                                </div>
                                                <Skeleton className="h-8 w-24 rounded-lg" />
                                            </div>
                                            <div className="assigned-clients space-y-3" style={{ marginTop: '16px' }}>
                                                <Skeleton className="h-3 w-32" />
                                                <div className="flex gap-2">
                                                    <Skeleton className="h-6 w-20 rounded-full" />
                                                    <Skeleton className="h-6 w-24 rounded-full" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            ) : teamLeads.length > 0 ? (
                                teamLeads.map(lead => (
                                    <div key={lead.user_id} className="team-card">
                                        <div className="team-card-header">
                                            <div className="lead-info">
                                                <div className="lead-avatar">
                                                    {lead.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="lead-name">
                                                        {lead.name}
                                                        {lead.role_identifier && <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>({lead.role_identifier})</span>}
                                                    </h3>
                                                    <p className="lead-role">TEAM LEAD</p>
                                                </div>
                                            </div>
                                            <button
                                                className="btn-assign-small"
                                                onClick={() => {
                                                    setAssignTarget({ teamLead: lead });
                                                    setIsAssignModalOpen(true);
                                                }}
                                            >
                                                <Plus size={14} />
                                                Assign Client
                                            </button>
                                        </div>

                                        <div className="assigned-clients">
                                            <p className="assigned-label">Assigned Clients ({lead.clients?.length || 0})</p>
                                            <div className="assigned-list">
                                                {lead.clients?.length === 0 && (
                                                    <p className="empty-assigned">No clients assigned</p>
                                                )}
                                                {lead.clients?.map((c: Client) => (
                                                    <div key={c.id} className="assigned-item">
                                                        <span>{c.company_name}</span>
                                                        <button
                                                            className="btn-unassign"
                                                            onClick={() => handleAssignClient(c.id, '')}
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="teams-empty-state">
                                    <Users size={48} strokeWidth={1.5} />
                                    <p>No team leads found in the system.</p>
                                </div>
                            )}
                        </div>

                        {/* Assign Modal */}
                        {isAssignModalOpen && assignTarget && (
                            <div className="modal-overlay">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h3 className="modal-title">Assign Client to {assignTarget.teamLead.name}</h3>
                                        <button onClick={() => setIsAssignModalOpen(false)} className="modal-close"><X size={20} /></button>
                                    </div>
                                    <div className="modal-form">
                                        <div className="form-group">
                                            <label className="form-label">Select Client</label>
                                            <select
                                                className="form-input"
                                                onChange={(e) => handleAssignClient(e.target.value, assignTarget.teamLead.user_id)}
                                                defaultValue=""
                                            >
                                                <option value="" disabled>Choose a client...</option>
                                                {clients.filter(c => !teamLeads.some(l => l.clients?.some((lc: Client) => lc.id === c.id))).map(c => (
                                                    <option key={c.id} value={c.id}>{c.company_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                            Only showing clients not currently assigned to any team lead.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : view === 'tracking' ? (
                    <div className="tracking-page-container">
                        <header className="page-header" style={{ marginBottom: '24px' }}>
                            <div className="header-info">
                                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Activity className="text-accent" size={28} />
                                    Employee Tracking
                                </h1>
                                <p className="page-subtitle">Real-time productivity and engagement metrics</p>
                            </div>
                            <div className="header-controls">
                                <div className="date-picker-box">
                                    <CalendarIcon className="calendar-icon" size={18} />
                                    <input 
                                        type="date" 
                                        value={trackingDate}
                                        onChange={(e) => setTrackingDate(e.target.value)}
                                    />
                                </div>
                                <div className="search-input-box">
                                    <Search className="search-icon" size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="Search by name or email..." 
                                        value={trackingSearchQuery}
                                        onChange={(e) => setTrackingSearchQuery(e.target.value)}
                                    />
                                </div>
                                <button className="refresh-btn" onClick={() => fetchTrackingStats()} disabled={trackingLoading}>
                                    <RefreshCcw size={18} className={trackingLoading ? 'animate-spin' : ''} />
                                </button>
                                {trackingTab === 'employee' && trackingStats && trackingStats.employees.length > 0 && (
                                    <button 
                                        className="refresh-btn" 
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'auto', padding: '0 16px', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                                        onClick={() => downloadAllEmployeesReport(filteredEmployees, trackingDate)}
                                        title="Download All Employees Report"
                                    >
                                        <Download size={18} />
                                        <span style={{ fontSize: '13px', fontWeight: 700 }}>Export PDF</span>
                                    </button>
                                )}
                            </div>
                        </header>

                        <div className="tracking-tabs">
                            <button 
                                className={`tracking-tab-btn ${trackingTab === 'tl' ? 'active' : ''}`}
                                onClick={() => setTrackingTab('tl')}
                            >
                                <Users size={18} />
                                Team Leads
                            </button>
                            <button 
                                className={`tracking-tab-btn ${trackingTab === 'employee' ? 'active' : ''}`}
                                onClick={() => setTrackingTab('employee')}
                            >
                                <Briefcase size={18} />
                                Employees
                            </button>
                        </div>

                        {!trackingLoading && trackingStats && (
                            <div className="overview-summary-grid">
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="summary-card"
                                >
                                    <div className="summary-icon tl-bg"><Users size={20} /></div>
                                    <div className="summary-data">
                                        <span className="summary-label">TL Engagement</span>
                                        <span className="summary-value">
                                            {Math.round((trackingStats.teamLeads.reduce((acc, tl) => acc + tl.progress, 0) / (trackingStats.teamLeads.length || 1)) * 100)}%
                                        </span>
                                    </div>
                                    <div className="summary-trend text-success">
                                        <TrendingUp size={12} /> Today
                                    </div>
                                </motion.div>

                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="summary-card"
                                >
                                    <div className="summary-icon emp-bg"><Briefcase size={20} /></div>
                                    <div className="summary-data">
                                        <span className="summary-label">Prod. Velocity</span>
                                        <span className="summary-value">
                                            {Math.round((trackingStats.employees.reduce((acc, emp) => acc + emp.completionRate, 0) / (trackingStats.employees.length || 1)) * 100)}%
                                        </span>
                                    </div>
                                    <div className="summary-trend text-accent">
                                        <Target size={12} /> Current
                                    </div>
                                </motion.div>

                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="summary-card"
                                >
                                    <div className="summary-icon client-bg"><UserCircle2 size={20} /></div>
                                    <div className="summary-data">
                                        <span className="summary-label">Total Clients</span>
                                        <span className="summary-value">
                                            {trackingStats.teamLeads.reduce((acc, tl) => acc + tl.totalClients, 0)}
                                        </span>
                                    </div>
                                    <div className="summary-trend">Active</div>
                                </motion.div>

                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="summary-card"
                                >
                                    <div className="summary-icon task-bg"><CheckCircle2 size={20} /></div>
                                    <div className="summary-data">
                                        <span className="summary-label">Queue Load</span>
                                        <span className="summary-value">
                                            {trackingStats.employees.reduce((acc, emp) => acc + emp.assignedTasks, 0)}
                                        </span>
                                    </div>
                                    <div className="summary-trend">Items</div>
                                </motion.div>
                            </div>
                        )}

                        <main className="tracking-content">
                            <AnimatePresence mode="wait">
                                {trackingLoading ? (
                                    <motion.div 
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="loading-placeholder"
                                    >
                                        <div className="pulse-loader"></div>
                                        <p>Calculating productivity metrics...</p>
                                    </motion.div>
                                ) : trackingTab === 'tl' ? (
                                    <motion.div 
                                        key="tl-grid"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="stats-grid"
                                    >
                                        {filteredTLs.length > 0 ? filteredTLs.map((tl, index) => (
                                            <motion.div 
                                                key={tl.id}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="tracking-card tl-card"
                                            >
                                                <div className="card-header">
                                                    <div className="user-info-group">
                                                        <div className="user-avatar-small" style={{ color: 'var(--accent-secondary)' }}>
                                                            <Users size={20} />
                                                        </div>
                                                        <div className="user-meta">
                                                            <h3>{tl.name}</h3>
                                                            <p>Team Lead</p>
                                                        </div>
                                                    </div>
                                                    <div className="radial-group">
                                                        <TrackingRadialProgress 
                                                            progress={tl.progress} 
                                                            size={48} 
                                                            color={tl.progress >= 1 ? "var(--success)" : "var(--accent-secondary)"} 
                                                        />
                                                    </div>
                                                </div>

                                                <div className="card-body">
                                                    <div className="stats-2x2-grid">
                                                        <div className="metric-box poc">
                                                            <div className="box-header">
                                                                <MessageSquare size={12} style={{ color: 'var(--accent-secondary)' }} />
                                                                <span>POC COMMS</span>
                                                            </div>
                                                            <div className="box-content">
                                                                <div className="val-pair">
                                                                    <span className="pair-main">{tl.talkedToday}</span>
                                                                    <span className="pair-sub">/ {tl.totalClients}</span>
                                                                </div>
                                                                <div className="mini-progress">
                                                                    <div className="bar"><div className="fill" style={{ width: `${tl.progress * 100}%`, background: 'var(--accent-secondary)' }}></div></div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="metric-box content">
                                                            <div className="box-header">
                                                                <TrendingUp size={12} className="text-success" />
                                                                <span>CONTENT FLOW</span>
                                                            </div>
                                                            <div className="box-content">
                                                                <div className="val-pair">
                                                                    <span className="pair-main">{tl.todayContentDone}</span>
                                                                    <span className="pair-sub">/ {tl.todayContentTotal}</span>
                                                                </div>
                                                                <div className="mini-progress">
                                                                    <div className="bar"><div className="fill" style={{ width: `${tl.todayContentTotal > 0 ? (tl.todayContentDone / tl.todayContentTotal) * 100 : 0}%`, background: 'var(--success)' }}></div></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="compact-task-list" style={{ marginTop: '12px' }}>
                                                        <div className="list-header">
                                                            <Circle size={10} />
                                                            <span>CLIENTS STATUS (TODAY)</span>
                                                        </div>
                                                        <div className="tasks-container scrollable-list">
                                                            {tl.assignedClients.map(client => (
                                                                <div key={client.id} className="mini-task-item">
                                                                    <span className={`status-dot ${client.talkedToday ? 'done' : 'pending'}`}></span>
                                                                    <div className="task-info">
                                                                        <span className="task-name">{client.name}</span>
                                                                        <span className="task-client">{client.talkedToday ? 'Talked' : 'Not Contacted'}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )) : (
                                            <div className="no-data">No Team Leads found.</div>
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div 
                                        key="emp-grid"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="stats-grid"
                                    >
                                        {filteredEmployees.length > 0 ? filteredEmployees.map((emp, index) => (
                                            <motion.div 
                                                key={emp.id}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="tracking-card emp-card"
                                            >
                                                <div className="card-header">
                                                    <div className="user-info-group">
                                                        <div className="user-avatar-small">
                                                            <Briefcase size={20} />
                                                        </div>
                                                        <div className="user-meta">
                                                            <h3>{emp.name}</h3>
                                                            <p>{emp.role}</p>
                                                        </div>
                                                    </div>
                                                    <div className="radial-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <button 
                                                            onClick={() => downloadEmployeeReport(emp, trackingDate)}
                                                            title="Download Employee Report"
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: 'var(--text-secondary)',
                                                                cursor: 'pointer',
                                                                padding: '6px',
                                                                borderRadius: '8px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                                        >
                                                            <Download size={16} />
                                                        </button>
                                                        <TrackingRadialProgress 
                                                            progress={emp.completionRate} 
                                                            size={48} 
                                                            color={emp.completionRate >= 1 ? "var(--success)" : "var(--accent)"} 
                                                        />
                                                    </div>
                                                </div>

                                                <div className="card-body">
                                                    <div className="stats-2x2-grid">
                                                        <div className="metric-box daily">
                                                            <div className="box-header">
                                                                <Target size={12} className="text-accent" />
                                                                <span>DAILY</span>
                                                            </div>
                                                            <div className="box-content">
                                                                <div className="val-pair">
                                                                    <span className="pair-main">{emp.completedTasks}</span>
                                                                    <span className="pair-sub">/ {emp.assignedTasks}</span>
                                                                </div>
                                                                <div className="mini-progress">
                                                                    <div className="bar"><div className="fill" style={{ width: `${emp.completionRate * 100}%` }}></div></div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="metric-box monthly">
                                                            <div className="box-header">
                                                                <Trophy size={12} style={{ color: '#fbbf24' }} />
                                                                <span>MONTHLY</span>
                                                            </div>
                                                            <div className="box-content">
                                                                <div className="val-pair">
                                                                    <span className="pair-main">{emp.monthlyCompleted}</span>
                                                                    <span className="pair-sub">/ {emp.monthlyTotal}</span>
                                                                </div>
                                                                <div className="mini-progress">
                                                                    <div className="bar"><div className="fill monthly" style={{ width: `${emp.monthlyRate * 100}%` }}></div></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="compact-task-list" style={{ marginBottom: '8px' }}>
                                                        <button 
                                                            className="list-header" 
                                                            style={{ 
                                                                background: 'none', 
                                                                border: 'none', 
                                                                width: '100%', 
                                                                display: 'flex', 
                                                                justifyContent: 'space-between', 
                                                                alignItems: 'center', 
                                                                cursor: 'pointer',
                                                                padding: 0,
                                                                textAlign: 'left'
                                                            }}
                                                            onClick={() => setExpandedEmpClients(prev => ({ ...prev, [emp.id]: !prev[emp.id] }))}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <Briefcase size={10} />
                                                                <span>ASSIGNED CLIENTS ({(emp.assignedClients || []).length})</span>
                                                            </div>
                                                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                                                                {expandedEmpClients[emp.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                            </div>
                                                        </button>
                                                        
                                                        {expandedEmpClients[emp.id] && (
                                                            <div className="tasks-container scrollable-list" style={{ marginTop: '10px' }}>
                                                                {(emp.assignedClients || []).length > 0 ? (
                                                                    (emp.assignedClients || []).map(client => (
                                                                        <div key={client.id} className="mini-task-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                            <span className="task-name" style={{ fontSize: '13px' }}>{client.name}</span>
                                                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '6px', border: '1px solid var(--border)' }}>{client.role}</span>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '4px' }}>No assigned clients</div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {emp.tasks && emp.tasks.length > 0 && (
                                                        <div className="compact-task-list">
                                                            <div className="list-header">
                                                                <Activity size={10} />
                                                                <span>RECENT TASKS</span>
                                                            </div>
                                                            <div className="tasks-container scrollable-list">
                                                                {emp.tasks.map(task => {
                                                                    const isDone = (task.employeeStatus || '').toUpperCase() === 'COMPLETED';
                                                                    return (
                                                                        <div key={task.id} className="mini-task-item">
                                                                            <span className={`status-dot ${isDone ? 'done' : 'pending'}`}></span>
                                                                            <div className="task-info">
                                                                                <span className="task-name">{task.title}</span>
                                                                                <span className="task-client">{task.clientName}</span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )) : (
                                            <div className="no-data">No Employees found.</div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </main>
                    </div>
                ) : view === 'streaks' ? (
                    <StreakSystemView />
                ) : (view === 'client' && !selectedClient) ? (
                    <div className="client-selection-view">
                        <div className="search-container-premium">
                            <div className="search-box-premium">
                                <Search size={20} className="search-icon-premium" />
                                <input
                                    type="text"
                                    placeholder="Search clients..."
                                    value={clientSearchQuery}
                                    onChange={(e) => setClientSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="client-selection-grid">
                            {clients
                                .filter(c => c.company_name?.toLowerCase().includes(clientSearchQuery.toLowerCase()))
                                .map(client => (
                                    <div key={client.id} className="client-card-premium" onClick={() => setSelectedClient(client.id)}>
                                        <div className="card-icon-wrapper">
                                            <CalendarIcon size={22} />
                                        </div>
                                        <div className="card-details-premium">
                                            <h3 className="card-client-name">{client.company_name}</h3>
                                            <p className="card-client-email">{client.email || `${client.company_name.toLowerCase().replace(/\s+/g, '')}@trueupmedia.com`}</p>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        {clients.filter(c => c.company_name?.toLowerCase().includes(clientSearchQuery.toLowerCase())).length === 0 && (
                            <div className="empty-search-state">
                                <Search size={48} />
                                <p>No clients match your search query.</p>
                            </div>
                        )}
                    </div>
                ) : view === 'employees' ? (
                    <div className="employees-view" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '24px' }}>
                            {productionEmployees.map((emp: any) => {
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
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button 
                                                    className="btn-assign-client"
                                                    onClick={() => {
                                                        setAssigningToEmployee(emp);
                                                        setIsEmployeeAssignModalOpen(true);
                                                    }}
                                                >
                                                    <Plus size={16} />
                                                    Assign Client
                                                </button>
                                                <button 
                                                    className="btn-assign-client"
                                                    style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
                                                    onClick={() => {
                                                        setAssigningToEmployee(emp);
                                                        setIsTaskAssignModalOpen(true);
                                                    }}
                                                >
                                                    <Plus size={16} />
                                                    Assign Task
                                                </button>
                                            </div>
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
                                                                    const previousClients = [...clients];
                                                                    
                                                                    // Optimistic state update
                                                                    setClients(prev => prev.map(c => {
                                                                        if (c.id === client.id) {
                                                                            const updated = { ...c };
                                                                            if (emp.role_identifier === 'REEL') updated.reel_employee_id = null;
                                                                            else if (emp.role_identifier === 'POST') updated.post_employee_id = null;
                                                                            else updated.employee_id = null;
                                                                            return updated;
                                                                        }
                                                                        return c;
                                                                    }));
 
                                                                    try {
                                                                        await phApi.assignEmployeeToClient(client.id, null, emp.user_id);
                                                                        toastSuccess(`Unassigned ${client.company_name}`);
                                                                        
                                                                        // Silently refresh in background
                                                                        setTimeout(async () => {
                                                                            const cRes = await phApi.getClients();
                                                                            setClients(cRes.data);
                                                                        }, 500);
                                                                    } catch (err) {
                                                                        console.error(err);
                                                                        setClients(previousClients);
                                                                        toastError('Failed to unassign client.');
                                                                    }
                                                                }
                                                            }}
                                                         >
                                                             <X size={12} />
                                                         </button>
                                                     </div>
                                                 ))}
                                                 {assignedClients.length === 0 && (
                                                     <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', gridColumn: '1/-1', margin: 0 }}>No clients assigned yet.</p>
                                                 )}
                                             </div>
                                         </div>

                                         <div className="assigned-clients-section" style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                                             <h4 className="section-title">ASSIGNED TASKS ({assignableTasks.filter(t => t.assigned_to === emp.user_id && isTaskActiveForRole(t, emp.role_identifier)).length})</h4>
                                             <div className="client-tags-grid">
                                                 {assignableTasks.filter(t => t.assigned_to === emp.user_id && isTaskActiveForRole(t, emp.role_identifier)).map(task => (
                                                     <div 
                                                         key={task.id} 
                                                         className="client-tag-pill" 
                                                         style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer' }}
                                                         onClick={() => handleItemClick(task)}
                                                     >
                                                         <span>{task.clients?.company_name || 'No Client'} - {task.content_type}{task.title ? ` (${task.title})` : ''}</span>
                                                         <button 
                                                             className="remove-tag"
                                                             onClick={async (e) => {
                                                                 e.stopPropagation();
                                                                 if (confirm(`Unassign task "${task.title}" from ${emp.name}?`)) {
                                                                     const previousTasks = [...assignableTasks];
                                                                     // Optimistic state update
                                                                     setAssignableTasks(prev => prev.map(t => t.id === task.id ? { ...t, assigned_to: undefined, assigned_employee: undefined } : t));
                                                                     try {
                                                                         await phApi.assignEmployee(task.id, null);
                                                                         toastSuccess(`Unassigned task from ${emp.name}`);
                                                                         fetchAssignableTasks();
                                                                     } catch (err) {
                                                                         console.error(err);
                                                                         setAssignableTasks(previousTasks);
                                                                         toastError('Failed to unassign task.');
                                                                     }
                                                                 }
                                                             }}
                                                         >
                                                             <X size={12} />
                                                         </button>
                                                     </div>
                                                 ))}
                                                 {assignableTasks.filter(t => t.assigned_to === emp.user_id).length === 0 && (
                                                     <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', gridColumn: '1/-1', margin: 0 }}>No tasks assigned yet.</p>
                                                 )}
                                             </div>
                                         </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : view !== 'dashboard' && (
                    <>
                        {/* Legend Bar */}
                        <div className="calendar-legend-bar">
                            <div className="legend-item">
                                <span className="legend-color reel"></span>
                                <span className="legend-label">Reels</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-color post"></span>
                                <span className="legend-label">Posters</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-color emergency"></span>
                                <span className="legend-label">Emergency</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-color rescheduled"></span>
                                <span className="legend-label">Rescheduled</span>
                            </div>
                        </div>

                        <div className="calendar-card">
                            <div className="calendar-grid" style={{ gridTemplateRows: viewMode === 'week' ? 'auto 1fr' : 'auto' }}>
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                    <div key={day} className="calendar-header-cell">
                                        <span className="desktop-day">{day}</span>
                                        <span className="mobile-day">{day.charAt(0)}</span>
                                    </div>
                                ))}

                                {loading && calendarData.length === 0 && pocNotes.length === 0 ? (
                                    <>
                                        {Array.from({ length: 35 }).map((_, idx) => (
                                            <div key={idx} className="calendar-day opacity-50" style={{ minHeight: viewMode === 'week' ? '300px' : '110px' }}>
                                                <Skeleton className="h-4 w-4 mb-2" />
                                                <div className="space-y-1">
                                                    <Skeleton className="h-4 w-full rounded" />
                                                    <Skeleton className="h-4 w-3/4 rounded" />
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        {days.map((day, idx) => {
                                            const isPocView = view === 'poc';
                                            const dayContent = isPocView
                                                ? pocNotes.filter(note => isSameDay(parseISO(`${note.note_date}T00:00:00`), day))
                                                : calendarData.filter(item => {
                                                    const itemDate = getCalendarItemDate(item);
                                                    return isSameDay(itemDate, day);
                                                });
                                            const isOutOfPeriod = isCompanyMode ? false : !isDayInPeriod(day);

                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        if (isOutOfPeriod) return;
                                                        if (dayContent.length > 0 && !isPocView) {
                                                            if (window.innerWidth <= 768) {
                                                                setDailyAgenda({ date: day, items: dayContent as ContentItem[] });
                                                            } else {
                                                                handleItemClick(dayContent[0] as ContentItem);
                                                            }
                                                        } else if (view === 'client' && !isPocView) {
                                                            handleAddClick(day);
                                                        }
                                                    }}
                                                    className={`calendar-day ${viewMode === 'week' ? 'weekly-cell' : ''} ${!isCompanyMode && isOutOfPeriod ? 'other-month' : ''} ${isSameDay(day, new Date()) ? 'today' : ''}`}
                                                    style={{
                                                        minHeight: viewMode === 'week' ? '300px' : '110px',
                                                        cursor: isOutOfPeriod ? 'default' : 'pointer',
                                                        position: 'relative'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                        <span className="day-number">{format(day, 'd')}</span>
                                                        {!isMasterMode && view === 'client' && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleAddClick(day);
                                                                }}
                                                                className="add-task-btn"
                                                                style={{
                                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                                    border: '1px solid var(--border)',
                                                                    borderRadius: '6px',
                                                                    padding: '4px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: 'var(--text-muted)',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s ease'
                                                                }}
                                                                title="Add Task"
                                                            >
                                                                <Plus size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="day-items desktop-only">
                                                        {dayContent.map((item: any) => (
                                                            <div
                                                                key={item.id}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (isPocView) {
                                                                        handlePocNoteClick(item as PocNote);
                                                                    } else {
                                                                        handleItemClick(item);
                                                                    }
                                                                }}
                                                                className={isPocView ? 'content-item post' : `content-item ${(item as ContentItem).is_emergency ? 'emergency' : ((item as ContentItem).is_rescheduled || isCrossMonthRescheduled(item as ContentItem)) ? 'rescheduled' : (item as ContentItem).content_type.toLowerCase().replace(/\s+/g, '-')}`}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                                                                    {isPocView ? <FileText size={10} /> : item.content_type === 'Post' ? <FileText size={10} /> : <Video size={10} />}
                                                                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', flex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                                                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', minWidth: 0, flexShrink: 1 }}>
                                                                            {isPocView
                                                                                ? `[${item.clients?.company_name || 'Client'}] ${item.users?.role_identifier || item.users?.name || 'TL'}: ${item.note_text}`
                                                                                : `${isCrossMonthRescheduled(item) ? '[RM] ' : item.is_rescheduled ? '[R] ' : ''}${view === 'master' || view === 'company' ? `[${item.freelancer_name ? item.freelancer_name.substring(0, 3).toUpperCase() : getClientAbbreviation(item.clients?.company_name)}] ` : ''}${(item.content_type === 'Special Poster' || item.content_type === 'Special Day Poster' ? '🎉 ' : '') + item.content_type}`}
                                                                        </span>
                                                                        {!isPocView && (
                                                                            item.assigned_to ? (
                                                                                <span className="assignment-badge assigned" title={`Assigned to ${getEmployeeName(item.assigned_to)}`} style={{ padding: '1px 6px', marginTop: 0, lineHeight: '14px' }}>
                                                                                    <span className="assignment-name">{getEmployeeName(item.assigned_to)}</span>
                                                                                </span>
                                                                            ) : (
                                                                                <span className="assignment-badge unassigned" title="Unassigned" style={{ padding: '1px 6px', marginTop: 0, lineHeight: '14px' }}>
                                                                                    <span className="assignment-name">Unassigned</span>
                                                                                </span>
                                                                            )
                                                                        )}
                                                                    </span>
                                                                    {!isPocView && (
                                                                        item.status === 'POSTED' ? (
                                                                            <Check size={10} style={{ color: '#10b981', flexShrink: 0 }} />
                                                                        ) : (
                                                                            <AlertTriangle size={10} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                                                        )
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="mobile-day-indicators">
                                                        {dayContent.map((item: any) => {
                                                            const label = isPocView
                                                                ? 'POC'
                                                                : (view === 'master' || view === 'company')
                                                                    ? (item.freelancer_name ? item.freelancer_name.substring(0, 3).toUpperCase() : (getClientAbbreviation(item.clients?.company_name) || 'TUM'))
                                                                    : item.content_type.substring(0, 4).toUpperCase();
                                                            return (
                                                                <div
                                                                    key={item.id}
                                                                    className={`mobile-dot ${isPocView ? 'post' : (!isPocView && item.is_emergency) ? 'emergency' : (item.is_rescheduled || isCrossMonthRescheduled(item)) ? 'rescheduled' : item.content_type.toLowerCase().replace(/\s+/g, '-')}`}
                                                                >
                                                                    {label}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3 className="modal-title">{editingItem ? 'Edit Content' : 'Schedule New Content'}</h3>
                            <button onClick={() => { setIsModalOpen(false); setEditingItem(null); setIsRescheduling(false); }} className="modal-close"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">

                            <div className="form-group">
                                <label className="form-label">Content Type</label>
                                <select
                                    className="form-input"
                                    value={formData.content_type}
                                    onChange={e => setFormData({ ...formData, content_type: e.target.value as any })}
                                    disabled={!!editingItem}
                                >
                                    <option value="Post">Post</option>
                                    <option value="Reel">Reel</option>
                                    <option value="YouTube">YouTube</option>
                                    <option value="Special Poster">Special Poster</option>
                                </select>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                                        onChange={e => setSelectedDate(parseISO(e.target.value))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Time</label>
                                    <input type="time" className="form-input" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                className="btn-primary" 
                                disabled={updatingId === 'submitting'}
                                style={{ background: isRescheduling ? '#ef4444' : '' }}
                            >
                                {updatingId === 'submitting' ? (
                                    <>
                                        <Loader2 size={18} className="spinner-btn-icon" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        {isRescheduling ? <CalendarClock size={18} /> : editingItem ? <Edit size={18} /> : <Plus size={18} />}
                                        <span>{isRescheduling ? 'Confirm Reschedule' : editingItem ? 'Update Content' : 'Create Content Schedule'}</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {dailyAgenda && (
                <div className="modal-overlay" onClick={() => setDailyAgenda(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '340px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">{format(dailyAgenda.date, 'MMMM d, yyyy')}</h3>
                            <button onClick={() => setDailyAgenda(null)} className="modal-close"><X size={20} /></button>
                        </div>
                        <div className="agenda-list" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {dailyAgenda.items.map(item => (
                                <div
                                    key={item.id}
                                    className={`agenda-item ${item.content_type.toLowerCase()}`}
                                    onClick={() => {
                                        setDailyAgenda(null);
                                        handleItemClick(item);
                                    }}
                                    style={{
                                        padding: '12px', borderRadius: '10px',
                                        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                        display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'
                                    }}
                                >
                                    <div style={{
                                        width: '4px', height: '24px', borderRadius: '2px',
                                        background: item.content_type === 'Post' ? '#10b981' : item.content_type === 'Reel' ? '#6366f1' : '#f59e0b'
                                    }}></div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                            {item.clients?.company_name}
                                        </p>
                                        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{(item.content_type === 'Special Poster' || item.content_type === 'Special Day Poster' ? '🎉 ' : '') + item.content_type}</p>
                                    </div>
                                </div>
                            ))}

                            {!isMasterMode && view === 'client' && (
                                <button
                                    onClick={() => {
                                        setDailyAgenda(null);
                                        handleAddClick(dailyAgenda.date);
                                    }}
                                    style={{
                                        marginTop: '8px',
                                        padding: '14px',
                                        borderRadius: '12px',
                                        background: 'var(--accent)',
                                        color: 'white',
                                        border: 'none',
                                        fontWeight: 800,
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                                    }}
                                >
                                    <Plus size={18} />
                                    Add New Task
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {isDetailsOpen && activeItem && (
                <div className="modal-overlay">
                    <div className="modal-content modal-lg">
                        <div className="modal-header">
                            <div>
                                <div className="detail-meta">
                                    <span className={`type-badge ${activeItem.item.content_type.toLowerCase().replace(/\s+/g, '-')}`}>
                                        {activeItem.item.content_type === 'Special Poster' || activeItem.item.content_type === 'Special Day Poster' ? '🎉 ' + activeItem.item.content_type : activeItem.item.content_type}
                                    </span>
                                    <span className="meta-dot">•</span>
                                    {activeItem.item.freelancer_name ? (
                                        <span className="meta-client">{activeItem.item.freelancer_name}</span>
                                    ) : (
                                        activeItem.item.clients?.company_name && (
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
                                        )
                                    )}
                                    {dayTasks.length > 1 && (
                                        <>
                                            <span className="meta-dot">•</span>
                                            <span className="task-counter" style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase' }}>
                                                Task {dayTasks.findIndex(t => t.id === activeItem.item.id) + 1} of {dayTasks.length}
                                            </span>
                                        </>
                                    )}
                                </div>
                                <h3 className="modal-title" style={{ marginTop: '8px' }}>{activeItem.item.title || (activeItem.item.content_type === 'Special Poster' || activeItem.item.content_type === 'Special Day Poster' ? '🎉 ' + activeItem.item.content_type : activeItem.item.content_type)}</h3>
                                <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent)', marginTop: '4px' }}>
                                    Team Lead: {activeItem.item.clients?.team_lead?.name || 'Not Assigned'}
                                </p>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                <button
                                    onClick={() => handleEditClick(activeItem.item)}
                                    className="btn-icon"
                                    title="Edit Content"
                                    disabled={updatingId === activeItem.item.id}
                                    style={{ color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', opacity: updatingId === activeItem.item.id ? 0.5 : 1 }}
                                >
                                    <Edit size={18} />
                                </button>
                                <button
                                    onClick={() => handleDeleteContent(activeItem.item.id)}
                                    className="btn-icon"
                                    title="Delete Content"
                                    disabled={updatingId === activeItem.item.id}
                                    style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', opacity: updatingId === activeItem.item.id ? 0.5 : 1 }}
                                >
                                    {updatingId === activeItem.item.id ? <Loader2 size={18} className="spinner-btn-icon" /> : <Trash2 size={18} />}
                                </button>
                                <button onClick={() => setIsDetailsOpen(false)} className="modal-close"><X size={20} /></button>
                            </div>
                        </div>

                        <div className="detail-grid" style={{ padding: '32px' }}>
                            <div className="detail-main">


                                <div className="detail-section">
                                    <label className="detail-label">Schedule Info</label>
                                    <div className="detail-dates">
                                        {activeItem.item.is_rescheduled && activeItem.item.original_scheduled_datetime ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                                <div className="date-item">
                                                    <CalendarIcon size={16} />
                                                    <span className="date-display">
                                                        Actual Date: {formatIST(activeItem.item.original_scheduled_datetime, 'dd/MM/yyyy')} rescheduled to {formatIST(activeItem.item.scheduled_datetime, 'dd/MM/yy')}
                                                    </span>
                                                </div>
                                                {activeItem.item.reschedule_history && activeItem.item.reschedule_history.length > 0 && (
                                                    <div style={{ padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border)', width: '100%' }}>
                                                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Reschedule History</span>
                                                        {activeItem.item.reschedule_history.map((h: any, idx: number) => (
                                                            <div key={idx} style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
                                                                <span>{idx + 1}.</span>
                                                                <span>{formatIST(h.from, 'dd/MM/yyyy')}</span>
                                                                <span>➔</span>
                                                                <span>{formatIST(h.to, 'dd/MM/yy')}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="date-item">
                                                <CalendarIcon size={16} />
                                                <span className="date-display">{format(isCompanyMode ? getDisplayDate(activeItem.item.scheduled_datetime) : parseISO(activeItem.item.scheduled_datetime), 'PPP')}</span>
                                            </div>
                                        )}
                                        <div className="date-item">
                                            <Clock size={16} />
                                            <span className="date-display">{formatIST(activeItem.item.scheduled_datetime, 'p')}</span>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '16px' }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            background: 'var(--bg-elevated)',
                                            padding: '12px 16px',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border)',
                                            marginTop: '16px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <ShieldAlert size={18} color={activeItem.item.is_emergency ? "#ef4444" : "var(--text-muted)"} />
                                                <span style={{ fontSize: '14px', fontWeight: 700, color: activeItem.item.is_emergency ? "#ef4444" : "var(--text-primary)" }}>
                                                    Emergency Priority
                                                </span>
                                            </div>
                                            <button
                                                onClick={handleToggleEmergency}
                                                disabled={updatingId === activeItem.item.id}
                                                style={{
                                                    width: '44px',
                                                    height: '24px',
                                                    borderRadius: '12px',
                                                    background: activeItem.item.is_emergency ? '#ef4444' : 'var(--bg-surface)',
                                                    border: `1px solid ${activeItem.item.is_emergency ? '#ef4444' : 'var(--border)'}`,
                                                    position: 'relative',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s ease',
                                                    opacity: updatingId === activeItem.item.id ? 0.5 : 1
                                                }}
                                            >
                                                <div style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    borderRadius: '50%',
                                                    background: activeItem.item.is_emergency ? 'white' : 'var(--text-muted)',
                                                    position: 'absolute',
                                                    top: '2px',
                                                    left: activeItem.item.is_emergency ? '22px' : '2px',
                                                    transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                                                }}></div>
                                            </button>
                                        </div>
                                    </div>
                                    {(() => {
                                        const isOverdue = isBefore(parseISO(activeItem.item.scheduled_datetime), new Date()) && activeItem.item.status !== 'POSTED';
                                        if (isOverdue) {
                                            return (
                                                <button
                                                    onClick={() => handleRescheduleClick(activeItem.item)}
                                                    className="btn-reschedule"
                                                    style={{
                                                        marginTop: '16px',
                                                        width: '100%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px',
                                                        padding: '12px',
                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                        color: '#ef4444',
                                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                                        borderRadius: '10px',
                                                        fontWeight: 700,
                                                        fontSize: '13px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <CalendarClock size={18} />
                                                    Reschedule Task
                                                </button>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>
                            <div className="detail-workflow">
                                <label className="detail-label">Workflow Status</label>
                                <div className="workflow-content">
                                    {(() => {
                                        const flows: any = {
                                            'Reel': [
                                                'PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED',
                                                'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
                                            ],
                                            'YouTube': [
                                                'PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED',
                                                'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
                                            ],
                                            'Post': [
                                                'PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED',
                                                'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
                                            ],
                                            'Special Poster': [
                                                'PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED',
                                                'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
                                            ],
                                            'Special Day Poster': [
                                                'PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED',
                                                'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
                                            ]
                                        };
                                        const flow = flows[activeItem.item.content_type];
                                        const currentIdx = flow.indexOf(activeItem.item.status);
                                        const nextStatus = flow[currentIdx + 1];

                                        return (
                                            <>
                                                <div className="status-current">
                                                    <p className="status-label">Current</p>
                                                    <p className="status-value">{activeItem.item.status}</p>
                                                </div>
                                                {nextStatus && (
                                                    <div className="advance-section">
                                                        <div className="note-input-container">
                                                            <label className="detail-label">Add a note (optional)</label>
                                                            <textarea
                                                                className="status-note-textarea"
                                                                placeholder="Explain what was done in this stage..."
                                                                value={statusNote}
                                                                onChange={(e) => setStatusNote(e.target.value)}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button
                                                                onClick={() => handleStatusUpdate(nextStatus)}
                                                                className="btn-advance"
                                                                disabled={updatingId === activeItem.item.id}
                                                                style={{ flex: 1 }}
                                                            >
                                                                {updatingId === activeItem.item.id ? (
                                                                    <>
                                                                        <Loader2 size={18} className="spinner-btn-icon" />
                                                                        <span>Advancing...</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span>Advance to {nextStatus}</span>
                                                                        <ArrowRight size={18} className="advance-arrow" />
                                                                    </>
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={handleUndoStatus}
                                                                className="btn-advance"
                                                                disabled={updatingId === activeItem.item.id}
                                                                style={{ width: '48px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: 0, justifyContent: 'center', opacity: updatingId === activeItem.item.id ? 0.5 : 1 }}
                                                                title="Undo Last Step"
                                                            >
                                                                {updatingId === activeItem.item.id ? (
                                                                    <Loader2 size={18} className="spinner-btn-icon" />
                                                                ) : (
                                                                    <Undo2 size={18} />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                                {nextStatus && activeItem.item.status === 'WAITING FOR POSTING' && (
                                                    <div className="workflow-waiting-posting" style={{
                                                        marginTop: '16px',
                                                        padding: '16px',
                                                        background: 'rgba(59, 130, 246, 0.05)',
                                                        border: '1px solid rgba(59, 130, 246, 0.2)',
                                                        color: '#3b82f6',
                                                        borderRadius: '12px',
                                                        fontSize: '13px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        textAlign: 'center',
                                                        gap: '8px'
                                                    }}>
                                                        <Clock size={20} />
                                                        <div style={{ fontWeight: 700 }}>Waiting for Posting Team</div>
                                                        <div style={{ opacity: 0.8, fontSize: '12px' }}>This item has been sent to the posting team queue. They will mark it as posted once published.</div>
                                                    </div>
                                                )}
                                                {!nextStatus && (
                                                    <div className="workflow-done">
                                                        <CheckCircle2 size={18} />
                                                        Workflow Completed
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>

                            </div>
                        </div>

                        <div className="activity-log">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label className="detail-label" style={{ marginBottom: 0 }}>Activity Log</label>
                                <button
                                    onClick={handleUndoStatus}
                                    disabled={updatingId === activeItem.item.id}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px',
                                        background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                                        border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px',
                                        fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                                        opacity: updatingId === activeItem.item.id ? 0.5 : 1
                                    }}
                                >
                                    <Undo2 size={12} />
                                    Undo Last Step
                                </button>
                            </div>
                            <div className="timeline-container">
                                <div className="timeline-line"></div>
                                {(() => {
                                    const flows: any = {
                                        'Reel': [
                                            'PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED',
                                            'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
                                        ],
                                        'YouTube': [
                                            'PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED',
                                            'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
                                        ],
                                        'Post': [
                                            'PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED',
                                            'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
                                        ],
                                        'Special Poster': [
                                            'PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED',
                                            'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
                                        ],
                                        'Special Day Poster': [
                                            'PENDING', 'CONTENT NOT STARTED', 'CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED',
                                            'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
                                        ]
                                    };
                                    const flow = flows[activeItem.item.content_type] || [];
                                    const currentStatus = activeItem.item.status;
                                    const currentIdx = flow.indexOf(currentStatus);

                                    return flow.map((status: string, idx: number) => {
                                        const isCompleted = idx < currentIdx || currentStatus === 'POSTED';
                                        const isCurrent = idx === currentIdx && currentStatus !== 'POSTED';
                                        const historyEntry = activeItem.history.find((h: StatusHistoryItem) => h.new_status === status);

                                        return (
                                            <div key={status} className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                                                <div className="step-indicator">
                                                    {isCompleted ? (
                                                        <Check size={14} className="step-checkmark" />
                                                    ) : isCurrent ? (
                                                        <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%' }}></div>
                                                    ) : (
                                                        <div style={{ width: '6px', height: '6px', background: 'var(--border)', borderRadius: '50%' }}></div>
                                                    )}
                                                </div>
                                                <div className="step-content">
                                                    <span className="step-title">{status}</span>
                                                    {historyEntry && (
                                                        <div className="step-meta">
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span className="step-user">
                                                                    {historyEntry.users?.role_identifier || historyEntry.users?.name || 'Updated'}
                                                                </span>
                                                                <span className="step-time">
                                                                    {format(parseISO(historyEntry.changed_at), 'MMM d, HH:mm')}
                                                                </span>
                                                            </div>
                                                            {historyEntry.note && (
                                                                <div className="log-note" style={{ margin: '8px 0 0 0', background: 'rgba(255,255,255,0.02)', border: 'none', borderLeft: '2px solid var(--accent)' }}>
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
            )}

            {isPocDetailsOpen && selectedPocNote && (
                <div className="modal-overlay" onClick={() => {
                    setIsPocDetailsOpen(false);
                    setIsPocEditing(false);
                }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{isPocEditing ? 'Edit POC Note' : 'POC Note Details'}</h3>
                            <button onClick={() => {
                                setIsPocDetailsOpen(false);
                                setIsPocEditing(false);
                            }} className="modal-close"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleUpdatePocNote} className="modal-form">
                            <div className="form-group">
                                <label className="form-label">Date</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={format(parseISO(`${selectedPocNote.note_date}T00:00:00`), 'PPP')}
                                    readOnly
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Added By</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={selectedPocNote.users?.role_identifier || selectedPocNote.users?.name || 'Team Lead'}
                                    readOnly
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Client</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={selectedPocNote.clients?.company_name || 'Client not selected'}
                                    readOnly
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Note</label>
                                <textarea
                                    className="form-input"
                                                                value={pocEditNoteText}
                                    onChange={(e) => setPocEditNoteText(e.target.value)}
                                    rows={5}
                                    required
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button 
                                    type="submit" 
                                    className="btn-primary" 
                                    disabled={updatingId === 'poc-submitting'}
                                    style={{ flex: 1 }}
                                >
                                    {updatingId === 'poc-submitting' ? (
                                        <>
                                            <Loader2 size={18} className="spinner-btn-icon" style={{ marginRight: '8px' }} />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <span>Save Changes</span>
                                    )}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleDeletePocNote} 
                                    className="btn-add"
                                    disabled={updatingId === 'poc-submitting'}
                                    style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', opacity: updatingId === 'poc-submitting' ? 0.5 : 1 }}
                                >
                                    Delete Note
                                </button>
                            </div>

                            {selectedPocNote.history && selectedPocNote.history.length > 0 && (
                                <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                                    <label className="form-label" style={{ fontWeight: 'bold', marginBottom: '12px', display: 'block' }}>Edit History</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {selectedPocNote.history.map((h, idx) => (
                                            <div key={idx} style={{ padding: '10px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                                    <span>Edited on {format(parseISO(h.updated_at), 'MMM d, yyyy h:mm a')}</span>
                                                </div>
                                                <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>"{h.note_text}"</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {isEmployeeAssignModalOpen && assigningToEmployee && (
                <div className="modal-overlay" onClick={() => setIsEmployeeAssignModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <div>
                                <h3 className="modal-title">Assign Client to {assigningToEmployee.name}</h3>
                                <p className="modal-subtitle">Select a client to enable auto-assignment for production tasks.</p>
                            </div>
                            <button onClick={() => setIsEmployeeAssignModalOpen(false)} className="modal-close"><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ padding: '20px' }}>
                            <div className="search-box" style={{ marginBottom: '20px', width: '100%', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 14px' }}>
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
                                                     const previousClients = [...clients];

                                                     // Optimistic state update
                                                     setClients(prev => prev.map(c => {
                                                         if (c.id === client.id) {
                                                             const updated = { ...c };
                                                             if (assigningToEmployee.role_identifier === 'REEL') updated.reel_employee_id = assigningToEmployee.user_id;
                                                             else if (assigningToEmployee.role_identifier === 'POST') updated.post_employee_id = assigningToEmployee.user_id;
                                                             else updated.employee_id = assigningToEmployee.user_id;
                                                             return updated;
                                                         }
                                                         return c;
                                                     }));
                                                     setIsEmployeeAssignModalOpen(false);

                                                     try {
                                                         await phApi.assignEmployeeToClient(client.id, assigningToEmployee.user_id);
                                                         toastSuccess(`Assigned ${client.company_name} to ${assigningToEmployee.name}`);
                                                         
                                                         // Silently refresh in background
                                                         setTimeout(async () => {
                                                             const cRes = await phApi.getClients();
                                                             setClients(cRes.data);
                                                         }, 500);
                                                     } catch (err: any) {
                                                         console.error(err);
                                                         setClients(previousClients);
                                                         toastError(err.response?.data?.error || 'Failed to assign client');
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
                                                                    {isCurrent ? 'Currently Assigned (Reel)' : `Reel Editor: ${productionEmployees.find((e: any) => e.user_id === client.reel_employee_id)?.name || 'Other'}`}
                                                                </span>
                                                            );
                                                        }
                                                        return <span style={{ fontSize: '11px', color: 'var(--success)' }}>Reel Editor Available</span>;
                                                    } else if (assigningToEmployee.role_identifier === 'POST') {
                                                        if (client.post_employee_id) {
                                                            const isCurrent = client.post_employee_id === assigningToEmployee.user_id;
                                                            return (
                                                                <span style={{ fontSize: '11px', color: isCurrent ? 'var(--accent)' : 'var(--text-muted)' }}>
                                                                    {isCurrent ? 'Currently Assigned (Post)' : `Poster Editor: ${productionEmployees.find((e: any) => e.user_id === client.post_employee_id)?.name || 'Other'}`}
                                                                </span>
                                                            );
                                                        }
                                                        return <span style={{ fontSize: '11px', color: 'var(--success)' }}>Poster Editor Available</span>;
                                                    } else {
                                                        if (client.employee_id) {
                                                            const isCurrent = client.employee_id === assigningToEmployee.user_id;
                                                            return (
                                                                <span style={{ fontSize: '11px', color: isCurrent ? 'var(--accent)' : 'var(--text-muted)' }}>
                                                                    {isCurrent ? 'Currently Assigned' : `Assigned to ${productionEmployees.find((e: any) => e.user_id === client.employee_id)?.name || 'Other'}`}
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

            {isTaskAssignModalOpen && assigningToEmployee && (
                <div className="modal-overlay" onClick={() => setIsTaskAssignModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <div>
                                <h3 className="modal-title">Assign Task to {assigningToEmployee.name}</h3>
                                <p className="modal-subtitle">Select an individual task to assign to this employee.</p>
                            </div>
                            <button onClick={() => setIsTaskAssignModalOpen(false)} className="modal-close"><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ padding: '20px' }}>
                            <div className="search-box" style={{ marginBottom: '20px', width: '100%', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 14px' }}>
                                <Search size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Search tasks by title or client name..." 
                                    value={taskSearchTerm}
                                    onChange={(e) => setTaskSearchTerm(e.target.value)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '14px', width: '100%' }} 
                                />
                            </div>
                            <div className="client-selection-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {assignableTasks
                                    .filter(task => 
                                        isTaskActiveForRole(task, assigningToEmployee.role_identifier) && (
                                            (task.title || '').toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
                                            (task.clients?.company_name || '').toLowerCase().includes(taskSearchTerm.toLowerCase())
                                        )
                                    )
                                    .map(task => {
                                        const isAlreadyAssignedToThisEmp = task.assigned_to === assigningToEmployee.user_id;
                                        const assignedName = task.assigned_to ? (productionEmployees.find(e => e.user_id === task.assigned_to)?.name || 'Someone else') : null;

                                        return (
                                            <div 
                                                key={task.id} 
                                                className={`client-selection-item ${isAlreadyAssignedToThisEmp ? 'already-assigned' : ''}`}
                                                onClick={async () => {
                                                     if (isAlreadyAssignedToThisEmp) return;
                                                     const previousTasks = [...assignableTasks];

                                                     // Optimistic state update
                                                     setAssignableTasks(prev => prev.map(t => {
                                                         if (t.id === task.id) {
                                                             return { ...t, assigned_to: assigningToEmployee.user_id, assigned_employee: { name: assigningToEmployee.name } };
                                                         }
                                                         return t;
                                                     }));
                                                     setIsTaskAssignModalOpen(false);

                                                     try {
                                                         await phApi.assignEmployee(task.id, assigningToEmployee.user_id);
                                                         toastSuccess(`Assigned task "${task.title}" to ${assigningToEmployee.name}`);
                                                         fetchAssignableTasks();
                                                     } catch (err: any) {
                                                         console.error(err);
                                                         setAssignableTasks(previousTasks);
                                                         toastError(err.response?.data?.error || 'Failed to assign task');
                                                     }
                                                 }}
                                                style={{ 
                                                    padding: '12px 16px', 
                                                    borderRadius: '10px', 
                                                    cursor: isAlreadyAssignedToThisEmp ? 'default' : 'pointer',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: '8px',
                                                    background: isAlreadyAssignedToThisEmp ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-elevated)',
                                                    border: isAlreadyAssignedToThisEmp ? '1px solid var(--accent)' : '1px solid var(--border)',
                                                    opacity: isAlreadyAssignedToThisEmp ? 0.7 : 1
                                                }}
                                            >
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <span style={{ fontWeight: 600 }}>{task.clients?.company_name || 'No Client'} - {task.content_type}</span>
                                                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{task.title}</span>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Status: {task.status}</span>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    {isAlreadyAssignedToThisEmp ? (
                                                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>Assigned to them</span>
                                                    ) : assignedName ? (
                                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assigned to: {assignedName}</span>
                                                    ) : (
                                                        <span style={{ fontSize: '12px', color: 'var(--success)' }}>Unassigned</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes slideUp {
                    from { transform: translate(-50%, 20px); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
                .view-mode-btn.active {
                    background: var(--primary) !important;
                    color: white !important;
                }
            `}</style>
        </div>
    );
}
