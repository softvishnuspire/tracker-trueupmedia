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
    subDays,
    startOfDay,
    endOfDay
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
    Search,
    LogOut,
    Check,
    ShieldAlert,
    AlertTriangle,
    Menu,
    CalendarClock,
    Undo2,
    Filter,
    Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { tlApi, gmApi, emergencyApi, dashboardApi, ContentItem, PocNote, StatusHistoryItem, settingsApi } from '@/lib/api';
import { createClient } from '@/utils/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import NotificationBell from '@/components/NotificationBell';
import ScheduleExport from '@/components/ScheduleExport';
import { getClientAbbreviation, formatIST } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';
import { usePageLoading } from '@/components/ui/TopProgressBar';

import ThemeToggle from '@/components/ThemeToggle';
import '../../admin/admin.css'; // Using Admin Panel UI styles
import './tl.css'; // Team Lead specific styles (including scrolling)

interface ContentDetails {
    item: ContentItem;
    history: StatusHistoryItem[];
}

const normalizeRole = (role?: string | null) => (role || '').trim().toLowerCase().replace(/[_\s]+/g, ' ');

export default function TLDashboard() {
    const DISPLAY_OFFSET_DAYS = 7;
    const supabase = createClient();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>('all');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [calendarData, setCalendarData] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'dashboard' | 'client' | 'master' | 'company' | 'poc'>('dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [todayStats, setTodayStats] = useState({ total: 0, completed: 0, percentage: 0, remaining: 0 });
    const [emergencyTasks, setEmergencyTasks] = useState<ContentItem[]>([]);
    const [pendingTasks, setPendingTasks] = useState<ContentItem[]>([]);
    const [pocNotes, setPocNotes] = useState<PocNote[]>([]);
    const [isPocModalOpen, setIsPocModalOpen] = useState(false);
    const [selectedPocDate, setSelectedPocDate] = useState<Date | null>(null);
    const [selectedPocClient, setSelectedPocClient] = useState<string>('');
    const [pocNoteText, setPocNoteText] = useState('');
    const [selectedPocNote, setSelectedPocNote] = useState<PocNote | null>(null);
    const [isPocDetailsOpen, setIsPocDetailsOpen] = useState(false);
    const [isPocEditing, setIsPocEditing] = useState(false);
    const [pocEditNoteText, setPocEditNoteText] = useState('');
    const [showCompanyCalendar, setShowCompanyCalendar] = useState(true);
    
    const { success: toastSuccess, error: toastError } = useToast();
    const { startLoading, stopLoading } = usePageLoading();
    
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSavingPoc, setIsSavingPoc] = useState(false);
    const [isUpdatingPoc, setIsUpdatingPoc] = useState(false);
    const [isDeletingPoc, setIsDeletingPoc] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        if (calendarData.length > 0) {
            const today = new Date();
            const todayItems = calendarData.filter(item => isSameDay(parseISO(item.scheduled_datetime), today));
            const totalToday = todayItems.length;
            const completedToday = todayItems.filter(item => item.status === 'POSTED').length;
            setTodayStats({
                total: totalToday,
                completed: completedToday,
                remaining: totalToday - completedToday,
                percentage: totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0
            });
        } else {
            setTodayStats({ total: 0, completed: 0, percentage: 0, remaining: 0 });
        }
    }, [calendarData]);

    
    // Details modal state
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [activeItem, setActiveItem] = useState<ContentDetails | null>(null);
    const [statusNote, setStatusNote] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [dayTasks, setDayTasks] = useState<ContentItem[]>([]);


    const isMasterMode = view === 'master' || view === 'company';
    const isCompanyMode = view === 'company';
    const getDisplayDate = (scheduledDateTime: string) => subDays(parseISO(scheduledDateTime), DISPLAY_OFFSET_DAYS);
    const getCalendarItemDate = (item: ContentItem) =>
        isCompanyMode ? getDisplayDate(item.scheduled_datetime) : parseISO(item.scheduled_datetime);






    const fetchClients = useCallback(async (tlId: string) => {
        try {
            const res = await tlApi.getClients(tlId);
            setClients(res.data);
            if (res.data.length > 0 && selectedClient === 'all' && view === 'client') {
                setSelectedClient(res.data[0].id);
            }
            if (res.data.length > 0 && !selectedPocClient) {
                setSelectedPocClient(res.data[0].id);
            }
        } catch (err) { console.error('Error fetching clients:', err); }
    }, [selectedClient, selectedPocClient, view]);

    const getClientBatchType = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        return client?.batch_type || '1-1';
    };

    const fetchClientCalendar = useCallback(async (isSilent = false) => {
        if (!user || !selectedClient || selectedClient === 'all') return;
        if (!isSilent) {
            startLoading();
            if (calendarData.length === 0) {
                setLoading(true);
            } else {
                setIsRefreshing(true);
            }
        }
        try {
            const client = clients.find(c => c.id === selectedClient);
            const is1515 = client?.batch_type === '15-15';

            let data = [];
            if (is1515) {
                const isSecondHalf = currentMonth.getDate() >= 15;
                const startMonth = isSecondHalf ? currentMonth : subMonths(currentMonth, 1);
                const endMonth = isSecondHalf ? addMonths(currentMonth, 1) : currentMonth;

                const [resStart, resEnd] = await Promise.all([
                    tlApi.getCalendar(selectedClient, format(startMonth, 'yyyy-MM'), user.id),
                    tlApi.getCalendar(selectedClient, format(endMonth, 'yyyy-MM'), user.id)
                ]);
                data = [...(resStart.data || []), ...(resEnd.data || [])];
            } else {
                const res = await tlApi.getCalendar(selectedClient, format(currentMonth, 'yyyy-MM'), user.id);
                data = res.data || [];
            }

            setCalendarData(data);
        } catch (err) { 
            console.error('Error fetching calendar:', err);
            toastError('Failed to refresh client calendar.');
        } finally { 
            setLoading(false); 
            setIsRefreshing(false);
            if (!isSilent) stopLoading();
        }
    }, [user, selectedClient, currentMonth, clients, calendarData.length]);


    const fetchMasterCalendar = useCallback(async (isSilent = false) => {
        if (!user) return;
        if (!isSilent) {
            startLoading();
            if (calendarData.length === 0) {
                setLoading(true);
            } else {
                setIsRefreshing(true);
            }
        }
        try {
            const clientId = view === 'dashboard' ? undefined : (selectedClient === 'all' ? undefined : selectedClient);
            if (view === 'company') {
                const monthWindows = [subMonths(currentMonth, 1), currentMonth, addMonths(currentMonth, 1)];
                const responses = await Promise.all(
                    monthWindows.map((monthDate) =>
                        tlApi.getMasterCalendar(format(monthDate, 'yyyy-MM'), user.id, clientId)
                    )
                );
                const merged = responses.flatMap((response) => response.data || []);
                const deduped = Array.from(new Map(merged.map((item) => [item.id, item])).values());
                setCalendarData(deduped);
            } else if (view === 'dashboard') {
                const isSecondHalf = currentMonth.getDate() >= 15;
                const startMonth = isSecondHalf ? currentMonth : subMonths(currentMonth, 1);
                const endMonth = isSecondHalf ? addMonths(currentMonth, 1) : currentMonth;
                const responses = await Promise.all([
                    tlApi.getMasterCalendar(format(startMonth, 'yyyy-MM'), user.id, clientId),
                    tlApi.getMasterCalendar(format(endMonth, 'yyyy-MM'), user.id, clientId)
                ]);
                const merged = responses.flatMap((response) => response.data || []);
                const deduped = Array.from(new Map(merged.map((item) => [item.id, item])).values());
                setCalendarData(deduped);
            } else {
                const currentMonthStr = format(currentMonth, 'yyyy-MM');
                const res = await tlApi.getMasterCalendar(currentMonthStr, user.id, clientId);
                setCalendarData(res.data || []);
            }
            
            // Fetch and filter dashboard lists
            const [emergencyRes, pendingRes] = await Promise.all([
                emergencyApi.getAll(),
                dashboardApi.getPendingImportant()
            ]);
            
            setEmergencyTasks(emergencyRes.data || []);
            setPendingTasks(pendingRes.data || []);
        } catch (err) { 
            console.error(err); 
            toastError('Failed to refresh master calendar.');
        } finally { 
            setLoading(false); 
            setIsRefreshing(false);
            if (!isSilent) stopLoading();
        }
    }, [user, selectedClient, currentMonth, view, calendarData.length]);

    const fetchPocNotes = useCallback(async (isSilent = false) => {
        if (!user) return;
        if (!isSilent) {
            startLoading();
            if (pocNotes.length === 0) {
                setLoading(true);
            } else {
                setIsRefreshing(true);
            }
        }
        try {
            const currentMonthStr = format(currentMonth, 'yyyy-MM');
            const res = await tlApi.getPocNotes(currentMonthStr, user.id);
            setPocNotes(res.data || []);
        } catch (err) {
            console.error('Error fetching POC notes:', err);
            toastError('Failed to refresh POC notes.');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
            if (!isSilent) stopLoading();
        }
    }, [user, currentMonth, pocNotes.length]);

    useEffect(() => {
        if (user) {
            if (view === 'master' || view === 'company' || view === 'dashboard') {
                fetchMasterCalendar();
            } else if (view === 'poc') {
                fetchPocNotes();
            } else if (view === 'client' && selectedClient && selectedClient !== 'all') {
                fetchClientCalendar();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedClient, currentMonth, view, user]);

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
            const clientIdParam = params.get('clientId') || 'all';
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

    // Dedicated Auth & Profile Check (Runs once on mount)
    useEffect(() => {
        const checkUser = async () => {
            setLoading(true);
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();

                if (!authUser) {
                    window.location.href = '/';
                    return;
                }

                // Verify role
                const { data: profileData, error: profileError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('user_id', authUser.id)
                    .single();

                const role = normalizeRole(profileData?.role);
                const isTeamLead = ['tl', 'tl1', 'tl2', 'team lead'].includes(role);

                if (profileError || !profileData || !isTeamLead) {
                    console.warn('Profile validation check:', { role: profileData?.role, isTeamLead });
                }

                setUser(authUser);
                setProfile(profileData);
            } catch (err) {
                console.error('Initialization error:', err);
            } finally {
                setLoading(false);
            }
        };
        checkUser();
    }, [supabase]);

    // Dedicated Client Fetch (Runs when user is available)
    useEffect(() => {
        if (user) {
            fetchClients(user.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handlePocDayClick = (date: Date) => {
        setSelectedPocDate(date);
        setPocNoteText('');
        setIsPocModalOpen(true);
    };

    const handleSavePocNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedPocDate || !selectedPocClient || !pocNoteText.trim()) return;
        setIsSavingPoc(true);
        try {
            await tlApi.addPocNote({
                tlId: user.id,
                client_id: selectedPocClient,
                note_date: format(selectedPocDate, 'yyyy-MM-dd'),
                note_text: pocNoteText.trim()
            });
            setIsPocModalOpen(false);
            setPocNoteText('');
            toastSuccess('POC note saved successfully!');
            await fetchPocNotes(true);
        } catch (err) {
            console.error('Error saving POC note:', err);
            toastError('Failed to save POC note.');
        } finally {
            setIsSavingPoc(false);
        }
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
        setIsUpdatingPoc(true);
        try {
            const actorId = user?.id || profile?.user_id;
            const res = await tlApi.updatePocNote(selectedPocNote.id, {
                note_text: pocEditNoteText.trim(),
                actor_id: actorId
            });
            setIsPocEditing(false);
            setSelectedPocNote(res.data);
            toastSuccess('POC note updated successfully!');
            await fetchPocNotes(true);
        } catch (err) {
            console.error('Error updating POC note:', err);
            toastError('Failed to update POC note.');
        } finally {
            setIsUpdatingPoc(false);
        }
    };

    const handleDeletePocNote = async () => {
        if (!selectedPocNote) return;
        if (!window.confirm('Are you sure you want to delete this POC note? This action cannot be undone.')) return;
        setIsDeletingPoc(true);
        try {
            await tlApi.deletePocNote(selectedPocNote.id);
            setIsPocDetailsOpen(false);
            setSelectedPocNote(null);
            toastSuccess('POC note deleted successfully!');
            await fetchPocNotes(true);
        } catch (err) {
            console.error('Error deleting POC note:', err);
            toastError('Failed to delete POC note.');
        } finally {
            setIsDeletingPoc(false);
        }
    };

    const handlePrev = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNext = () => setCurrentMonth(addMonths(currentMonth, 1));

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
            const res = await gmApi.getContentDetails(nextTask.id);
            setActiveItem(res.data);
            setStatusNote('');
        } catch (err) { console.error(err); }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!activeItem) return;
        setUpdatingId(activeItem.item.id);

        const previousActiveItem = { ...activeItem };
        const previousCalendarData = [...calendarData];

        // Optimistic UI updates
        const updatedItem = { ...activeItem.item, status: newStatus };
        setActiveItem({
            ...activeItem,
            item: updatedItem
        });
        setCalendarData((prev) => prev.map(item => 
            item.id === activeItem.item.id ? updatedItem : item
        ));

        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            const actorId = authUser?.id || profile?.user_id || user?.user_id;
            await gmApi.updateStatus(activeItem.item.id, newStatus, statusNote.trim() || undefined, actorId);
            toastSuccess(`Status updated to ${newStatus}`);
            setStatusNote('');

            // Background refresh debounced
            setTimeout(async () => {
                try {
                    const res = await gmApi.getContentDetails(activeItem.item.id);
                    setActiveItem(res.data);
                    if (isMasterMode) fetchMasterCalendar(true); else fetchClientCalendar(true);
                } catch (err) {
                    console.error('Background refresh failed:', err);
                }
            }, 500);

        } catch (err: any) {
            console.error('Status update error:', err);
            // Rollback
            setActiveItem(previousActiveItem);
            setCalendarData(previousCalendarData);
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

        try {
            await tlApi.undoStatus(activeItem.item.id);
            toastSuccess('Status change undone.');

            // Background refresh debounced
            setTimeout(async () => {
                try {
                    const res = await gmApi.getContentDetails(activeItem.item.id);
                    setActiveItem(res.data);
                    if (isMasterMode) fetchMasterCalendar(true); else fetchClientCalendar(true);
                } catch (err) {
                    console.error('Background refresh failed:', err);
                }
            }, 500);

        } catch (err) {
            console.error(err);
            setActiveItem(previousActiveItem);
            setCalendarData(previousCalendarData);
            toastError('Failed to undo status change.');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };


    const selectedClientData = clients.find(c => c.id === selectedClient);
    const isBiMonthlyView = view === 'client' && selectedClient && selectedClient !== 'all' && selectedClientData?.batch_type === '15-15';

    const periodStart = isBiMonthlyView
        ? (currentMonth.getDate() >= 15
            ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 15)
            : new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 15))
        : startOfMonth(currentMonth);

    const periodEnd = isBiMonthlyView
        ? (currentMonth.getDate() >= 15
            ? new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 15)
            : new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 15))
        : endOfMonth(currentMonth);

    const days = eachDayOfInterval({
        start: startOfWeek(periodStart, { weekStartsOn: 1 }),
        end: endOfWeek(periodEnd, { weekStartsOn: 1 })
    });

    const isDayInPeriod = (day: Date): boolean => {
        if (!isBiMonthlyView) return isSameMonth(day, currentMonth);
        return day >= startOfDay(periodStart) && day <= endOfDay(periodEnd);
    };

    const getPeriodLabel = (): string => {
        if (!isBiMonthlyView) return format(currentMonth, 'MMMM yyyy');
        return `${format(periodStart, 'd MMM')} \u2013 ${format(periodEnd, 'd MMM yyyy')}`;
    };

    const filteredCalendarData = calendarData.filter(item => isDayInPeriod(getCalendarItemDate(item)));

    const isItemCompleted = (status: string) => {
        const s = (status || '').toUpperCase();
        return s === 'WAITING FOR POSTING' || s === 'POSTED';
    };

    const contentApprovedStatuses = ['CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED'];
    const shootDoneStatuses = ['SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'];

    const monthStatusCounts = filteredCalendarData.reduce(
        (acc, item) => {
            const normalizedStatus = (item.status || '').toUpperCase();
            const normalizedType = (item.content_type || '').toUpperCase();

            if (contentApprovedStatuses.includes(normalizedStatus)) acc.contentApproved += 1;
            
            if (normalizedType === 'REEL' || normalizedType === 'YOUTUBE') {
                if (shootDoneStatuses.includes(normalizedStatus)) acc.shootDone += 1;
            }

            if (normalizedStatus === 'POSTED') acc.posted += 1;

            if (normalizedType === 'REEL') acc.reels += 1;
            if (normalizedType === 'POST') acc.posts += 1;

            const completed = isItemCompleted(item.status);
            if (completed) {
                acc.completedCount += 1;
                if (normalizedType === 'REEL') acc.completedReels += 1;
                if (normalizedType === 'POST') acc.completedPosts += 1;
            } else {
                acc.pendingCount += 1;
                if (normalizedType === 'REEL') acc.pendingReels += 1;
                if (normalizedType === 'POST') acc.pendingPosts += 1;
            }

            return acc;
        },
        { 
            contentApproved: 0, shootDone: 0, posted: 0, reels: 0, posts: 0,
            pendingCount: 0, completedCount: 0, 
            pendingReels: 0, pendingPosts: 0, 
            completedReels: 0, completedPosts: 0 
        }
    );

    const monthTotal = filteredCalendarData.length;
    const monthCompleted = monthStatusCounts.posted;
    const monthPercentage = monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0;
    
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const weekItems = calendarData.filter(item => {
        const itemDate = parseISO(item.scheduled_datetime);
        return itemDate >= weekStart && itemDate <= weekEnd;
    });
    const weekTotal = weekItems.length;
    const weekCompleted = weekItems.filter(item => (item.status || '').toUpperCase() === 'POSTED').length;
    const weekPercentage = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;

    const filteredClients = clients.filter(c => 
        c.company_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const clientStatuses = clients.map(client => {
        const is1515 = client.batch_type === '15-15';
        const isSecondHalf = currentMonth.getDate() >= 15;
        
        const clientPeriodStart = is1515
            ? (isSecondHalf
                ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 15)
                : new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 15))
            : startOfMonth(currentMonth);

        const clientPeriodEnd = is1515
            ? (isSecondHalf
                ? new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 15)
                : new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 15))
            : endOfMonth(currentMonth);

        const clientItems = calendarData.filter(item => {
            if (item.client_id !== client.id) return false;
            const itemDate = parseISO(item.scheduled_datetime);
            return itemDate >= startOfDay(clientPeriodStart) && itemDate <= endOfDay(clientPeriodEnd);
        });

        const totalTasks = clientItems.length;

        let reelsCount = 0;
        let reelsCompleted = 0;
        let postsCount = 0;
        let postsCompleted = 0;
        let shootDoneCount = 0;
        let contentApprovedCount = 0;
        let completedCount = 0;

        clientItems.forEach(item => {
            const normalizedStatus = (item.status || '').toUpperCase();
            const normalizedType = (item.content_type || '').toUpperCase();
            const isCompleted = isItemCompleted(item.status);

            if (normalizedType === 'REEL') {
                reelsCount += 1;
                if (isCompleted) reelsCompleted += 1;
            } else if (normalizedType === 'POST') {
                postsCount += 1;
                if (isCompleted) postsCompleted += 1;
            }

            if (isCompleted) {
                completedCount += 1;
            }

            if (contentApprovedStatuses.includes(normalizedStatus)) {
                contentApprovedCount += 1;
            }

            if (normalizedType === 'REEL' || normalizedType === 'YOUTUBE') {
                if (shootDoneStatuses.includes(normalizedStatus)) shootDoneCount += 1;
            } else if (normalizedType === 'POST') {
                if (normalizedStatus === 'DESIGNING COMPLETED' || shootDoneStatuses.includes(normalizedStatus)) {
                    shootDoneCount += 1;
                }
            }
        });

        const completionPercentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

        return {
            client,
            periodStart: clientPeriodStart,
            periodEnd: clientPeriodEnd,
            totalTasks,
            completedCount,
            reelsCount,
            reelsCompleted,
            postsCount,
            postsCompleted,
            shootDoneCount,
            contentApprovedCount,
            completionPercentage
        };
    });

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
                <div className="logo-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src="/logo.png" alt="TrueUp Media" className="logo-img" style={{ height: '28px', width: 'auto' }} />
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>TL</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="sidebar-close" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <p className="sidebar-label">Navigation</p>
                    <div 
                        onClick={() => {
                            setView('dashboard');
                            setSelectedClient('all');
                        }}
                        className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
                    >
                        <LayoutDashboard size={18} />
                        <span>Dashboard Overview</span>
                    </div>
                    <div 
                        onClick={() => setView('client')}
                        className={`nav-item ${view === 'client' ? 'active' : ''}`}
                    >
                        <Globe size={18} />
                        <span>Client Calendars</span>
                    </div>
                    <div 
                        onClick={() => setView('master')}
                        className={`nav-item ${view === 'master' ? 'active' : ''}`}
                    >
                        <CalendarIcon size={18} />
                        <span>Master Calendar</span>
                    </div>
                    {showCompanyCalendar && (
                        <div 
                            onClick={() => setView('company')}
                            className={`nav-item ${view === 'company' ? 'active' : ''}`}
                        >
                            <CalendarClock size={18} />
                            <span>Company Calendar</span>
                        </div>
                    )}
                    <div
                        onClick={() => setView('poc')}
                        className={`nav-item ${view === 'poc' ? 'active' : ''}`}
                    >
                        <FileText size={18} />
                        <span>POC Communication</span>
                    </div>

                    {view === 'client' && (
                        <>
                            <div className="sidebar-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Your Clients</span>
                                <span style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '6px', color: 'var(--accent)', border: '1px solid var(--border)' }}>{clients.length}</span>
                            </div>
                            <div className="client-sidebar-section">
                                <div className="search-input-box" style={{ width: '100%', marginBottom: '12px' }}>
                                    <Search size={14} className="search-icon" />
                                    <input 
                                        type="text" 
                                        placeholder="Search clients..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{ padding: '8px 12px 8px 36px', fontSize: '12px' }}
                                    />
                                </div>
                                <div className="client-list-sidebar">
                                    {loading ? (
                                        <>
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <div key={i} className="nav-item" style={{ padding: '8px 12px' }}>
                                                    <Skeleton className="h-6 w-6 rounded-md mr-3" />
                                                    <Skeleton className="h-4 w-32" />
                                                </div>
                                            ))}
                                        </>
                                    ) : (
                                        <>
                                            {filteredClients.length === 0 && (
                                                <p style={{ fontSize: 11, color: '#94a3b8', padding: '8px 12px', textAlign: 'center' }}>No clients found</p>
                                            )}
                                            {filteredClients.map(c => (
                                                <div 
                                                    key={c.id}
                                                    onClick={() => setSelectedClient(c.id)}
                                                    className={`nav-item ${selectedClient === c.id ? 'active' : ''}`}
                                                    style={{ padding: '8px 12px', fontSize: '13px' }}
                                                >
                                                    <div style={{ 
                                                        width: '24px', 
                                                        height: '24px', 
                                                        borderRadius: '6px', 
                                                        background: selectedClient === c.id ? 'var(--accent)' : 'var(--bg-elevated)',
                                                        color: selectedClient === c.id ? 'white' : 'var(--text-secondary)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '10px',
                                                        fontWeight: 800
                                                    }}>
                                                        {getClientAbbreviation(c.company_name).charAt(0)}
                                                    </div>
                                                    <span className="truncate">{c.company_name}</span>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <p className="sidebar-label" style={{ margin: 0 }}>Appearance</p>
                        <ThemeToggle style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
                    </div>
                    <div className="user-info-box">
                        <div className="user-avatar">
                            <Users size={20} />
                        </div>
                        <div>
                            <p className="user-name">{user?.user_metadata?.name || 'Team Lead'}</p>
                            <p className="user-role">{user?.user_metadata?.role_identifier || 'TL'}</p>
                        </div>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        <LogOut size={16} />
                        Logout
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
                    <img src="/logo.png" alt="TrueUp Media" className="logo-img" style={{ height: '24px', width: 'auto' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <NotificationBell />
                    </div>
                </div>

                <header className="page-header page-header-safe">
                    <div>
                        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {view === 'master' ? 'Master Calendar' : view === 'company' ? 'Company Calendar' : view === 'poc' ? 'POC Communication' : 'Client Dashboard'}
                            {view === 'client' && selectedClient && (
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
                        </h1>
                        <p className="page-subtitle">
                            {view === 'master'
                                ? 'Unified view of all assigned client schedules' 
                                : view === 'company'
                                ? 'Master view of all content shown 7 days before scheduled date'
                                : view === 'poc'
                                ? 'Click any date to add communication notes for GM visibility'
                                : `Managing content for ${clients.find(c => c.id === selectedClient)?.company_name || 'Client'}`
                            }
                        </p>
                    </div>

                        <div className="header-controls">
                            {(view === 'master' || view === 'company') && (
                                <div className="master-filters-container" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-elevated)', borderRadius: '12px', padding: '4px 12px', border: '1px solid var(--border)', marginRight: '12px' }}>
                                    <div className="filter-icon-box" style={{ marginRight: '8px', color: 'var(--text-muted)' }}><Filter size={14} /></div>
                                    <div className="client-dropdown-wrapper" style={{ position: 'relative' }}>
                                        <select 
                                            className="client-dropdown" 
                                            value={selectedClient} 
                                            onChange={(e) => setSelectedClient(e.target.value)}
                                            style={{ 
                                                appearance: 'none', background: 'transparent', border: 'none', 
                                                color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, 
                                                paddingRight: '20px', cursor: 'pointer' 
                                            }}
                                        >
                                            <option value="all">All Clients</option>
                                            <option value="freelancer">Freelancer Clients</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                                        </select>
                                        <ChevronDown size={14} className="dropdown-chevron" style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }} />
                                    </div>
                                </div>
                            )}
                            <div className="month-nav">
                            <button onClick={handlePrev} className="month-btn"><ChevronLeft size={18}/></button>
                            <span className="month-label">
                                {getPeriodLabel()}
                            </span>
                            <button onClick={handleNext} className="month-btn"><ChevronRight size={18}/></button>
                            {isRefreshing && (
                                <div className="refreshing-banner" style={{ marginLeft: '12px' }}>
                                    <Loader2 size={12} className="spinner-btn-icon" />
                                    <span>Refreshing...</span>
                                </div>
                            )}
                        </div>
                        {(view === 'client' || view === 'master' || view === 'company') && (
                            <ScheduleExport 
                                data={calendarData}
                                clientName={selectedClient ? clients.find(c => c.id === selectedClient)?.company_name || 'Client' : 'TrueUp Media'}
                                month={currentMonth}
                                batchType={selectedClient ? getClientBatchType(selectedClient) : '1-1'}
                                summaryOnly={view === 'master' || view === 'company'}
                            />
                        )}
                    </div>
                </header>

                {(view === 'client' || view === 'master' || view === 'company') && (
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
                        <div className="status-pill status-pill-posted">
                            <span className="status-pill-label">Posted</span>
                            <span className="status-pill-count">{monthStatusCounts.posted}</span>
                        </div>
                    </div>
                )}

                {view === 'dashboard' && (
                    <div className="dashboard-view">
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-icon-box" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent)' }}>
                                    <Users size={28} />
                                </div>
                                <div className="stat-info">
                                    <h3>Total Clients</h3>
                                    <p className="stat-value">{clients.length}</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
                                    <CalendarIcon size={28} />
                                </div>
                                <div className="stat-info">
                                    <h3>Scheduled</h3>
                                    <p className="stat-value">{monthTotal}</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon-box" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                                    <Clock size={28} />
                                </div>
                                <div className="stat-info">
                                    <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        Pending
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>MTD</span>
                                    </h3>
                                    <p className="stat-value">{monthStatusCounts.pendingCount}<span style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '4px' }}>/ {monthTotal}</span></p>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                        <span style={{ color: 'var(--warning)' }}>{monthStatusCounts.pendingReels} R</span>
                                        <span style={{ color: 'var(--accent-secondary)' }}>{monthStatusCounts.pendingPosts} P</span>
                                    </div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
                                    <Check size={28} />
                                </div>
                                <div className="stat-info">
                                    <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        Completed
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>MTD</span>
                                    </h3>
                                    <p className="stat-value">{monthStatusCounts.completedCount}<span style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '4px' }}>/ {monthTotal}</span></p>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                        <span style={{ color: 'var(--warning)' }}>{monthStatusCounts.completedReels} R</span>
                                        <span style={{ color: 'var(--accent-secondary)' }}>{monthStatusCounts.completedPosts} P</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="daily-stats-banner" style={{ marginTop: '24px' }}>
                            <div className="progress-meter-card">
                                <div className="progress-top-row">
                                    <div className="progress-main-info">
                                        <h3 className="stat-label">Today&apos;s Progress</h3>
                                    </div>
                                    <div className="progress-values">
                                        <span className="current">{todayStats.completed}</span>
                                        <span className="separator">/</span>
                                        <span className="total">{todayStats.total}</span>
                                        <span className="unit">Tasks</span>
                                    </div>
                                </div>
                                <div className="meter-labels">
                                    <span className="percentage">{todayStats.percentage}% Done</span>
                                </div>
                            </div>

                            <div className="progress-meter-card">
                                <div className="progress-top-row">
                                    <div className="progress-main-info">
                                        <h3 className="stat-label">Week&apos;s Progress</h3>
                                    </div>
                                    <div className="progress-values">
                                        <span className="current">{weekCompleted}</span>
                                        <span className="separator">/</span>
                                        <span className="total">{weekTotal}</span>
                                        <span className="unit">Tasks</span>
                                    </div>
                                </div>
                                <div className="meter-labels">
                                    <span className="percentage">{weekPercentage}% Done</span>
                                </div>
                            </div>

                            <div className="progress-meter-card">
                                <div className="progress-top-row">
                                    <div className="progress-main-info">
                                        <h3 className="stat-label">Month&apos;s Progress</h3>
                                    </div>
                                    <div className="progress-values">
                                        <span className="current">{monthCompleted}</span>
                                        <span className="separator">/</span>
                                        <span className="total">{monthTotal}</span>
                                        <span className="unit">Tasks</span>
                                    </div>
                                </div>
                                <div className="meter-labels">
                                    <span className="percentage">{monthPercentage}% Done</span>
                                </div>
                            </div>
                        </div>

                        {/* Client Tasks Status Overview */}
                        <div className="client-tasks-overview-panel" style={{ marginTop: '24px' }}>
                             <div className="client-tasks-overview-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                 <Users size={22} color="var(--accent)" />
                                 <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Client Tasks Status Overview</h2>
                             </div>
                             <div className="client-tasks-table-container">
                                 <table className="client-tasks-table">
                                     <thead>
                                         <tr>
                                             <th>Client</th>
                                             <th>Period</th>
                                             <th>Reels</th>
                                             <th>Posts</th>
                                             <th>Shoot Done</th>
                                             <th>Content Approved</th>
                                             <th>MTD Progress</th>
                                         </tr>
                                     </thead>
                                     <tbody>
                                         {clientStatuses.map(({ client, periodStart, periodEnd, totalTasks, completedCount, reelsCount, reelsCompleted, postsCount, postsCompleted, shootDoneCount, contentApprovedCount, completionPercentage }) => (
                                             <tr key={client.id}>
                                                 <td className="client-cell">
                                                     <div className="client-badge">
                                                         {getClientAbbreviation(client.company_name)}
                                                     </div>
                                                     <span className="client-name">{client.company_name}</span>
                                                 </td>
                                                 <td className="period-cell">
                                                     <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                         <span className="period-label">
                                                             {client.batch_type === '15-15' ? '15-15 Cycle' : 'Monthly'}
                                                         </span>
                                                         <span className="period-dates">
                                                             {format(periodStart, 'd MMM')} – {format(periodEnd, 'd MMM yyyy')}
                                                         </span>
                                                     </div>
                                                 </td>
                                                 <td className="metric-cell">
                                                     <span className="metric-badge reels">
                                                         {reelsCompleted}/{reelsCount}
                                                     </span>
                                                 </td>
                                                 <td className="metric-cell">
                                                     <span className="metric-badge posts">
                                                         {postsCompleted}/{postsCount}
                                                     </span>
                                                 </td>
                                                 <td className="metric-cell text-center">
                                                     <span className="metric-count">
                                                         {shootDoneCount}
                                                     </span>
                                                 </td>
                                                 <td className="metric-cell text-center">
                                                     <span className="metric-count">
                                                         {contentApprovedCount}
                                                     </span>
                                                 </td>
                                                 <td className="progress-cell">
                                                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                                                         <div className="progress-bar-container" style={{ flex: 1 }}>
                                                             <div className="progress-bar-fill" style={{ width: `${completionPercentage}%` }}></div>
                                                         </div>
                                                         <span className="progress-text">{completionPercentage}% ({completedCount}/{totalTasks})</span>
                                                     </div>
                                                 </td>
                                             </tr>
                                         ))}
                                         {clientStatuses.length === 0 && (
                                             <tr>
                                                 <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                                     No clients assigned to this Team Lead.
                                                 </td>
                                             </tr>
                                         )}
                                     </tbody>
                                 </table>
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
                                            <p className="emergency-card-type">{(task.content_type === 'Special Poster' || task.content_type === 'Special Day Poster' ? '🎉 ' : '') + task.content_type} • {format(parseISO(task.scheduled_datetime), 'h:mm a')}</p>
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
                                                <p className="emergency-card-type">{(task.content_type === 'Special Poster' || task.content_type === 'Special Day Poster' ? '🎉 ' : '') + task.content_type} • {format(parseISO(task.scheduled_datetime), 'MMM d, h:mm a')}</p>
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

                {view === 'dashboard' && (
                    <div className="dashboard-view">
                        <div className="tl-main-grid">
                            <div className="dashboard-card">
                                <div className="card-header">
                                    <h2 className="card-title">Recent Activity</h2>
                                    <span className="card-badge">Live</span>
                                </div>
                                <div className="activity-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {calendarData.slice(0, 5).map(item => (
                                        <div key={item.id} onClick={() => handleItemClick(item)} style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)', cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontWeight: 700, fontSize: '13px' }}>{item.title}</span>
                                                <span className={`type-badge ${item.status.toLowerCase()}`}>{item.status}</span>
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                {format(parseISO(item.scheduled_datetime), 'MMM d, HH:mm')} • {item.clients?.company_name}
                                            </div>
                                        </div>
                                    ))}
                                    {calendarData.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px' }}>No content scheduled for this month</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Global loading bar removed in favor of inline skeletons */}

                {(view === 'client' || view === 'master' || view === 'company' || view === 'poc') && (
                    <>
                        {/* Legend Bar */}
                        <div className="calendar-legend-bar">
                            <div className="legend-item">
                                <span className="legend-color reel"></span>
                                <span className="legend-label">Reel</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-color post"></span>
                                <span className="legend-label">Post</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-color emergency"></span>
                                <span className="legend-label">Emergency</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-color pending"></span>
                                <span className="legend-label">Pending</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-color rescheduled"></span>
                                <span className="legend-label">Rescheduled</span>
                            </div>
                        </div>

                        <div className="calendar-card">
                            <div className="calendar-grid">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                    <div key={day} className="calendar-header-cell">
                                        <span className="desktop-day">{day}</span>
                                        <span className="mobile-day">{day.charAt(0)}</span>
                                    </div>
                                ))}

                                {loading && calendarData.length === 0 ? (
                                    <>
                                        {Array.from({ length: 35 }).map((_, idx) => (
                                            <div key={idx} className="calendar-day opacity-50" style={{ minHeight: '110px' }}>
                                                <Skeleton className="h-4 w-4 mb-2" />
                                                <div className="space-y-1">
                                                    <Skeleton className="h-6 w-full rounded" />
                                                    <Skeleton className="h-6 w-3/4 rounded" />
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
                                            return (
                                                <div 
                                                    key={idx} 
                                                    onClick={() => {
                                                        if (isPocView) {
                                                            handlePocDayClick(day);
                                                        }
                                                    }}
                                                    className={`calendar-day ${!isCompanyMode && !isDayInPeriod(day) ? 'other-month' : ''} ${isSameDay(day, new Date()) ? 'today' : ''}`}
                                                >
                                                    <span className="day-number">{format(day, 'd')}</span>
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
                                                                className={isPocView ? 'content-item post' : `content-item ${(item as ContentItem).is_rescheduled ? 'rescheduled' : (((item as ContentItem).status || '').toUpperCase() === 'PENDING' ? 'pending' : (item as ContentItem).content_type.toLowerCase().replace(/\s+/g, '-'))} ${(item as ContentItem).is_emergency ? 'emergency' : ''}`}
                                                                title={isPocView ? (item as PocNote).note_text : (item as ContentItem).content_type}
                                                            >
                                                                {isPocView ? <FileText size={10}/> : (item as ContentItem).content_type === 'Post' ? <FileText size={10}/> : <Video size={10}/>}
                                                                    {isPocView ? (
                                                                        <span className="truncate" style={{ fontSize: '9px' }}>
                                                                            {(item as PocNote).note_text}
                                                                        </span>
                                                                    ) : (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
                                                                            <span className="truncate" style={{ fontSize: '9px', flex: 1 }}>
                                                                                {isMasterMode ? (
                                                                                    (item as ContentItem).client_id ? 
                                                                                        `[${getClientAbbreviation((item as ContentItem).clients?.company_name)}] ` : 
                                                                                        `[${((item as ContentItem).freelancer_name || 'FR').substring(0, 2).toUpperCase()}] `
                                                                                ) : ''}
                                                                                {((item as ContentItem).content_type === 'Special Poster' || (item as ContentItem).content_type === 'Special Day Poster' ? '🎉 ' : '') + (item as ContentItem).content_type}
                                                                            </span>
                                                                            {(item as ContentItem).status === 'POSTED' ? (
                                                                                <Check size={10} style={{ color: '#10b981', flexShrink: 0 }} />
                                                                            ) : (
                                                                                <AlertTriangle size={10} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                                                            )}
                                                                        </div>
                                                                    )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="mobile-day-indicators">
                                                        {dayContent.map(item => {
                                                            const casted = item as ContentItem;
                                                            const label = isPocView
                                                                ? 'POC'
                                                                : (view === 'master' || view === 'company')
                                                                    ? (casted.client_id ? (getClientAbbreviation(casted.clients?.company_name) || 'TUM') : (casted.freelancer_name ? casted.freelancer_name.substring(0, 3).toUpperCase() : 'FR'))
                                                                    : casted.content_type.substring(0, 4).toUpperCase();
                                                            return (
                                                                <div
                                                                    key={item.id}
                                                                    className={`mobile-dot ${isPocView ? 'post' : casted.is_rescheduled ? 'rescheduled' : ((casted.status || '').toUpperCase() === 'PENDING' ? 'pending' : (casted.content_type || '').toLowerCase().replace(/\s+/g, '-'))} ${!isPocView && casted.is_emergency ? 'emergency' : ''}`}
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

            {/* Details Modal */}
            {isDetailsOpen && activeItem && (
                <div className="modal-overlay" onClick={() => setIsDetailsOpen(false)}>
                    <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span className={`type-badge ${activeItem.item.content_type.toLowerCase()}`}>
                                        {activeItem.item.content_type === 'Special Poster' || activeItem.item.content_type === 'Special Day Poster' ? '🎉 ' + activeItem.item.content_type : activeItem.item.content_type}
                                    </span>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>•</span>
                                    {activeItem.item.clients?.company_name && (
                                        <span 
                                            style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}
                                            className="client-link-hover"
                                            onClick={() => {
                                                setIsDetailsOpen(false);
                                                setView('client');
                                                setSelectedClient(activeItem.item.client_id);
                                            }}
                                        >
                                            {activeItem.item.clients?.company_name}
                                        </span>
                                    )}
                                    {dayTasks.length > 1 && (
                                        <>
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>•</span>
                                            <span className="task-counter" style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase' }}>
                                                Task {dayTasks.findIndex(t => t.id === activeItem.item.id) + 1} of {dayTasks.length}
                                            </span>
                                        </>
                                    )}
                                </div>
                                <h3 className="modal-title">{activeItem.item.title}</h3>
                                <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent)', marginTop: '4px', marginBottom: '2px' }}>
                                    Team Lead: {activeItem.item.clients?.team_lead?.name || 'Not Assigned'}
                                </p>
                                <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent)', marginTop: '2px' }}>
                                    Assigned To: {activeItem.item.assigned_employee ? `${activeItem.item.assigned_employee.name} ${activeItem.item.assigned_employee.role_identifier ? `(${activeItem.item.assigned_employee.role_identifier})` : ''}` : 'Not Assigned'}
                                </p>
                                {!activeItem.item.client_id && (
                                    <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                                        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Freelancer Contact Information</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div>
                                                <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Name</p>
                                                <p style={{ fontSize: '13px', fontWeight: 700 }}>{activeItem.item.freelancer_name}</p>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Phone</p>
                                                <p style={{ fontSize: '13px', fontWeight: 700 }}>{activeItem.item.freelancer_phone || 'N/A'}</p>
                                            </div>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Email</p>
                                                <p style={{ fontSize: '13px', fontWeight: 700 }}>{activeItem.item.freelancer_email || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
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
                                <button onClick={() => setIsDetailsOpen(false)} className="btn-icon"><X size={20}/></button>
                            </div>
                        </div>

                        <div className="detail-grid">
                            <div className="detail-info">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                                        {activeItem.item.is_rescheduled && activeItem.item.original_scheduled_datetime ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                                <div>
                                                    <label className="detail-label">{isCompanyMode ? 'Calendar Date' : 'Scheduled Date'}</label>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>
                                                        <CalendarIcon size={14} color="var(--text-muted)"/>
                                                        Actual Date: {formatIST(activeItem.item.original_scheduled_datetime, 'dd/MM/yyyy')} rescheduled to {formatIST(activeItem.item.scheduled_datetime, 'dd/MM/yy')}
                                                    </div>
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
                                            <div>
                                                <label className="detail-label">{isCompanyMode ? 'Calendar Date' : 'Scheduled Date'}</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>
                                                    <CalendarIcon size={14} color="var(--text-muted)"/>
                                                    {format(isCompanyMode ? getDisplayDate(activeItem.item.scheduled_datetime) : parseISO(activeItem.item.scheduled_datetime), 'MMM d, yyyy')}
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <label className="detail-label">Time</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>
                                                <Clock size={14} color="var(--text-muted)"/>
                                                {formatIST(activeItem.item.scheduled_datetime, 'hh:mm a')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-workflow" style={{ background: 'var(--bg-elevated)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                <label className="detail-label">Workflow Progress</label>
                                <div style={{ marginTop: '16px' }}>
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
                                            ]
                                        };
                                        const flow = flows[activeItem.item.content_type];
                                        const currentIdx = flow.indexOf(activeItem.item.status);
                                        const nextStatus = flow[currentIdx + 1];

                                        return (
                                            <>
                                                <div style={{ marginBottom: '20px' }}>
                                                    <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Status</p>
                                                    <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent)' }}>{activeItem.item.status}</p>
                                                </div>
                                                {nextStatus && activeItem.item.status !== 'WAITING FOR POSTING' && (
                                                    <div style={{ marginBottom: '16px' }}>
                                                        <label className="detail-label" style={{ marginBottom: '8px', display: 'block' }}>Add a Note (Optional)</label>
                                                        <textarea 
                                                            value={statusNote}
                                                            onChange={(e) => setStatusNote(e.target.value)}
                                                            placeholder="e.g., Finished the first draft..."
                                                            style={{ 
                                                                width: '100%', 
                                                                padding: '12px', 
                                                                borderRadius: '10px', 
                                                                border: '1px solid #e2e8f0',
                                                                fontSize: '13px',
                                                                resize: 'none',
                                                                height: '80px',
                                                                background: 'var(--bg-surface)'
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                                {nextStatus && (view !== 'company' || (activeItem.item.status !== 'SHOOT DONE' && activeItem.item.status !== 'POSTED')) ? (
                                                    activeItem.item.status === 'WAITING FOR POSTING' ? (
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
                                                    ) : nextStatus === 'SHOOT DONE' ? (
                                                        <div className="workflow-waiting-posting" style={{ 
                                                            marginTop: '16px', 
                                                            padding: '16px', 
                                                            background: 'rgba(245, 158, 11, 0.05)', 
                                                            border: '1px solid rgba(245, 158, 11, 0.2)',
                                                            color: '#f59e0b', 
                                                            borderRadius: '12px', 
                                                            fontSize: '13px', 
                                                            display: 'flex', 
                                                            flexDirection: 'column',
                                                            alignItems: 'center', 
                                                            textAlign: 'center',
                                                            gap: '8px' 
                                                        }}>
                                                            <Video size={20} />
                                                            <div style={{ fontWeight: 700 }}>Waiting for Production Phase</div>
                                                            <div style={{ opacity: 0.8, fontSize: '12px' }}>This item is waiting for the Production Head to mark the shoot as completed.</div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button 
                                                                onClick={() => handleStatusUpdate(nextStatus)}
                                                                className="btn-add"
                                                                style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
                                                                disabled={updatingId === activeItem.item.id}
                                                            >
                                                                {updatingId === activeItem.item.id ? (
                                                                    <>
                                                                        <Loader2 size={16} className="spinner-btn-icon" />
                                                                        <span>Updating...</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span>Advance to {nextStatus}</span>
                                                                        <ArrowRight size={18}/>
                                                                    </>
                                                                )}
                                                            </button>
                                                            <button 
                                                                onClick={handleUndoStatus}
                                                                className="btn-add"
                                                                style={{ width: '44px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: 0, justifyContent: 'center' }}
                                                                title="Undo Last Step"
                                                                disabled={updatingId === activeItem.item.id}
                                                            >
                                                                <Undo2 size={18} />
                                                            </button>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div style={{ 
                                                        background: '#ecfdf5', 
                                                        color: '#059669', 
                                                        padding: '12px', 
                                                        borderRadius: '10px', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center', 
                                                        gap: '8px',
                                                        fontWeight: 700,
                                                        fontSize: '14px'
                                                    }}>
                                                        <CheckCircle2 size={18}/>
                                                        Workflow Completed
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '32px', borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label className="detail-label" style={{ marginBottom: 0 }}>Activity Log</label>
                                <button 
                                    onClick={handleUndoStatus}
                                    disabled={updatingId === activeItem.item.id}
                                    style={{ 
                                        display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', 
                                        background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', 
                                        border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', 
                                        fontSize: '11px', fontWeight: 700, cursor: 'pointer' 
                                    }}
                                >
                                    {updatingId === activeItem.item.id ? (
                                        <Loader2 size={12} className="spinner-btn-icon" />
                                    ) : (
                                        <Undo2 size={12} />
                                    )}
                                    Undo Last Step
                                </button>
                            </div>
                            <div style={{ marginTop: '24px', position: 'relative', paddingLeft: '12px', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ 
                                    position: 'absolute', left: '23px', top: '12px', bottom: '12px', 
                                    width: '2px', background: 'linear-gradient(to bottom, #10b981 0%, #e2e8f0 100%)', opacity: 0.3, zIndex: 1 
                                }}></div>
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
                                            <div key={status} style={{ 
                                                display: 'flex', alignItems: 'flex-start', gap: '20px', 
                                                paddingBottom: idx === flow.length - 1 ? 0 : '32px', 
                                                position: 'relative', zIndex: 2 
                                            }}>
                                                <div style={{ 
                                                    width: '24px', height: '24px', borderRadius: '50%', 
                                                    background: isCompleted ? 'var(--success)' : isCurrent ? 'var(--accent)' : 'var(--bg-surface)',
                                                    border: `2px solid ${isCompleted ? 'var(--success)' : isCurrent ? 'var(--accent)' : 'var(--danger)'}`,
                                                    flexShrink: 0, marginTop: '2px', display: 'flex', 
                                                    alignItems: 'center', justifyContent: 'center',
                                                    boxShadow: isCompleted ? '0 0 15px rgba(16, 185, 129, 0.4)' : isCurrent ? '0 0 20px rgba(99, 102, 241, 0.5)' : 'none',
                                                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                                }}>
                                                    {isCompleted ? (
                                                        <Check size={14} color="white" strokeWidth={3} />
                                                    ) : isCurrent ? (
                                                        <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%' }}></div>
                                                    ) : (
                                                        <div style={{ width: '6px', height: '6px', background: 'var(--danger)', borderRadius: '50%' }}></div>
                                                    )}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <span style={{ 
                                                        fontSize: isCurrent ? '15px' : '14px', fontWeight: 800, 
                                                        color: isCompleted ? 'var(--success)' : isCurrent ? 'var(--text-primary)' : 'var(--danger)',
                                                        letterSpacing: '0.02em', transition: 'all 0.3s'
                                                    }}>{status}</span>
                                                    {historyEntry && (
                                                        <div style={{ 
                                                            display: 'flex', flexDirection: 'column', marginTop: '6px',
                                                            padding: '10px 14px', background: 'rgba(79, 70, 229, 0.03)',
                                                            borderRadius: '12px', border: '1px solid rgba(79, 70, 229, 0.05)'
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
                                                                    background: 'var(--bg-elevated)', borderRadius: '8px', 
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
            )}

            {isPocModalOpen && selectedPocDate && (
                <div className="modal-overlay" onClick={() => setIsPocModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Add POC Note</h3>
                            <button onClick={() => setIsPocModalOpen(false)} className="modal-close"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSavePocNote} className="modal-form">
                            <div className="form-group">
                                <label className="form-label">Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={format(selectedPocDate, 'yyyy-MM-dd')}
                                    readOnly
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Client</label>
                                <select
                                    className="form-input"
                                    value={selectedPocClient}
                                    onChange={(e) => setSelectedPocClient(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>Select assigned client</option>
                                    {clients.map((client) => (
                                        <option key={client.id} value={client.id}>{client.company_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Note</label>
                                <textarea
                                    className="form-input"
                                    value={pocNoteText}
                                    onChange={(e) => setPocNoteText(e.target.value)}
                                    placeholder="Write communication note for GM..."
                                    rows={4}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn-primary" disabled={isSavingPoc}>
                                {isSavingPoc ? (
                                    <>
                                        <Loader2 size={16} className="spinner-btn-icon" />
                                        Saving Note...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={16} />
                                        Save Note
                                    </>
                                )}
                            </button>
                        </form>
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
                                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={isUpdatingPoc}>
                                    {isUpdatingPoc ? (
                                        <>
                                            <Loader2 size={16} className="spinner-btn-icon" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleDeletePocNote} 
                                    className="btn-add"
                                    style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                    disabled={isDeletingPoc}
                                >
                                    {isDeletingPoc ? (
                                        <>
                                            <Loader2 size={16} className="spinner-btn-icon" />
                                            Deleting...
                                        </>
                                    ) : (
                                        'Delete Note'
                                    )}
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
        </div>
    );
}
