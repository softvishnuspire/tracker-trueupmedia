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
    LayoutDashboard,
    Loader2
} from 'lucide-react';
import { employeeApi } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/ToastProvider';
import { usePageLoading } from '@/components/ui/TopProgressBar';
import './employee.css';

interface Task {
    id: string;
    title: string;
    description: string;
    content_type: string;
    scheduled_datetime: string;
    assigned_at?: string;
    status: string;
    clients: { company_name: string } | null;
}

export default function EmployeeDashboard() {
    const { error: toastError } = useToast();
    const { startLoading, stopLoading } = usePageLoading();
    
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardTasks = async (isSilent = false) => {
        if (!isSilent && tasks.length === 0) {
            setLoading(true);
        }
        try {
            const res = await employeeApi.getTasks();
            setTasks(res.data || []);
        } catch (err) {
            console.error('Error fetching dashboard tasks:', err);
            toastError('Failed to refresh task list.');
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            startLoading();
            await fetchDashboardTasks();
            stopLoading();
        };
        loadData();
    }, []);

    const todayTasks = tasks.filter(t => isToday(parseISO(t.assigned_at || t.scheduled_datetime || '')));
    const previousTasks = tasks.filter(t => isBefore(parseISO(t.assigned_at || t.scheduled_datetime || ''), startOfToday()));

    if (loading && tasks.length === 0) {
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
                <h1 className="welcome-title">Daily Task Management</h1>
                <p className="welcome-subtitle">
                    {format(new Date(), 'EEEE, MMMM do')} • You have {todayTasks.length} assignments today.
                </p>
            </header>

            {/* Today's Assignments */}
            <section className="task-section">
                <div className="section-header">
                    <h2 className="section-title" style={{ color: 'var(--primary)' }}>
                        <Calendar size={20} />
                        Today's Assignments
                    </h2>
                    <span className="task-count-badge">{todayTasks.length}</span>
                </div>

                {todayTasks.length === 0 ? (
                    <div className="empty-tasks">
                        <div className="empty-icon-box"><CheckCircle2 size={32} /></div>
                        <h3>No Tasks for Today</h3>
                        <p>Enjoy your day! Check back later for new assignments.</p>
                    </div>
                ) : (
                    <div className="task-grid">
                        {todayTasks.map(task => (
                            <TaskCard key={task.id} task={task} />
                        ))}
                    </div>
                )}
            </section>

            {/* Previous Tasks */}
            {previousTasks.length > 0 && (
                <section className="task-section">
                    <div className="section-header">
                        <h2 className="section-title" style={{ color: 'var(--accent)' }}>
                            <HistoryIcon size={20} />
                            Previous Assignments
                        </h2>
                        <span className="task-count-badge" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                            {previousTasks.length}
                        </span>
                    </div>
                    <div className="task-grid">
                        {previousTasks.map(task => (
                            <TaskCard key={task.id} task={task} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function TaskCard({ task }: { task: Task }) {
    const statusUpper = (task.status || '').toUpperCase();
    const isApproved = ['APPROVED', 'WAITING FOR POSTING', 'POSTED'].includes(statusUpper);
    
    // Determine badge styling and label based on status
    let statusLabel = task.status || 'Pending';
    let badgeClass = 'status-pending';
    
    if (isApproved) {
        statusLabel = 'Approved';
        badgeClass = 'status-approved';
    } else if (statusUpper === 'PENDING' || statusUpper === 'CONTENT NOT STARTED') {
        statusLabel = 'Not Started';
        badgeClass = 'status-not-started';
    } else if (statusUpper === 'WAITING FOR APPROVAL' || statusUpper === 'WAITING FOR FINAL APPROVAL') {
        statusLabel = 'Waiting Approval';
        badgeClass = 'status-waiting';
    }

    return (
        <div className={`task-card ${isApproved ? 'completed' : ''}`}>
            <div className="task-card-header">
                <span className="task-client-badge">{task.clients?.company_name || 'Freelancer Task'}</span>
                <div className="task-type-badge">
                    {task.content_type === 'Reel' || task.content_type === 'YouTube' ? <Video size={14} /> : <FileText size={14} />}
                    {(task.content_type === 'Special Poster' || task.content_type === 'Special Day Poster' ? '🎉 ' : '') + task.content_type}
                </div>
            </div>

            <h3 className="task-title">{task.title}</h3>
            <p className="task-description">{task.description || 'No additional instructions provided for this task.'}</p>

            <div className="task-footer">
                <div className="task-time" title={`Schedule Date: ${format(parseISO(task.scheduled_datetime), 'MMM do, h:mm a')}`}>
                    <Calendar size={14} />
                    Due: {format(parseISO(task.scheduled_datetime), 'MMM do')}
                </div>
                <div className={`status-badge-premium ${badgeClass}`}>
                    {isApproved ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                    <span>{statusLabel}</span>
                </div>
            </div>
        </div>
    );
}


