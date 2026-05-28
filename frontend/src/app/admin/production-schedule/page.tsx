"use client";

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
    FileText,
    Video,
    X,
    Clock,
    Check,
    AlertTriangle,
    Globe,
    CalendarIcon,
    ChevronDown,
    CalendarClock,
    LayoutDashboard,
    ShieldAlert,
    ArrowRight,
    Search,
    Filter
} from 'lucide-react';
import { adminApi, ContentItem, ContentDetails, phApi } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import NotificationBell from '@/components/NotificationBell';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function MasterProductionSchedule() {
    const [calendarData, setCalendarData] = useState<ContentItem[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>('all');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [activeItem, setActiveItem] = useState<any>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [dayTasks, setDayTasks] = useState<ContentItem[]>([]);
    const [user, setUser] = useState<any>(null);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/');
                return;
            }
            setUser(user);
        };
        checkUser();
        fetchClients();
    }, []);

    useEffect(() => {
        fetchMasterCalendar();
    }, [selectedClient, currentMonth]);

    const fetchClients = async () => {
        try {
            const res = await adminApi.getClients();
            setClients(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchMasterCalendar = async () => {
        setLoading(true);
        try {
            const currentMonthStr = format(currentMonth, 'yyyy-MM');
            // Use phApi version of the query but as Admin (Admin has permission)
            // Or better, use adminApi.getMasterCalendar which is identical logic-wise
            const res = await adminApi.getMasterCalendar(currentMonthStr, selectedClient === 'all' ? undefined : selectedClient);
            const productionStatuses = ['CONTENT APPROVED', 'SHOOT DONE', 'EDITING IN PROGRESS', 'EDITED', 'DESIGNING IN PROGRESS', 'DESIGNING COMPLETED', 'WAITING FOR APPROVAL'];
            setCalendarData((res.data || []).filter((item: ContentItem) => productionStatuses.includes(item.status)));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleItemClick = async (item: ContentItem) => {
        try {
            const res = await adminApi.getContentDetails(item.id);
            const fetchedItem = res.data.item;

            const day = parseISO(fetchedItem.scheduled_datetime);
            const tasksOnDay = calendarData.filter(i => isSameDay(parseISO(i.scheduled_datetime), day));
            
            if (!tasksOnDay.some(t => t.id === fetchedItem.id)) {
                tasksOnDay.push(fetchedItem);
            }

            tasksOnDay.sort((a, b) => new Date(a.scheduled_datetime).getTime() - new Date(b.scheduled_datetime).getTime());
            
            setDayTasks(tasksOnDay);
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
            const res = await adminApi.getContentDetails(nextTask.id);
            setActiveItem(res.data);
        } catch (err) { console.error(err); }
    };

    const isDayInPeriod = (date: Date) => {
        return isSameMonth(date, currentMonth);
    };

    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
    });

    return (
        <div className="admin-page-container">
            <header className="page-header page-header-safe">
                <div className="header-content">
                    <div className="header-info">
                        <h1 className="page-title">Master Production Schedule</h1>
                        <p className="page-subtitle">Unified view of all production status across clients</p>
                    </div>
                    
                    <div className="header-controls">
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                             <div className="client-dropdown-wrapper">
                                <Filter size={16} className="filter-icon" />
                                <select 
                                    className="client-dropdown" 
                                    value={selectedClient} 
                                    onChange={(e) => setSelectedClient(e.target.value)}
                                >
                                    <option value="all">All Clients</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                                </select>
                            </div>
                            
                            <div className="month-nav">
                                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="month-btn">
                                    <ChevronLeft size={20} />
                                </button>
                                <span className="month-label">{format(currentMonth, 'MMMM yyyy')}</span>
                                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="month-btn">
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Legend Bar */}
            <div className="calendar-legend-bar" style={{ marginTop: '24px' }}>
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

            <main className="calendar-card" style={{ marginTop: '24px' }}>
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
                            const dayContent = calendarData.filter(item => isSameDay(parseISO(item.scheduled_datetime), day));
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
                                                className={`content-item ${item.is_rescheduled ? 'rescheduled' : (item.status || '').toUpperCase() === 'PENDING' ? 'pending' : item.content_type.toLowerCase()} ${item.is_emergency ? 'emergency' : ''}`}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
                                                    {item.content_type === 'Post' ? <FileText size={10} /> : <Video size={10} />}
                                                    <span className="truncate" style={{ flex: 1 }}>
                                                        {`[${item.clients?.company_name?.substring(0, 3)}] `}{(item.content_type === 'Special Poster' || item.content_type === 'Special Day Poster' ? '🎉 ' : '') + item.content_type}
                                                    </span>
                                                    {['SHOOT DONE', 'EDITED', 'DESIGNING COMPLETED', 'WAITING FOR APPROVAL', 'APPROVED', 'WAITING FOR POSTING', 'POSTED'].includes(item.status) ? (
                                                        <Check size={10} style={{ color: '#10b981', flexShrink: 0 }} />
                                                    ) : (
                                                        <AlertTriangle size={10} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mobile-day-indicators">
                                        {dayContent.map(item => (
                                            <div 
                                                key={item.id} 
                                                className={`mobile-dot ${item.is_rescheduled ? 'rescheduled' : (item.status || '').toUpperCase() === 'PENDING' ? 'pending' : item.content_type.toLowerCase()} ${item.is_emergency ? 'emergency' : ''}`}
                                            >
                                                {item.clients?.company_name?.substring(0, 3).toUpperCase() || 'CLI'}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
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
                                <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent)', marginTop: '4px' }}>
                                    Team Lead: {activeItem.item.clients?.team_lead?.name || 'Not Assigned'}
                                </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {dayTasks.length > 1 && (
                                    <div className="task-nav-buttons" style={{ display: 'flex', gap: '4px', marginRight: '8px', paddingRight: '12px', borderRight: '1px solid var(--border)' }}>
                                        <button onClick={() => navigateToTask('prev')} className="nav-btn"><ChevronLeft size={18} /></button>
                                        <button onClick={() => navigateToTask('next')} className="nav-btn"><ChevronRight size={18} /></button>
                                    </div>
                                )}
                                <button onClick={() => setIsDetailsOpen(false)} className="modal-close"><X size={20} /></button>
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
                                        <label className="detail-label">Workflow Status</label>
                                        <div style={{ marginTop: '8px' }}>
                                            <span className={`status-badge ${activeItem.item.status.toLowerCase().replace(/ /g, '-')}`} style={{ padding: '8px 16px', fontSize: '14px' }}>
                                                {activeItem.item.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
