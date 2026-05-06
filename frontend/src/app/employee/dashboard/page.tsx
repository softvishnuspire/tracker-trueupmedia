'use client';

import React, { useState, useEffect } from 'react';
import { 
    format, 
    isToday, 
    isBefore, 
    isAfter,
    startOfToday, 
    endOfToday,
    parseISO 
} from 'date-fns';
import { 
    CheckCircle2, 
    Circle, 
    Clock, 
    Video, 
    FileText, 
    AlertCircle,
    Calendar,
    ChevronRight,
    Search,
    History as HistoryIcon,
    LayoutDashboard
} from 'lucide-react';
import { employeeApi } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import './employee.css';

interface Task {
    id: string;
    title: string;
    description: string;
    content_type: string;
    scheduled_datetime: string;
    employee_task_status: 'PENDING' | 'COMPLETED';
    clients: { company_name: string };
}

export default function EmployeeDashboard() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [historyTasks, setHistoryTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [view, setView] = useState<'dashboard' | 'history'>('dashboard');
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

    const fetchDashboardTasks = async () => {
        setLoading(true);
        try {
            const res = await employeeApi.getTasks();
            const sanitizedTasks: Task[] = res.data.map(item => ({
                ...item,
                employee_task_status: (item.employee_task_status || 'PENDING') as 'PENDING' | 'COMPLETED'
            })) as Task[];
            setTasks(sanitizedTasks);
        } catch (err) {
            console.error('Error fetching dashboard tasks:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistoryTasks = async (month: string) => {
        setHistoryLoading(true);
        try {
            const res = await employeeApi.getTasks(month);
            const sanitizedTasks: Task[] = res.data.map(item => ({
                ...item,
                employee_task_status: (item.employee_task_status || 'PENDING') as 'PENDING' | 'COMPLETED'
            })) as Task[];
            setHistoryTasks(sanitizedTasks);
        } catch (err) {
            console.error('Error fetching history tasks:', err);
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        if (view === 'dashboard') {
            fetchDashboardTasks();
        } else {
            fetchHistoryTasks(selectedMonth);
        }
    }, [view, selectedMonth]);

    const handleToggleStatus = async (task: Task) => {
        setUpdatingId(task.id);
        const newStatus = task.employee_task_status === 'PENDING' ? 'COMPLETED' : 'PENDING';
        try {
            await employeeApi.updateTaskStatus(task.id, newStatus);
            
            // Update both states to ensure UI is consistent
            const updateFn = (prev: Task[]): Task[] => prev.map(t => 
                t.id === task.id ? { ...t, employee_task_status: newStatus as 'PENDING' | 'COMPLETED' } : t
            );
            setTasks(updateFn);
            setHistoryTasks(updateFn);
        } catch (err) {
            alert('Failed to update status');
        } finally {
            setUpdatingId(null);
        }
    };

    const todayTasks = tasks.filter(t => isToday(parseISO(t.assigned_at || t.scheduled_datetime)));
    const pendingTasks = tasks.filter(t => 
        isBefore(parseISO(t.assigned_at || t.scheduled_datetime), startOfToday()) && 
        t.employee_task_status === 'PENDING'
    );

    const renderDashboard = () => (
        <>
            {pendingTasks.length > 0 && (
                <section className="task-section">
                    <div className="section-header">
                        <h2 className="section-title" style={{ color: 'var(--danger)' }}>
                            <AlertCircle size={20} />
                            Overdue Tasks
                        </h2>
                        <span className="task-count-badge" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                            {pendingTasks.length}
                        </span>
                    </div>
                    <div className="task-grid">
                        {pendingTasks.map(task => (
                            <TaskCard 
                                key={task.id} 
                                task={task} 
                                onToggle={() => handleToggleStatus(task)} 
                                isUpdating={updatingId === task.id} 
                            />
                        ))}
                    </div>
                </section>
            )}

            <section className="task-section">
                <div className="section-header">
                    <h2 className="section-title">
                        <Calendar size={20} />
                        Today's Assignments
                    </h2>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <select 
                            className="client-dropdown" 
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as any)}
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                        </select>
                        <span className="task-count-badge">{todayTasks.length}</span>
                    </div>
                </div>

                {todayTasks.length === 0 ? (
                    <div className="empty-tasks">
                        <div className="empty-icon-box"><CheckCircle2 size={32} /></div>
                        <h3>No Tasks for Today</h3>
                        <p>Enjoy your day! Check back later for new assignments.</p>
                    </div>
                ) : (
                    <div className="task-grid">
                        {todayTasks
                            .filter(t => {
                                if (filter === 'pending') return t.employee_task_status === 'PENDING';
                                if (filter === 'completed') return t.employee_task_status === 'COMPLETED';
                                return true;
                            })
                            .map(task => (
                                <TaskCard 
                                    key={task.id} 
                                    task={task} 
                                    onToggle={() => handleToggleStatus(task)} 
                                    isUpdating={updatingId === task.id} 
                                />
                            ))
                        }
                    </div>
                )}
            </section>

        </>
    );

    const renderHistory = () => (
        <section className="task-section">
            <div className="section-header">
                <h2 className="section-title">
                    <HistoryIcon size={20} />
                    Assignment History
                </h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <input 
                        type="month" 
                        className="client-dropdown"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                    <span className="task-count-badge">{historyTasks.length}</span>
                </div>
            </div>

            {historyLoading ? (
                <div className="task-grid">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
                </div>
            ) : historyTasks.length === 0 ? (
                <div className="empty-tasks">
                    <div className="empty-icon-box"><Clock size={32} /></div>
                    <h3>No assignments found</h3>
                    <p>There were no tasks assigned to you in {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}.</p>
                </div>
            ) : (
                <div className="task-grid">
                    {historyTasks.map(task => (
                        <TaskCard 
                            key={task.id} 
                            task={task} 
                            onToggle={() => handleToggleStatus(task)} 
                            isUpdating={updatingId === task.id} 
                        />
                    ))}
                </div>
            )}
        </section>
    );

    if (loading && view === 'dashboard') {
        return (
            <div className="employee-dashboard">
                <div className="welcome-section">
                    <Skeleton className="h-10 w-64 mb-4" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <div className="task-grid">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="employee-dashboard">
            <header className="welcome-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 className="welcome-title">{view === 'dashboard' ? 'Daily Task Management' : 'Assignment History'}</h1>
                        <p className="welcome-subtitle">
                            {format(new Date(), 'EEEE, MMMM do')} • You have {tasks.filter(t => t.employee_task_status === 'PENDING').length} pending assignments.
                        </p>
                    </div>
                    <div className="view-toggle-container">
                        <button 
                            className={`view-toggle-btn ${view === 'dashboard' ? 'active' : ''}`}
                            onClick={() => setView('dashboard')}
                        >
                            <LayoutDashboard size={16} />
                            Today
                        </button>
                        <button 
                            className={`view-toggle-btn ${view === 'history' ? 'active' : ''}`}
                            onClick={() => setView('history')}
                        >
                            <HistoryIcon size={16} />
                            History
                        </button>
                    </div>
                </div>
            </header>

            {view === 'dashboard' ? renderDashboard() : renderHistory()}
        </div>
    );
}

function TaskCard({ task, onToggle, isUpdating }: { task: Task, onToggle: () => void, isUpdating: boolean }) {
    const isCompleted = task.employee_task_status === 'COMPLETED';
    
    return (
        <div className={`task-card ${isCompleted ? 'completed' : ''}`}>
            <div className="task-card-header">
                <span className="task-client-badge">{task.clients.company_name}</span>
                <div className="task-type-badge">
                    {task.content_type === 'Reel' || task.content_type === 'YouTube' ? <Video size={14} /> : <FileText size={14} />}
                    {task.content_type}
                </div>
            </div>

            <h3 className="task-title">{task.title}</h3>
            <p className="task-description">{task.description || 'No additional instructions provided for this task.'}</p>

            <div className="task-footer">
                <div className="task-time" title={`Post Date: ${format(parseISO(task.scheduled_datetime), 'MMM do, h:mm a')}`}>
                    <Calendar size={14} />
                    Assigned: {format(parseISO(task.assigned_at || task.scheduled_datetime), 'MMM do')}
                </div>
                <button 
                    className={`btn-complete-toggle ${isCompleted ? 'completed' : 'pending'}`}
                    onClick={(e) => { e.stopPropagation(); onToggle(); }}
                    disabled={isUpdating}
                >
                    {isUpdating ? '...' : isCompleted ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle2 size={16} /> Done
                        </div>
                    ) : 'Mark Complete'}
                </button>
            </div>
        </div>
    );
}
