"use client";

import React, { useEffect, useState } from 'react';
import { cooApi, emergencyApi } from '@/lib/api';
import { Users, Calendar, Activity, ShieldAlert, FileText, Video, ArrowRight, ChevronDown, Filter, ChevronLeft, ChevronRight, X, Undo2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { endOfWeek, format, isSameDay, parseISO, startOfWeek, startOfMonth, endOfMonth, addMonths, eachDayOfInterval, isSameMonth } from 'date-fns';

interface Stats {
    totalClients: number;
    totalItemsThisMonth: number;
    statusSummary: Record<string, number>;
}

export default function CooDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [calendarData, setCalendarData] = useState<any[]>([]);
    const [todayStats, setTodayStats] = useState({ total: 0, completed: 0, percentage: 0, remaining: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [emergencyTasks, setEmergencyTasks] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>('all');
    const [activeItem, setActiveItem] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [dayTasks, setDayTasks] = useState<any[]>([]);

    const [currentMonth, setCurrentMonth] = useState(new Date());

    const getClientBatchType = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        return client?.batch_type || '1-1';
    };

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Fetch clients if not already loaded
            if (clients.length === 0) {
                const clientsRes = await cooApi.getClients();
                setClients(clientsRes.data);
            }

            // Fetch master calendar
            const currentMonthStr = format(currentMonth, 'yyyy-MM');
            const calendarRes = await cooApi.getMasterCalendar(
                currentMonthStr,
                selectedClient === 'all' ? undefined : selectedClient
            );
            let data = calendarRes.data;
            
            setCalendarData(data);

            const filteredData = data;

            const breakdown = filteredData.reduce((acc: any, item: any) => {
                acc[item.status] = (acc[item.status] || 0) + 1;
                return acc;
            }, {});

            // Calculate today's stats
            const today = new Date();
            const todayItems = data.filter((item: any) => isSameDay(parseISO(item.scheduled_datetime), today));
            const totalToday = todayItems.length;
            const completedToday = todayItems.filter((item: any) => item.status === 'POSTED').length;

            setTodayStats({
                total: totalToday,
                completed: completedToday,
                remaining: totalToday - completedToday,
                percentage: totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0
            });

            // Update stats state
            if (selectedClient === 'all') {
                const statsRes = await cooApi.getStats();
                setStats({
                    ...statsRes.data,
                    statusSummary: breakdown,
                    totalItemsThisMonth: filteredData.length
                });
            } else {
                setStats({
                    totalClients: clients.length,
                    totalItemsThisMonth: filteredData.length,
                    statusSummary: breakdown
                });
            }

            const emergencyRes = await emergencyApi.getAll();
            const filteredEmergency = (emergencyRes.data || []).filter(item => 
                (item.status || '').toUpperCase() !== 'POSTED'
            );
            setEmergencyTasks(filteredEmergency);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [selectedClient, currentMonth]);

    const isBiMonthly = false;
    const periodStart = startOfMonth(currentMonth);
    const periodEnd = endOfMonth(currentMonth);

    const monthTotal = stats?.totalItemsThisMonth || 0;
    const monthCompleted = (stats?.statusSummary?.POSTED || 0) as number;
    const monthPercentage = monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0;
    
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const weekItems = calendarData.filter((item: any) => {
        const itemDate = parseISO(item.scheduled_datetime);
        return itemDate >= weekStart && itemDate <= weekEnd;
    });
    const weekTotal = weekItems.length;
    const weekCompleted = weekItems.filter((item: any) => (item.status || '').toUpperCase() === 'POSTED').length;
    const weekPercentage = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;

    if (error) return <div className="error-message">{error}</div>;

    const handleItemClick = async (item: any) => {
        try {
            // Find all tasks on the same day as the clicked item
            const day = parseISO(item.scheduled_datetime);
            
            // Collect tasks from available sources
            const tasksOnDay = calendarData.filter((i: any) => isSameDay(parseISO(i.scheduled_datetime), day));
            
            // If the item itself isn't in the list, add it
            if (!tasksOnDay.some((t: any) => t.id === item.id)) {
                tasksOnDay.push(item);
            }

            // Sort them by time
            tasksOnDay.sort((a, b) => new Date(a.scheduled_datetime).getTime() - new Date(b.scheduled_datetime).getTime());
            
            setDayTasks(tasksOnDay);

            const res = await cooApi.getContentDetails(item.id);
            setActiveItem(res.data);
            setIsModalOpen(true);
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
            const res = await cooApi.getContentDetails(nextTask.id);
            setActiveItem(res.data);
        } catch (err) { console.error(err); }
    };

    const handleUndoStatus = async () => {
        if (!activeItem) return;
        if (!window.confirm('Are you sure you want to undo the last status change?')) return;
        try {
            await cooApi.undoStatus(activeItem.item.id);
            const res = await cooApi.getContentDetails(activeItem.item.id);
            setActiveItem(res.data);
            fetchDashboardData();
        } catch (err) {
            console.error(err);
            alert('Failed to undo status change. It might be because there is no more history to undo.');
        }
    };

    return (
        <div>
            <header className="page-header">
                <div>
                    <h1 className="page-title">COO Dashboard</h1>
                    <p className="page-subtitle">Monitoring overview of system activity and client pipelines</p>
                </div>
            </header>

            <div className="stats-grid" style={{ marginBottom: '32px' }}>
                {loading ? (
                    <>
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="stat-card">
                                <Skeleton className="h-12 w-12 rounded-xl" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-8 w-12" />
                                </div>
                            </div>
                        ))}
                    </>
                ) : (
                    <>
                        <div className="stat-card">
                            <div className="stat-icon-box">
                                <Users size={24} />
                            </div>
                            <div className="stat-info">
                                <h3>Total Clients</h3>
                                <p className="stat-value">{stats?.totalClients || 0}</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon-box" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                                <Calendar size={24} />
                            </div>
                            <div className="stat-info">
                                <h3>Scheduled (Month)</h3>
                                <p className="stat-value">{stats?.totalItemsThisMonth || 0}</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon-box" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
                                <Activity size={24} />
                            </div>
                            <div className="stat-info">
                                <h3>Active Pipelines</h3>
                                <p className="stat-value">
                                    {Object.values(stats?.statusSummary || {}).reduce((a, b) => a + b, 0)}
                                </p>
                            </div>
                        </div>
                    </>
                )}
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
                            {isBiMonthly && (
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                                    {format(periodStart, 'd MMM')} - {format(periodEnd, 'd MMM')}
                                </p>
                            )}
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

            <div className="calendar-card" style={{ marginTop: '32px', background: 'var(--bg-surface)', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--border)' }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <div key={day} className="calendar-header-cell" style={{ background: 'var(--bg-elevated)', padding: '12px', textAlign: 'center', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            {day}
                        </div>
                    ))}

                    {loading ? (
                        Array.from({ length: 35 }).map((_, idx) => (
                            <div key={idx} className="calendar-day" style={{ background: 'var(--bg-surface)', minHeight: '120px', padding: '12px' }}>
                                <Skeleton className="h-4 w-4 mb-2" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        ))
                    ) : (
                        (() => {
                            const days = eachDayOfInterval({
                                start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
                                end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
                            });
                            
                            return days.map((day: Date, idx: number) => {
                                const dayContent = calendarData.filter((item: any) => isSameDay(parseISO(item.scheduled_datetime), day));
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => { if (dayContent.length > 0) handleItemClick(dayContent[0]); }}
                                        className={`calendar-day ${!isSameMonth(day, currentMonth) ? 'other-month' : ''} ${isSameDay(day, new Date()) ? 'today' : ''}`}
                                        style={{ 
                                            background: isSameMonth(day, currentMonth) ? 'var(--bg-surface)' : 'rgba(0,0,0,0.02)', 
                                            minHeight: '120px', 
                                            padding: '12px',
                                            cursor: dayContent.length > 0 ? 'pointer' : 'default',
                                            transition: 'all 0.2s ease',
                                            position: 'relative',
                                            opacity: isSameMonth(day, currentMonth) ? 1 : 0.4
                                        }}
                                    >
                                        <span className="day-number" style={{ fontSize: '12px', fontWeight: 700, color: isSameDay(day, new Date()) ? 'var(--accent)' : 'var(--text-muted)' }}>{format(day, 'd')}</span>
                                        <div className="day-items" style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {dayContent.map((item: any) => (
                                                <div
                                                    key={item.id}
                                                    onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                                                    className={`content-item ${item.content_type.toLowerCase()}`}
                                                    style={{ 
                                                        fontSize: '10px', 
                                                        padding: '4px 8px', 
                                                        background: 'var(--bg-elevated)', 
                                                        borderRadius: '6px', 
                                                        border: '1px solid var(--border)',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    {item.content_type === 'Post' ? <FileText size={10} /> : <Video size={10} />}
                                                    <span>{item.title}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            });
                        })()
                    )}
                </div>
            </div>

            <div className="coo-main-grid">
                <div className="dashboard-card" style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Production Pipeline</h3>
                        <span style={{ fontSize: '11px', background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: '20px', fontWeight: 700, color: 'var(--accent)' }}>Live Status</span>
                    </div>

                    <div className="pipeline-summary-grid">
                        <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--border)' }}>
                            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700, textTransform: 'uppercase' }}>Total Tasks</p>
                            <p style={{ fontSize: '20px', fontWeight: 900 }}>{stats?.totalItemsThisMonth || 0}</p>
                        </div>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <p style={{ fontSize: '10px', color: 'var(--success)', marginBottom: '4px', fontWeight: 700, textTransform: 'uppercase' }}>Completed</p>
                            <p style={{ fontSize: '20px', fontWeight: 900, color: 'var(--success)' }}>{stats?.statusSummary?.['POSTED'] || 0}</p>
                        </div>
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '16px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                            <p style={{ fontSize: '10px', color: 'var(--warning)', marginBottom: '4px', fontWeight: 700, textTransform: 'uppercase' }}>Pending</p>
                            <p style={{ fontSize: '20px', fontWeight: 900, color: 'var(--warning)' }}>{(stats?.totalItemsThisMonth || 0) - (stats?.statusSummary?.['POSTED'] || 0)}</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(() => {
                    const summary = stats?.statusSummary || {};
                    const normalized: Record<string, number> = {};
                    Object.entries(summary).forEach(([status, count]) => {
                        const s = status === 'CONTENT READY' ? 'CONTENT APPROVED' : status;
                        normalized[s] = (normalized[s] || 0) + (count as number);
                    });
                    
                    return Object.entries(normalized).map(([status, count]) => (
                        <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>{status}</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>{count}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/ {stats?.totalItemsThisMonth || 0}</span>
                            </div>
                        </div>
                    ));
                })()}
                        {Object.keys(stats?.statusSummary || {}).length === 0 && (
                            <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>No content items this month.</p>
                        )}
                    </div>
                </div>

                <div className="dashboard-card" style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Filter by Client</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Select a client to monitor their specific pipeline progress.</p>
                    </div>

                    <div style={{ position: 'relative', marginBottom: '20px' }}>
                        <select
                            style={{ 
                                width: '100%', 
                                padding: '14px 40px 14px 16px', 
                                background: 'var(--bg-elevated)', 
                                border: '1px solid var(--border)', 
                                borderRadius: '16px', 
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                fontWeight: 600,
                                appearance: 'none',
                                cursor: 'pointer'
                            }}
                            value={selectedClient}
                            onChange={(e) => setSelectedClient(e.target.value)}
                        >
                            <option value="all">All Clients</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.company_name}</option>
                            ))}
                        </select>
                        <ChevronDown size={18} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                    </div>

                    <div style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '16px', borderRadius: '16px', border: '1px dashed var(--accent)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent)', marginBottom: '8px' }}>
                            <Filter size={16} />
                            <span style={{ fontSize: '13px', fontWeight: 700 }}>Filter Active</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                            Currently showing {selectedClient === 'all' ? 'aggregated data for all clients' : `data for ${clients.find(c => c.id === selectedClient)?.company_name}`}.
                        </p>
                    </div>
                </div>
            </div>


            {emergencyTasks.length > 0 && (
                <div className="emergency-panel" style={{ marginTop: '32px' }}>
                    <div className="emergency-panel-header">
                        <ShieldAlert size={24} color="#ef4444" />
                        <h2 className="emergency-panel-title">All Emergency Tasks</h2>
                    </div>
                    <div className="emergency-list">
                        {emergencyTasks.map((task: any) => (
                            <div key={task.id} className="emergency-card" onClick={() => handleItemClick(task)} style={{ cursor: 'pointer' }}>
                                <div className="emergency-card-icon">
                                    {task.content_type === 'Post' ? <FileText size={20} /> : <Video size={20} />}
                                </div>
                                <div className="emergency-card-info">
                                    <p className="emergency-card-client">{task.clients?.company_name}</p>
                                    <p className="emergency-card-type">{task.content_type} • {format(parseISO(task.scheduled_datetime), 'p')}</p>
                                </div>
                                <ArrowRight size={18} color="var(--text-muted)" />
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {isModalOpen && activeItem && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h3 className="modal-title">{activeItem.item.title}</h3>
                                {dayTasks.length > 1 && (
                                    <span className="task-counter" style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                        Task {dayTasks.findIndex(t => t.id === activeItem.item.id) + 1} of {dayTasks.length}
                                    </span>
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
                                <button onClick={() => setIsModalOpen(false)} className="modal-close"><X size={20} /></button>
                            </div>
                        </div>
                        
                        <div className="modal-body" style={{ padding: '32px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                <div className="detail-section">
                                    <div className="detail-field">
                                        <label className="detail-label" style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Client</label>
                                        <p className="detail-value" style={{ fontSize: '15px', fontWeight: 700 }}>{activeItem.item.clients?.company_name}</p>
                                    </div>
                                    <div className="detail-field" style={{ marginTop: '20px' }}>
                                        <label className="detail-label" style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Scheduled For</label>
                                        <div className="date-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Calendar size={16} color="var(--text-muted)" />
                                            <span className="date-display" style={{ fontWeight: 600 }}>{format(parseISO(activeItem.item.scheduled_datetime), 'PPP p')}</span>
                                        </div>
                                    </div>
                                    <div className="detail-field" style={{ marginTop: '20px' }}>
                                        <label className="detail-label" style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Description</label>
                                        <p className="detail-text" style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{activeItem.item.description || 'No description provided.'}</p>
                                    </div>
                                </div>
                                <div className="detail-section">
                                    <div className="detail-field">
                                        <label className="detail-label" style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Current Status</label>
                                        <span className={`status-badge ${activeItem.item.status.toLowerCase().replace(/ /g, '-')}`} style={{ display: 'inline-block', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 800, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                                            {activeItem.item.status}
                                        </span>
                                    </div>
                                    
                                    <div style={{ marginTop: '32px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <label className="detail-label" style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 0 }}>Status History</label>
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
                                            Undo
                                        </button>
                                    </div>
                                        <div className="history-timeline">
                                            {activeItem.history?.map((h: any, i: number) => (
                                                <div key={i} className="history-item" style={{ display: 'flex', gap: '16px', marginBottom: '16px', position: 'relative' }}>
                                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent)', marginTop: '4px', zIndex: 2 }}></div>
                                                    <div>
                                                        <p style={{ fontWeight: 700, fontSize: '13px' }}>{h.old_status} → {h.new_status}</p>
                                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                            {h.users?.name || 'System'} • {format(parseISO(h.changed_at), 'MMM d, h:mm a')}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
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
