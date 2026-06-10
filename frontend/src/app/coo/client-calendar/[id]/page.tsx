"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
    isBefore
} from 'date-fns';
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    FileText,
    Video,
    X,
    Clock,
    Calendar as CalendarIcon,
    ArrowLeft,
    Check,
    CalendarClock,
    AlertTriangle,
    ShieldAlert,
    Loader2,
    Undo2,
    Plus,
    Edit,
    Trash2
} from 'lucide-react';
import { cooApi, emergencyApi, ContentItem } from '@/lib/api';
import { formatIST, formatISTForm, convertISTToUTC } from '@/lib/utils';
import { isCrossMonthRescheduled } from '@/utils/calendarUtils';
import { useToast } from '@/components/ui/ToastProvider';
import { usePageLoading } from '@/components/ui/TopProgressBar';
import { useOptimisticAction } from '@/hooks/useOptimisticAction';
import { Skeleton } from '@/components/ui/skeleton';

export default function CooClientCalendarPage() {
    const { startLoading, stopLoading } = usePageLoading();
    const { success: toastSuccess, error: toastError } = useToast();
    const performOptimisticAction = useOptimisticAction();

    const params = useParams();
    const router = useRouter();
    const clientId = params.id as string;

    const [clients, setClients] = useState<any[]>([]);
    const [client, setClient] = useState<any>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const [calendarData, setCalendarData] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [dayTasks, setDayTasks] = useState<ContentItem[]>([]);
    const [dailyAgenda, setDailyAgenda] = useState<{ date: Date; items: ContentItem[] } | null>(null);
    const [statusNote, setStatusNote] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
    const [isRescheduling, setIsRescheduling] = useState(false);

    const [formData, setFormData] = useState({
        content_type: 'Post' as ContentItem['content_type'],
        scheduled_datetime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        client_id: clientId,
        title: '',
        description: ''
    });

    const fetchClientInfo = useCallback(async () => {
        try {
            const res = await cooApi.getClients();
            setClients(res.data);
            const found = res.data.find((c: any) => c.id === clientId);
            if (found) setClient(found);
        } catch (err) {
            console.error(err);
        }
    }, [clientId]);

    const fetchCalendarData = useCallback(async (isSilent = false) => {
        if (!isSilent) {
            startLoading();
            if (calendarData.length === 0) {
                setLoading(true);
            } else {
                setIsRefreshing(true);
            }
        } else {
            setIsRefreshing(true);
        }
        try {
            const currentMonthStr = format(currentMonth, 'yyyy-MM');
            const res = await cooApi.getMasterCalendar(currentMonthStr, clientId);

            if (client?.batch_type === '15-15') {
                const nextMonthStr = format(addMonths(currentMonth, 1), 'yyyy-MM');
                const nextRes = await cooApi.getMasterCalendar(nextMonthStr, clientId);
                setCalendarData([...res.data, ...nextRes.data]);
            } else {
                setCalendarData(res.data);
            }
        } catch (err) {
            console.error(err);
            toastError('Failed to refresh calendar data.');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
            if (!isSilent) stopLoading();
        }
    }, [currentMonth, clientId, client?.batch_type, calendarData.length, startLoading, stopLoading, toastError]);

    useEffect(() => {
        fetchClientInfo();
    }, [fetchClientInfo]);

    useEffect(() => {
        const isSilent = calendarData.length > 0;
        fetchCalendarData(isSilent);
    }, [fetchCalendarData]);

    const isBiMonthly = (client?.batch_type || '1-1') === '15-15';

    const periodStart = isBiMonthly
        ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 15)
        : startOfMonth(currentMonth);
    const nextMonth = addMonths(currentMonth, 1);
    const periodEnd = isBiMonthly
        ? new Date(addMonths(currentMonth, 1).getFullYear(), addMonths(currentMonth, 1).getMonth(), 15, 23, 59, 59)
        : endOfMonth(currentMonth);

    const days = viewMode === 'month'
        ? eachDayOfInterval({
            start: startOfWeek(periodStart, { weekStartsOn: 1 }),
            end: endOfWeek(periodEnd, { weekStartsOn: 1 })
        })
        : eachDayOfInterval({
            start: startOfWeek(currentMonth, { weekStartsOn: 1 }),
            end: endOfWeek(currentMonth, { weekStartsOn: 1 })
        });

    // Check if a day falls within the active period
    const isDayInPeriod = (day: Date): boolean => {
        if (!isBiMonthly) return isSameMonth(day, currentMonth);
        return day >= periodStart && day <= periodEnd;
    };

    const getPeriodLabel = (): string => {
        if (!isBiMonthly) return format(currentMonth, 'MMMM yyyy');
        return `${format(periodStart, 'd MMM')} \u2013 ${format(periodEnd, 'd MMM yyyy')}`;
    };

    const handlePrev = () => {
        if (viewMode === 'month') setCurrentMonth(subMonths(currentMonth, 1));
        else setCurrentMonth((prev) => {
            const d = new Date(prev);
            d.setDate(d.getDate() - 7);
            return d;
        });
    };

    const handleNext = () => {
        if (viewMode === 'month') setCurrentMonth(addMonths(currentMonth, 1));
        else setCurrentMonth((prev) => {
            const d = new Date(prev);
            d.setDate(d.getDate() + 7);
            return d;
        });
    };

    const handleItemClick = async (item: ContentItem) => {
        try {
            const res = await cooApi.getContentDetails(item.id);
            const fetchedItem = res.data.item;
            
            // Find all tasks on the same day
            const day = parseISO(fetchedItem.scheduled_datetime);
            const tasksOnDay = calendarData.filter(i => isSameDay(parseISO(i.scheduled_datetime), day));
            
            if (!tasksOnDay.some(t => t.id === fetchedItem.id)) {
                tasksOnDay.push(fetchedItem);
            }
            
            tasksOnDay.sort((a, b) => new Date(a.scheduled_datetime).getTime() - new Date(b.scheduled_datetime).getTime());
            
            setDayTasks(tasksOnDay);
            setSelectedItem(res.data);
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
        } catch (err) { console.error(err); }
    };

    const handleEditClick = (item: ContentItem) => {
        setIsRescheduling(false);
        setEditingItem(item);
        setFormData({
            content_type: item.content_type,
            scheduled_datetime: formatISTForm(item.scheduled_datetime, 'yyyy-MM-dd') + 'T' + formatISTForm(item.scheduled_datetime, 'HH:mm'),
            client_id: item.client_id,
            title: item.title || '',
            description: item.description || ''
        });
        setSelectedItem(null);
        setShowAddModal(true);
    };

    const handleRescheduleClick = (item: ContentItem) => {
        setIsRescheduling(true);
        setEditingItem(item);
        setFormData({
            content_type: item.content_type,
            scheduled_datetime: formatISTForm(item.scheduled_datetime, 'yyyy-MM-dd') + 'T' + formatISTForm(item.scheduled_datetime, 'HH:mm'),
            client_id: item.client_id,
            title: item.title || '',
            description: item.description || ''
        });
        setSelectedItem(null);
        setShowAddModal(true);
    };

    const handleDeleteContent = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this content item?')) return;
        setActionId(`delete-${id}`);
        try {
            await performOptimisticAction({
                backup: () => ({
                    calendar: [...calendarData],
                    selected: selectedItem ? { ...selectedItem } : null,
                    dayTasks: [...dayTasks]
                }),
                update: () => {
                    setCalendarData(prev => prev.filter(item => item.id !== id));
                    setDayTasks(prev => prev.filter(item => item.id !== id));
                    setSelectedItem(null);
                },
                action: () => cooApi.deleteContent(id),
                rollback: (backup) => {
                    setCalendarData(backup.calendar);
                    setDayTasks(backup.dayTasks);
                    setSelectedItem(backup.selected);
                },
                successMessage: 'Content deleted successfully.',
                errorMessage: 'Failed to delete content.',
                refresh: () => fetchCalendarData(true)
            });
        } catch (err) {
            console.error(err);
        } finally {
            setActionId(null);
        }
    };

    const handleAddContent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const [datePart, timePart] = formData.scheduled_datetime.split('T');
            const utcScheduledDatetime = convertISTToUTC(datePart, timePart);
            if (editingItem) {
                await cooApi.updateContent(editingItem.id, {
                    ...formData,
                    scheduled_datetime: utcScheduledDatetime,
                    is_rescheduled: isRescheduling ? true : editingItem.is_rescheduled
                });
            } else {
                await cooApi.addContent({
                    ...formData,
                    scheduled_datetime: utcScheduledDatetime
                });
            }
            setShowAddModal(false);
            setEditingItem(null);
            setIsRescheduling(false);
            setFormData({
                content_type: 'Post' as ContentItem['content_type'],
                scheduled_datetime: formatISTForm(new Date(), 'yyyy-MM-dd') + 'T' + formatISTForm(new Date(), 'HH:mm'),
                client_id: clientId,
                title: '',
                description: ''
            });
            fetchCalendarData();
        } catch (err: any) { 
            console.error(err); 
            const errorMsg = err.response?.data?.error || 'Error saving content';
            alert(errorMsg); 
        }
    };

    const handleToggleEmergency = async () => {
        if (!selectedItem) return;
        const targetId = selectedItem.item.id;
        const nextEmergency = !selectedItem.item.is_emergency;
        setActionId(`toggle-emergency-${targetId}`);
        try {
            await performOptimisticAction({
                backup: () => ({
                    calendar: [...calendarData],
                    selected: { ...selectedItem }
                }),
                update: () => {
                    const updatedItem = { ...selectedItem.item, is_emergency: nextEmergency };
                    setCalendarData(prev => prev.map(item => item.id === targetId ? updatedItem : item));
                    setSelectedItem({
                        ...selectedItem,
                        item: updatedItem
                    });
                },
                action: () => emergencyApi.toggle(targetId),
                rollback: (backup) => {
                    setCalendarData(backup.calendar);
                    setSelectedItem(backup.selected);
                },
                successMessage: nextEmergency ? 'Emergency flag enabled.' : 'Emergency flag disabled.',
                errorMessage: 'Failed to toggle emergency flag.',
                refresh: () => {
                    fetchCalendarData(true);
                    cooApi.getContentDetails(targetId).then(res => setSelectedItem(res.data)).catch(console.error);
                }
            });
        } catch (err) {
            console.error(err);
        } finally {
            setActionId(null);
        }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!selectedItem) return;
        const targetId = selectedItem.item.id;
        setActionId(`status-${targetId}`);
        const currentNote = statusNote;
        try {
            await performOptimisticAction({
                backup: () => ({
                    calendar: [...calendarData],
                    selected: { ...selectedItem }
                }),
                update: () => {
                    const updatedItem = { ...selectedItem.item, status: newStatus };
                    setCalendarData(prev => prev.map(item => item.id === targetId ? updatedItem : item));
                    setSelectedItem({
                        ...selectedItem,
                        item: updatedItem
                    });
                    setStatusNote('');
                },
                action: () => cooApi.updateStatus(targetId, newStatus, currentNote.trim() || undefined),
                rollback: (backup) => {
                    setCalendarData(backup.calendar);
                    setSelectedItem(backup.selected);
                    setStatusNote(currentNote);
                },
                successMessage: `Advanced to ${newStatus}.`,
                errorMessage: 'Failed to update status.',
                refresh: () => {
                    fetchCalendarData(true);
                    cooApi.getContentDetails(targetId).then(res => setSelectedItem(res.data)).catch(console.error);
                }
            });
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
            await performOptimisticAction({
                backup: () => ({
                    calendar: [...calendarData],
                    selected: { ...selectedItem }
                }),
                update: () => {
                    let revertedStatus = 'WAITING FOR APPROVAL';
                    if (selectedItem.history && selectedItem.history.length > 1) {
                        revertedStatus = selectedItem.history[1].new_status || selectedItem.history[1].status;
                    }
                    const updatedItem = { ...selectedItem.item, status: revertedStatus };
                    setCalendarData(prev => prev.map(item => item.id === targetId ? updatedItem : item));
                    setSelectedItem({
                        ...selectedItem,
                        item: updatedItem
                    });
                },
                action: () => cooApi.undoStatus(targetId),
                rollback: (backup) => {
                    setCalendarData(backup.calendar);
                    setSelectedItem(backup.selected);
                },
                successMessage: 'Status change undone.',
                errorMessage: 'Failed to undo status change.',
                refresh: () => {
                    fetchCalendarData(true);
                    cooApi.getContentDetails(targetId).then(res => setSelectedItem(res.data)).catch(console.error);
                }
            });
        } catch (err) {
            console.error(err);
        } finally {
            setActionId(null);
        }
    };

    const monthStatusCounts = calendarData
        .filter((item) => isDayInPeriod(parseISO(item.scheduled_datetime)))
        .reduce(
        (acc, item) => {
            const normalizedStatus = (item.status || '').toUpperCase();
            const normalizedType = (item.content_type || '').toUpperCase();

            const contentApprovedStatuses = ['CONTENT READY', 'WAITING FOR APPROVAL', 'CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED'];
            const shootDoneStatuses = ['SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'WAITING FOR FINAL APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'];

            if (contentApprovedStatuses.includes(normalizedStatus)) {
                acc.contentApproved += 1;
            }

            if (normalizedType === 'REEL' || normalizedType === 'YOUTUBE') {
                if (shootDoneStatuses.includes(normalizedStatus)) acc.shootDone += 1;
            }

            if (normalizedType === 'REEL') acc.reels += 1;
            if (normalizedType === 'POST') acc.posts += 1;

            return acc;
        },
        { shootDone: 0, contentApproved: 0, reels: 0, posts: 0 }
    );

    if (!client && !loading) return <div className="p-8">Loading client info...</div>;

    return (
        <div>
            <header className="page-header page-header-safe">
                <div className="header-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="header-info">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h1 className="page-title">Client Calendar</h1>
                                {client?.team_lead?.name && (
                                    <div className="tl-badge" style={{ 
                                        background: 'rgba(99, 102, 241, 0.1)', 
                                        color: 'var(--accent)', 
                                        padding: '4px 12px', 
                                        borderRadius: '20px', 
                                        fontSize: '13px', 
                                        fontWeight: 800,
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        marginTop: '4px'
                                    }}>
                                        Team Lead: {client.team_lead.name}
                                    </div>
                                )}
                            </div>
                            <p className="page-subtitle">Detailed planning for {client?.company_name}</p>
                        </div>
                    </div>

                    <div className="header-controls">
                        <button
                            onClick={() => router.push('/coo/client-calendar')}
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
                            <ArrowLeft size={16} />
                            Selection Grid
                        </button>
                        <div className="client-dropdown-wrapper" style={{ marginRight: '12px' }}>
                            <select
                                className="client-dropdown"
                                value={clientId}
                                onChange={(e) => router.push(`/coo/client-calendar/${e.target.value}`)}
                            >
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.company_name}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="dropdown-chevron" />
                        </div>
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
                            <button onClick={handlePrev} className="month-btn">
                                <ChevronLeft size={20} />
                            </button>
                            <span className="month-label">
                                {viewMode === 'month'
                                    ? getPeriodLabel()
                                    : `Week of ${format(startOfWeek(currentMonth, { weekStartsOn: 1 }), 'MMM d')}`
                                }
                            </span>
                            <button onClick={handleNext} className="month-btn">
                                <ChevronRight size={20} />
                            </button>
                            {isRefreshing && (
                                <div className="refreshing-banner" style={{ marginLeft: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                    <Loader2 size={12} className="spinner-btn-icon" />
                                    <span>Refreshing...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="status-summary-row">
                <div className="status-pill status-pill-reels">
                    <span className="status-pill-label">Reels</span>
                    <span className="status-pill-count" style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 900 }}>{monthStatusCounts.reels}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>/</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>{client?.reels_per_month || 0}</span>
                    </span>
                </div>
                <div className="status-pill status-pill-posts">
                    <span className="status-pill-label">Posts</span>
                    <span className="status-pill-count" style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 900 }}>{monthStatusCounts.posts}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>/</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>{client?.posts_per_month || 0}</span>
                    </span>
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
                <div className="calendar-grid" style={{ gridTemplateRows: viewMode === 'week' ? 'auto 1fr' : 'repeat(6, 1fr)' }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                        <div key={day} className="calendar-header-cell">
                            <span className="desktop-day">{day}</span>
                            <span className="mobile-day">{day.charAt(0)}</span>
                        </div>
                    ))}

                    {loading && calendarData.length === 0 ? (
                        <>
                            {Array.from({ length: 35 }).map((_, idx) => (
                                <div key={idx} className="calendar-day opacity-50" style={{ minHeight: viewMode === 'week' ? '300px' : '110px' }}>
                                    <Skeleton className="h-4 w-4 mb-2" style={{ height: '16px', width: '16px', marginBottom: '8px', background: 'rgba(255, 255, 255, 0.05)' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <Skeleton className="h-4 w-full rounded" style={{ height: '16px', width: '100%', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)' }} />
                                        <Skeleton className="h-4 w-3/4 rounded" style={{ height: '16px', width: '75%', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)' }} />
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        days.map((day, idx) => {
                            const isOutOfPeriod = !isDayInPeriod(day);
                            const dayContent = isOutOfPeriod
                                ? []
                                : calendarData.filter((item) => {
                                    const itemDate = parseISO(item.scheduled_datetime);
                                    return isSameDay(itemDate, day);
                                 });

                            return (
                                <div
                                    key={idx}
                                     onClick={() => {
                                         if (isOutOfPeriod) return;
                                         if (dayContent.length > 0) {
                                             if (window.innerWidth <= 768) {
                                                 setDailyAgenda({ date: day, items: dayContent });
                                             } else {
                                                 handleItemClick(dayContent[0]);
                                             }
                                         } else {
                                             setFormData({
                                                 ...formData,
                                                 scheduled_datetime: format(day, "yyyy-MM-dd") + 'T10:00'
                                             });
                                             setShowAddModal(true);
                                         }
                                     }}
                                     className={`calendar-day ${viewMode === 'week' ? 'weekly-cell' : ''} ${isOutOfPeriod && viewMode === 'month' ? 'other-month' : ''} ${isSameDay(day, new Date()) ? 'today' : ''}`}
                                     style={{ minHeight: viewMode === 'week' ? '300px' : '110px', cursor: isOutOfPeriod ? 'default' : 'pointer', position: 'relative' }}
                                 >
                                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                         <span className="day-number">{format(day, 'd')}</span>
                                         <button 
                                             onClick={(e) => {
                                                 e.stopPropagation();
                                                 setFormData({
                                                     ...formData,
                                                     scheduled_datetime: format(day, "yyyy-MM-dd") + 'T10:00'
                                                 });
                                                 setShowAddModal(true);
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
                                     </div>
                                    <div className="day-items desktop-only">
                                         {dayContent.map((item) => (
                                             <div
                                                 key={item.id}
                                                 onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                                                 className={`content-item ${isCrossMonthRescheduled(item) ? 'rescheduled-cross-month' : item.is_rescheduled ? 'rescheduled' : (item.status || '').toUpperCase() === 'PENDING' ? 'pending' : item.content_type.toLowerCase()} ${item.is_emergency ? 'emergency' : ''}`}
                                                 title={`${item.clients?.company_name || 'Client'} - ${item.content_type}${item.clients?.team_lead?.name ? ` (TL: ${item.clients.team_lead.name})` : ''}`}
                                             >
                                                 <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                                                     {item.content_type === 'Post' ? <FileText size={10} /> : <Video size={10} />}
                                                     <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', flex: 1, whiteSpace: 'nowrap' }}>
                                                         {isCrossMonthRescheduled(item) ? '[RM] ' : item.is_rescheduled ? '[R] ' : ''}
                                                         {(item.content_type === 'Special Poster' || item.content_type === 'Special Day Poster' ? '🎉 ' : '') + item.content_type}
                                                     </span>
                                                     {item.assigned_employee?.name ? (
                                                         <span style={{
                                                             padding: '1px 6px',
                                                             borderRadius: '9999px',
                                                             background: 'rgba(16, 185, 129, 0.15)',
                                                             color: '#10b981',
                                                             fontSize: '9px',
                                                             fontWeight: 700,
                                                             whiteSpace: 'nowrap',
                                                             flexShrink: 0
                                                         }}>
                                                             {item.assigned_employee.name}
                                                         </span>
                                                     ) : (
                                                         <span style={{
                                                             padding: '1px 6px',
                                                             borderRadius: '9999px',
                                                             background: 'rgba(239, 68, 68, 0.15)',
                                                             color: '#ef4444',
                                                             fontSize: '9px',
                                                             fontWeight: 700,
                                                             whiteSpace: 'nowrap',
                                                             flexShrink: 0
                                                         }}>
                                                             Unassigned
                                                         </span>
                                                     )}
                                                     {item.status === 'POSTED' ? (
                                                         <Check size={10} style={{ color: '#10b981', flexShrink: 0 }} />
                                                     ) : (
                                                         <AlertTriangle size={10} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                                     )}
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                     <div className="mobile-day-indicators">
                                         {dayContent.map((item) => (
                                             <div
                                                 key={item.id}
                                                 className={`mobile-dot ${isCrossMonthRescheduled(item) ? 'rescheduled-cross-month' : item.is_rescheduled ? 'rescheduled' : (item.status || '').toUpperCase() === 'PENDING' ? 'pending' : item.content_type.toLowerCase()} ${item.is_emergency ? 'emergency' : ''}`}
                                             >
                                                 {item.content_type.substring(0, 4).toUpperCase()}
                                             </div>
                                         ))}
                                    </div>
                                 </div>
                            );
                        })
                    )}
                </div>
            </div>

            {dailyAgenda && (
                <div className="modal-overlay" onClick={() => setDailyAgenda(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '340px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">{format(dailyAgenda.date, 'MMMM d, yyyy')}</h3>
                            <button onClick={() => setDailyAgenda(null)} className="modal-close"><X size={20} /></button>
                        </div>
                        <div className="agenda-list" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {dailyAgenda.items.map((item) => (
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
                                        background: item.content_type === 'Post' ? '#10b981' : '#6366f1'
                                    }}></div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {(item.content_type === 'Special Poster' || item.content_type === 'Special Day Poster' ? '🎉 ' : '') + item.content_type}
                                            {item.clients?.team_lead?.name && (
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '6px' }}>
                                                    (TL: {item.clients.team_lead.name})
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            <button 
                                onClick={() => {
                                    setDailyAgenda(null);
                                    setFormData({
                                        ...formData,
                                        scheduled_datetime: format(dailyAgenda.date, "yyyy-MM-dd") + 'T10:00'
                                    });
                                    setShowAddModal(true);
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
                        </div>
                    </div>
                </div>
            )}

            {selectedItem && (
                <div className="modal-overlay">
                    <div className="modal-content modal-lg">
                        <div className="modal-header">
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span className={`type-badge ${selectedItem.item.content_type.toLowerCase()}`}>
                                        {selectedItem.item.content_type === 'Special Poster' || selectedItem.item.content_type === 'Special Day Poster' ? '🎉 ' + selectedItem.item.content_type : selectedItem.item.content_type}
                                    </span>
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
                                 <button 
                                     onClick={() => handleEditClick(selectedItem.item)} 
                                     className="btn-icon" 
                                     title="Edit Content"
                                     style={{ color: 'var(--accent)' }}
                                     disabled={actionId !== null}
                                 >
                                     <Edit size={18} />
                                 </button>
                                 <button 
                                     onClick={() => handleDeleteContent(selectedItem.item.id)} 
                                     className="btn-icon" 
                                     title="Delete Content"
                                     style={{ color: '#ef4444' }}
                                     disabled={actionId !== null}
                                 >
                                     {actionId === `delete-${selectedItem.item.id}` ? (
                                         <Loader2 size={18} className="spinner-btn-icon" />
                                     ) : (
                                         <Trash2 size={18} />
                                     )}
                                 </button>
                                 <button onClick={() => setSelectedItem(null)} className="modal-close" disabled={actionId !== null}><X size={20}/></button>
                            </div>
                        </div>

                        <div className="detail-grid" style={{ padding: '32px' }}>
                            <div className="detail-info">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                        {selectedItem.item.is_rescheduled && selectedItem.item.original_scheduled_datetime ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', gridColumn: 'span 1' }}>
                                                <div>
                                                    <label className="detail-label">Scheduled Date</label>
                                                    <div className="date-item">
                                                        <CalendarIcon size={14} />
                                                        <span className="date-display">
                                                            Actual Date: {formatIST(selectedItem.item.original_scheduled_datetime, 'dd/MM/yyyy')} rescheduled to {formatIST(selectedItem.item.scheduled_datetime, 'dd/MM/yy')}
                                                        </span>
                                                    </div>
                                                </div>
                                                {selectedItem.item.reschedule_history && selectedItem.item.reschedule_history.length > 0 && (
                                                    <div style={{ padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border)', width: '100%' }}>
                                                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Reschedule History</span>
                                                        {selectedItem.item.reschedule_history.map((h: any, idx: number) => (
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
                                                <label className="detail-label">Scheduled Date</label>
                                                <div className="date-item">
                                                    <CalendarIcon size={14} />
                                                    <span className="date-display">{format(parseISO(selectedItem.item.scheduled_datetime), 'MMM d, yyyy')}</span>
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
                                {(() => {
                                    const isOverdue = isBefore(parseISO(selectedItem.item.scheduled_datetime), new Date()) && selectedItem.item.status !== 'POSTED';
                                    if (isOverdue) {
                                        return (
                                            <button 
                                                onClick={() => handleRescheduleClick(selectedItem.item)}
                                                style={{ marginTop: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 700, fontSize: '13px', width: '100%', cursor: 'pointer' }}
                                            >
                                                <CalendarClock size={18} />
                                                Reschedule Task
                                            </button>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>

                            <div>
                                <label className="detail-label">Workflow Status</label>
                                <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
                                    <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '4px' }}>Current</p>
                                    <p style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)' }}>{selectedItem.item.status}</p>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'var(--bg-elevated)',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    marginBottom: '24px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <ShieldAlert size={18} color={selectedItem.item.is_emergency ? '#ef4444' : 'var(--text-muted)'} />
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: selectedItem.item.is_emergency ? '#ef4444' : 'var(--text-primary)' }}>
                                            Emergency Priority
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleToggleEmergency}
                                        disabled={actionId !== null}
                                        style={{
                                            width: '44px',
                                            height: '24px',
                                            borderRadius: '12px',
                                            background: selectedItem.item.is_emergency ? '#ef4444' : 'var(--bg-surface)',
                                            border: `1px solid ${selectedItem.item.is_emergency ? '#ef4444' : 'var(--border)'}`,
                                            position: 'relative',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        <div style={{
                                            width: '18px',
                                            height: '18px',
                                            borderRadius: '50%',
                                            background: selectedItem.item.is_emergency ? 'white' : 'var(--text-muted)',
                                            position: 'absolute',
                                            top: '2px',
                                            left: selectedItem.item.is_emergency ? '22px' : '2px',
                                            transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {actionId === `toggle-emergency-${selectedItem.item.id}` && (
                                                <Loader2 size={10} className="spinner-btn-icon" style={{ color: selectedItem.item.is_emergency ? '#ef4444' : 'var(--text-primary)' }} />
                                            )}
                                        </div>
                                    </button>
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
                                     const isSpecialStatus = selectedItem.item.status === 'SHOOT DONE' || selectedItem.item.status === 'POSTED';

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

            {/* Add Content Modal */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3 className="modal-title">{editingItem ? 'Edit Content' : 'Schedule New Content'}</h3>
                            <button onClick={() => { setShowAddModal(false); setEditingItem(null); setIsRescheduling(false); }} className="modal-close"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddContent}>

                            <div className="form-group">
                                <label className="form-label">Content Type</label>
                                <select 
                                    className="form-input"
                                    value={formData.content_type}
                                    onChange={(e) => setFormData({...formData, content_type: e.target.value as any})}
                                    disabled={!!editingItem}
                                >
                                    <option value="Post">Post</option>
                                    <option value="Reel">Reel</option>
                                    <option value="YouTube">YouTube</option>
                                    <option value="Special Poster">Special Poster</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Scheduled Date & Time *</label>
                                <input 
                                    type="datetime-local" 
                                    className="form-input" 
                                    required
                                    value={formData.scheduled_datetime}
                                    onChange={(e) => setFormData({...formData, scheduled_datetime: e.target.value})}
                                />
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => { setShowAddModal(false); setEditingItem(null); }}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '10px 24px', background: isRescheduling ? '#ef4444' : '' }}>
                                    {isRescheduling ? 'Confirm Reschedule' : editingItem ? 'Update' : 'Schedule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes slideUp {
                    from { transform: translate(-50%, 20px); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
                .view-mode-btn.active {
                    background: var(--primary) !important;
                    color: white !important;
                }
            ` }} />
        </div>
    );
}
