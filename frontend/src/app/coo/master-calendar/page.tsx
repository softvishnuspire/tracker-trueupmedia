"use client";

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
    addMonths,
    subMonths,
    parseISO,
    isBefore
} from 'date-fns';
import {
    ChevronLeft,
    ChevronRight,
    FileText,
    Video,
    X,
    Clock,
    Calendar as CalendarIcon,
    Filter,
    ChevronDown,
    Check,
    CalendarClock,
    AlertTriangle,
    ShieldAlert,
    Loader2
} from 'lucide-react';
import { cooApi, emergencyApi, ContentItem } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import ScheduleExport from '@/components/ScheduleExport';
import { getClientAbbreviation, formatIST } from '@/lib/utils';
import { isCrossMonthRescheduled } from '@/utils/calendarUtils';
import { useToast } from '@/components/ui/ToastProvider';
import { usePageLoading } from '@/components/ui/TopProgressBar';
import { useOptimisticAction } from '@/hooks/useOptimisticAction';

export default function CooMasterCalendar() {
    const { startLoading, stopLoading } = usePageLoading();
    const { success: toastSuccess, error: toastError } = useToast();
    const performOptimisticAction = useOptimisticAction();

    const [clients, setClients] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>('all');
    const [selectedType, setSelectedType] = useState<string>('all');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const [calendarData, setCalendarData] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [dayTasks, setDayTasks] = useState<ContentItem[]>([]);
    const [dailyAgenda, setDailyAgenda] = useState<{ date: Date; items: ContentItem[] } | null>(null);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const res = await cooApi.getClients();
                setClients(res.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchClients();
    }, []);

    const selectedClientData = clients.find(c => c.id === selectedClient);
    const isBiMonthlyView = selectedClient !== 'all' && selectedClientData?.batch_type === '15-15';

    const periodStart = isBiMonthlyView
        ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 15)
        : startOfMonth(currentMonth);

    const periodEnd = isBiMonthlyView
        ? new Date(addMonths(currentMonth, 1).getFullYear(), addMonths(currentMonth, 1).getMonth(), 15, 23, 59, 59)
        : endOfMonth(currentMonth);

    const isDayInPeriod = (day: Date): boolean => {
        if (!isBiMonthlyView) return isSameMonth(day, currentMonth);
        return day >= periodStart && day <= periodEnd;
    };

    const fetchMasterData = useCallback(async (isSilent = false) => {
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
            const res = await cooApi.getMasterCalendar(
                currentMonthStr,
                selectedClient === 'all' ? undefined : selectedClient,
                selectedType === 'all' ? undefined : selectedType
            );

            if (isBiMonthlyView) {
                const nextMonthStr = format(addMonths(currentMonth, 1), 'yyyy-MM');
                const nextRes = await cooApi.getMasterCalendar(
                    nextMonthStr,
                    selectedClient,
                    selectedType === 'all' ? undefined : selectedType
                );
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
    }, [currentMonth, selectedClient, selectedType, isBiMonthlyView, calendarData.length, startLoading, stopLoading, toastError]);

    useEffect(() => {
        const isSilent = calendarData.length > 0;
        fetchMasterData(isSilent);
    }, [fetchMasterData]);

    useEffect(() => {
        if (!selectedItem) {
            const params = new URLSearchParams(window.location.search);
            if (params.has('taskId')) {
                params.delete('taskId');
                const newSearch = params.toString();
                window.history.replaceState(null, '', newSearch ? `?${newSearch}` : window.location.pathname);
            }
        }
    }, [selectedItem]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const taskId = params.get('taskId');
        if (taskId && !loading) {
            const currentActiveId = selectedItem?.item?.id;
            if (currentActiveId !== taskId) {
                const item = calendarData.find(i => i.id === taskId);
                if (item) {
                    handleItemClick(item);
                } else {
                    handleItemClick({ id: taskId } as ContentItem);
                }
            }
        }
    }, [loading, calendarData]);

    const days = viewMode === 'month'
        ? eachDayOfInterval({
            start: startOfWeek(periodStart, { weekStartsOn: 1 }),
            end: endOfWeek(periodEnd, { weekStartsOn: 1 })
        })
        : eachDayOfInterval({
            start: startOfWeek(currentMonth, { weekStartsOn: 1 }),
            end: endOfWeek(currentMonth, { weekStartsOn: 1 })
        });

    const handlePrev = () => {
        if (viewMode === 'month') setCurrentMonth(subMonths(currentMonth, 1));
        else setCurrentMonth((prev) => new Date(prev.setDate(prev.getDate() - 7)));
    };

    const handleNext = () => {
        if (viewMode === 'month') setCurrentMonth(addMonths(currentMonth, 1));
        else setCurrentMonth((prev) => new Date(prev.setDate(prev.getDate() + 7)));
    };

    const handleItemClick = async (item: ContentItem) => {
        try {
            window.history.replaceState(null, '', `?taskId=${item.id}`);
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
                    fetchMasterData(true);
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
            } else if (normalizedType === 'POST') {
                if (normalizedStatus === 'DESIGNING COMPLETED' || shootDoneStatuses.includes(normalizedStatus)) {
                    acc.shootDone += 1;
                }
            }

            if (normalizedType === 'REEL') acc.reels += 1;
            if (normalizedType === 'POST') acc.posts += 1;

            return acc;
        },
        { shootDone: 0, contentApproved: 0, reels: 0, posts: 0 }
    );

    // Calculate assigned totals from clients
    const assignedTotals = (() => {
        if (selectedClient === 'all') {
            return clients.reduce(
                (acc, c) => ({
                    reels: acc.reels + (Number(c.reels_per_month) || 0),
                    posts: acc.posts + (Number(c.posts_per_month) || 0),
                }),
                { reels: 0, posts: 0 }
            );
        }
        const client = clients.find((c) => c.id === selectedClient);
        return {
            reels: Number(client?.reels_per_month) || 0,
            posts: Number(client?.posts_per_month) || 0,
        };
    })();

    return (
        <div>
            <header className="page-header page-header-safe">
                <div>
                    <h1 className="page-title">Master Schedule</h1>
                </div>

                <div className="header-controls">
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', background: 'var(--bg-elevated)', padding: '4px', borderRadius: '14px', border: '1px solid var(--border)', flex: 1, minWidth: '320px' }}>
                            <div style={{ padding: '0 8px', color: 'var(--text-muted)' }}>
                                <Filter size={14} />
                            </div>
                            <div className="client-dropdown-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                                <select
                                    className="client-dropdown"
                                    value={selectedClient}
                                    onChange={(e) => setSelectedClient(e.target.value)}
                                    style={{ paddingRight: '32px' }}
                                >
                                    <option value="all">All Clients</option>
                                    {clients.map((c) => (
                                        <option key={c.id} value={c.id}>{c.company_name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} style={{ position: 'absolute', right: '10px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                            </div>
                            <div style={{ width: '1px', height: '20px', background: 'var(--border)' }}></div>
                            <div className="client-dropdown-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                                <select
                                    className="client-dropdown"
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    style={{ paddingRight: '32px' }}
                                >
                                    <option value="all">All Types</option>
                                    <option value="Post">Posts</option>
                                    <option value="Reel">Reels</option>
                                    <option value="YouTube">YouTube</option>
                                </select>
                                <ChevronDown size={14} style={{ position: 'absolute', right: '10px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                            </div>
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
                                ? format(currentMonth, 'MMMM yyyy')
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

                    <ScheduleExport
                        data={calendarData}
                        clientName={selectedClient === 'all' ? 'TrueUp Media' : clients.find((c) => c.id === selectedClient)?.company_name || 'Client'}
                        month={currentMonth}
                        batchType={selectedClient !== 'all' ? clients.find((c) => c.id === selectedClient)?.batch_type : '1-1'}
                        summaryOnly={true}
                    />
                </div>
            </header>

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
                <div className="calendar-grid" style={{ gridTemplateRows: viewMode === 'week' ? 'auto 1fr' : 'auto', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
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
                                            }
                                        }}
                                        className={`calendar-day ${viewMode === 'week' ? 'weekly-cell' : ''} ${isOutOfPeriod && viewMode === 'month' ? 'other-month' : ''} ${isSameDay(day, new Date()) ? 'today' : ''}`}
                                        style={{ minHeight: viewMode === 'week' ? '300px' : '110px', cursor: (!isOutOfPeriod && dayContent.length > 0) ? 'pointer' : 'default' }}
                                    >
                                        <span className="day-number">{format(day, 'd')}</span>
                                        <div className="day-items desktop-only">
                                            {dayContent.map((item) => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => handleItemClick(item)}
                                                    className={`content-item ${isCrossMonthRescheduled(item) ? 'rescheduled-cross-month' : item.is_rescheduled ? 'rescheduled' : (item.status || '').toUpperCase() === 'PENDING' ? 'pending' : item.content_type.toLowerCase()} ${item.is_emergency ? 'emergency' : ''}`}
                                                    title={`${item.clients?.company_name} - ${item.content_type}${item.clients?.team_lead?.name ? ` (TL: ${item.clients.team_lead.name})` : ''}`}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                                                        {item.content_type === 'Post' ? <FileText size={10} /> : <Video size={10} />}
                                                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', flex: 1, whiteSpace: 'nowrap' }}>
                                                            {isCrossMonthRescheduled(item) ? '[RM] ' : item.is_rescheduled ? '[R] ' : ''}
                                                            [{getClientAbbreviation(item.clients?.company_name)}] {(item.content_type === 'Special Poster' || item.content_type === 'Special Day Poster' ? '🎉 ' : '') + item.content_type}
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
                                                    {getClientAbbreviation(item.clients?.company_name)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </>
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
                                        background: '#f8fafc', border: '1px solid #e2e8f0',
                                        display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'
                                    }}
                                >
                                    <div style={{
                                        width: '4px', height: '24px', borderRadius: '2px',
                                        background: item.content_type === 'Post' ? '#10b981' : '#6366f1'
                                    }}></div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
                                            {item.clients?.company_name}
                                        </p>
                                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
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
                        </div>
                    </div>
                </div>
            )}

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
                                            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px' }}>
                                                <CalendarClock size={18} />
                                                Overdue
                                            </div>
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

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label className="detail-label" style={{ marginBottom: 0 }}>Activity Log</label>
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
