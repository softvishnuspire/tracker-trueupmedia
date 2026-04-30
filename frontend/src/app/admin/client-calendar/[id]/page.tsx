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
    isPast,
    isBefore,
    startOfDay,
    getDate,
    lastDayOfMonth
} from 'date-fns';
import { 
    ChevronLeft, 
    ChevronRight, 
    FileText,
    Video,
    X,
    Clock,
    Calendar as CalendarIcon,
    Plus,
    ArrowLeft,
    Edit,
    Trash2,
    Check,
    CalendarClock,
    Undo2
} from 'lucide-react';
import { gmApi, adminApi, emergencyApi, Client, ContentItem, StatusHistoryItem } from '@/lib/api';
import { ShieldAlert } from 'lucide-react';
import ScheduleExport from '@/components/ScheduleExport';

export default function ClientCalendarPage() {
    const params = useParams();
    const router = useRouter();
    const clientId = params.id as string;

    const [client, setClient] = useState<Client | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const [calendarData, setCalendarData] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{ item: ContentItem; history: StatusHistoryItem[] } | null>(null);
    const [dailyAgenda, setDailyAgenda] = useState<{ date: Date, items: ContentItem[] } | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
    const [isRescheduling, setIsRescheduling] = useState(false);

    const [formData, setFormData] = useState({
        content_type: 'Post' as 'Post' | 'Reel',
        scheduled_datetime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        client_id: clientId,
        title: '',
        description: ''
    });

    const fetchClientInfo = useCallback(async () => {
        try {
            const res = await adminApi.getClients();
            const found = res.data.find((c: Client) => c.id === clientId);
            if (found) setClient(found);
        } catch (err) { console.error(err); }
    }, [clientId]);

    const fetchCalendarData = useCallback(async () => {
        setLoading(true);
        try {
            const currentMonthStr = format(currentMonth, 'yyyy-MM');
            const res = await adminApi.getMasterCalendar(currentMonthStr, clientId);

            if (client?.batch_type === '15-15') {
                // For 15-15 clients, also fetch next month since the period spans two months
                const nextMonthStr = format(addMonths(currentMonth, 1), 'yyyy-MM');
                const nextRes = await adminApi.getMasterCalendar(nextMonthStr, clientId);
                setCalendarData([...res.data, ...nextRes.data]);
            } else {
                setCalendarData(res.data);
            }
        } catch (err) { console.error(err); } finally { setLoading(false); }
    }, [currentMonth, clientId, client?.batch_type]);

    useEffect(() => {
        fetchClientInfo();
        fetchCalendarData();
    }, [fetchClientInfo, fetchCalendarData]);

    // For 15-15 clients, the period spans from 15th of current month to 15th of next month
    const isBiMonthly = (client?.batch_type || '1-1') === '15-15';

    const periodStart = isBiMonthly
        ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 15)
        : startOfMonth(currentMonth);
    const nextMonth = addMonths(currentMonth, 1);
    const periodEnd = isBiMonthly
        ? new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15)
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
        else setCurrentMonth(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() - 7);
            return d;
        });
    };

    const handleNext = () => {
        if (viewMode === 'month') setCurrentMonth(addMonths(currentMonth, 1));
        else setCurrentMonth(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() + 7);
            return d;
        });
    };

    const handleItemClick = async (item: ContentItem) => {
        try {
            const res = await adminApi.getContentDetails(item.id);
            setSelectedItem(res.data);
        } catch (err) { console.error(err); }
    };

    const handleEditClick = (item: ContentItem) => {
        setIsRescheduling(false);
        setEditingItem(item);
        setFormData({
            content_type: item.content_type,
            scheduled_datetime: format(parseISO(item.scheduled_datetime), "yyyy-MM-dd'T'HH:mm"),
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
            scheduled_datetime: format(parseISO(item.scheduled_datetime), "yyyy-MM-dd'T'HH:mm"),
            client_id: item.client_id,
            title: item.title || '',
            description: item.description || ''
        });
        setSelectedItem(null);
        setShowAddModal(true);
    };

    const handleDeleteContent = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this content item?')) return;
        try {
            await adminApi.deleteContent(id);
            setSelectedItem(null);
            fetchCalendarData();
        } catch (err) { console.error(err); alert('Failed to delete content'); }
    };

    const handleUndoStatus = async () => {
        if (!selectedItem) return;
        if (!window.confirm('Are you sure you want to undo the last status change?')) return;
        try {
            await adminApi.undoStatus(selectedItem.item.id);
            const res = await adminApi.getContentDetails(selectedItem.item.id);
            setSelectedItem(res.data);
            fetchCalendarData();
        } catch (err) { 
            console.error(err); 
            alert('Failed to undo status change. It might be because there is no more history to undo.'); 
        }
    };

    const handleToggleEmergency = async () => {
        if (!selectedItem) return;
        try {
            const res: any = await emergencyApi.toggle(selectedItem.item.id);
            if (res.data.success) {
                setSelectedItem({
                    ...selectedItem,
                    item: {
                        ...selectedItem.item,
                        is_emergency: res.data.is_emergency
                    }
                });
                // Update calendar data
                setCalendarData(prev => prev.map(item => 
                    item.id === selectedItem.item.id 
                        ? { ...item, is_emergency: res.data.is_emergency } 
                        : item
                ));
            }
        } catch (err) { console.error('Error toggling emergency:', err); }
    };

    const handleAddContent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await adminApi.updateContent(editingItem.id, {
                    ...formData,
                    is_rescheduled: isRescheduling ? true : editingItem.is_rescheduled
                });
            } else {
                await adminApi.addContent(formData);
            }
            setShowAddModal(false);
            setEditingItem(null);
            setIsRescheduling(false);
            setFormData({
                content_type: 'Post',
                scheduled_datetime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                client_id: clientId,
                title: '',
                description: ''
            });
            fetchCalendarData();
        } catch (err) { console.error(err); alert('Error saving content'); }
    };

    const monthStatusCounts = calendarData.reduce(
        (acc, item) => {
            const normalizedStatus = (item.status || '').toUpperCase();
            if (normalizedStatus.includes('CONTENT')) acc.content += 1;
            if (normalizedStatus.includes('DESIGN')) acc.design += 1;
            if (normalizedStatus === 'POSTED') acc.posted += 1;
            return acc;
        },
        { content: 0, design: 0, posted: 0 }
    );

    if (!client && !loading) return <div className="p-8">Loading client info...</div>;

    return (
        <div>
            <header className="page-header page-header-safe">
                <div className="header-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button onClick={() => router.back()} className="btn-icon">
                            <ArrowLeft size={18} />
                        </button>
                        <div className="header-info">
                            <h1 className="page-title">{client?.company_name} Calendar</h1>
                            <p className="page-subtitle">Manage scheduling and content for this client</p>
                        </div>
                    </div>

                    <div className="header-controls">
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
                                <ChevronLeft size={20}/>
                            </button>
                            <span className="month-label">
                                {viewMode === 'month'
                                    ? getPeriodLabel()
                                    : `Week of ${format(startOfWeek(currentMonth, { weekStartsOn: 1 }), 'MMM d')}`
                                }
                            </span>
                            <button onClick={handleNext} className="month-btn">
                                <ChevronRight size={20}/>
                            </button>
                        </div>

                        <ScheduleExport 
                            data={calendarData}
                            clientName={client?.company_name || 'Client'}
                            month={currentMonth}
                            batchType={client?.batch_type}
                        />
                    </div>
                </div>
            </header>

            <div className="status-summary-row">
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
            </div>

            {loading && <div className="loading-bar">Updating calendar...</div>}

            <div className="calendar-card">
                <div className="calendar-grid" style={{ gridTemplateRows: viewMode === 'week' ? 'auto 1fr' : 'repeat(6, 1fr)' }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <div key={day} className="calendar-header-cell">
                            <span className="desktop-day">{day}</span>
                            <span className="mobile-day">{day.charAt(0)}</span>
                        </div>
                    ))}

                    {days.map((day, idx) => {
                        const dayContent = calendarData.filter(item => {
                            const itemDate = parseISO(item.scheduled_datetime);
                            return isSameDay(itemDate, day);
                        });
                        const isOutOfPeriod = !isDayInPeriod(day);

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
                                className={`calendar-day ${viewMode === 'week' ? 'weekly-cell' : ''} ${isOutOfPeriod ? 'other-month' : ''} ${isSameDay(day, new Date()) ? 'today' : ''}`}
                                style={{
                                    minHeight: viewMode === 'week' ? '300px' : '110px',
                                    cursor: isOutOfPeriod ? 'default' : 'pointer',
                                    position: 'relative'
                                }}
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
                                    {dayContent.map(item => (
                                        <div 
                                            key={item.id}
                                            onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                                            className={`content-item ${item.is_rescheduled ? 'rescheduled' : item.content_type.toLowerCase()} ${item.is_emergency ? 'emergency' : ''}`}
                                        >
                                            {item.content_type === 'Post' ? <FileText size={10}/> : <Video size={10}/>}
                                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                {item.is_rescheduled ? '[R] ' : ''}
                                                {item.content_type}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mobile-day-indicators">
                                    {dayContent.map(item => (
                                        <div 
                                            key={item.id}
                                            className={`mobile-dot ${item.is_rescheduled ? 'rescheduled' : item.content_type.toLowerCase()} ${item.is_emergency ? 'emergency' : ''}`}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {dailyAgenda && (
                <div className="modal-overlay" onClick={() => setDailyAgenda(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '340px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">{format(dailyAgenda.date, 'MMMM d, yyyy')}</h3>
                            <button onClick={() => setDailyAgenda(null)} className="modal-close"><X size={20}/></button>
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
                                        background: item.content_type === 'Post' ? '#10b981' : '#6366f1' 
                                    }}></div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.content_type}</p>
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

            {/* View Details Modal */}
            {selectedItem && (
                <div className="modal-overlay">
                    <div className="modal-content modal-lg">
                        <div className="modal-header">
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span className={`type-badge ${selectedItem.item.content_type.toLowerCase()}`}>
                                        {selectedItem.item.content_type}
                                    </span>
                                </div>
                                <h3 className="modal-title">{selectedItem.item.title || selectedItem.item.content_type}</h3>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button 
                                    onClick={() => handleEditClick(selectedItem.item)} 
                                    className="btn-icon" 
                                    title="Edit Content"
                                    style={{ color: 'var(--accent)' }}
                                >
                                    <Edit size={18} />
                                </button>
                                <button 
                                    onClick={() => handleDeleteContent(selectedItem.item.id)} 
                                    className="btn-icon" 
                                    title="Delete Content"
                                    style={{ color: '#ef4444' }}
                                >
                                    <Trash2 size={18} />
                                </button>
                                <button onClick={() => setSelectedItem(null)} className="modal-close"><X size={20}/></button>
                            </div>
                        </div>
                        
                        <div className="detail-grid" style={{ padding: '32px' }}>
                            <div className="detail-info">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                    <div>
                                        <label className="detail-label">Scheduled Date</label>
                                        <div className="date-item">
                                            <CalendarIcon size={14} />
                                            <span className="date-display">{format(parseISO(selectedItem.item.scheduled_datetime), 'MMM d, yyyy')}</span>
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
                                        <ShieldAlert size={18} color={selectedItem.item.is_emergency ? "#ef4444" : "var(--text-muted)"} />
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: selectedItem.item.is_emergency ? "#ef4444" : "var(--text-primary)" }}>
                                            Emergency Priority
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleToggleEmergency}
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
                                            transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                                        }}></div>
                                    </button>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label className="detail-label" style={{ marginBottom: 0 }}>Activity Log</label>
                                    {selectedItem.history.length > 0 && (
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
                                    )}
                                </div>
                                <div style={{ marginTop: '24px', position: 'relative', paddingLeft: '12px', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ 
                                        position: 'absolute', left: '23px', top: '12px', bottom: '12px', 
                                        width: '2px', background: 'linear-gradient(to bottom, #10b981 0%, var(--border) 100%)', opacity: 0.3, zIndex: 1 
                                    }}></div>
                                    {(() => {
                                        const flows: any = {
                                            'Reel': [
                                                'CONTENT READY', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED',
                                                'WAITING FOR APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
                                            ],
                                            'Post': [
                                                'CONTENT APPROVED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED',
                                                'WAITING FOR APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'
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
                                                        alignItems: 'center', justifyContent: 'center',
                                                        boxShadow: isCompleted ? '0 0 15px rgba(16, 185, 129, 0.4)' : isCurrent ? '0 0 20px rgba(99, 102, 241, 0.5)' : 'none',
                                                        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
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
                                                            letterSpacing: '0.02em', transition: 'all 0.3s'
                                                        }}>{status}</span>
                                                        {historyEntry && (
                                                            <div style={{ 
                                                                display: 'flex', flexDirection: 'column', marginTop: '6px',
                                                                padding: '10px 14px', background: 'var(--bg-elevated)',
                                                                borderRadius: '12px', border: '1px solid var(--border)'
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
                                                                        background: 'var(--bg-surface)', borderRadius: '8px', 
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
                                    onChange={(e) => setFormData({...formData, content_type: e.target.value as 'Post' | 'Reel'})}
                                    disabled={!!editingItem}
                                >
                                    <option value="Post">Post</option>
                                    <option value="Reel">Reel</option>
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
