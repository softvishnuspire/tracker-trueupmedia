'use client';

import React, { useState, useEffect } from 'react';
import { 
    format, 
    isToday, 
    isBefore, 
    startOfToday, 
    parseISO 
} from 'date-fns';
import { 
    CheckCircle2, 
    Clock, 
    Video, 
    FileText, 
    Calendar,
    History as HistoryIcon,
    Loader2,
    X,
    RotateCcw
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
    status: string;
    assigned_at?: string;
    clients?: { company_name: string } | null;
    employee_task_status?: 'PENDING' | 'COMPLETED';
    is_emergency?: boolean;
    is_rescheduled?: boolean;
    is_freelancer_task?: boolean;
}

const STATUS_FLOWS: Record<string, string[]> = {
    'Reel': [
        'PENDING',
        'CONTENT NOT STARTED',
        'CONTENT READY',
        'WAITING FOR APPROVAL',
        'CONTENT APPROVED',
        'SHOOT DONE',
        'EDITING IN PROGRESS',
        'EDITED',
        'WAITING FOR FINAL APPROVAL',
        'APPROVED',
        'WAITING FOR POSTING',
        'POSTED'
    ],
    'YouTube': [
        'PENDING',
        'CONTENT NOT STARTED',
        'CONTENT READY',
        'WAITING FOR APPROVAL',
        'CONTENT APPROVED',
        'SHOOT DONE',
        'EDITING IN PROGRESS',
        'EDITED',
        'WAITING FOR FINAL APPROVAL',
        'APPROVED',
        'WAITING FOR POSTING',
        'POSTED'
    ],
    'Post': [
        'PENDING',
        'CONTENT NOT STARTED',
        'CONTENT READY',
        'WAITING FOR APPROVAL',
        'CONTENT APPROVED',
        'DESIGNING IN PROGRESS',
        'DESIGNING COMPLETED',
        'WAITING FOR FINAL APPROVAL',
        'APPROVED',
        'WAITING FOR POSTING',
        'POSTED'
    ],
    'Special Poster': [
        'PENDING',
        'CONTENT NOT STARTED',
        'CONTENT READY',
        'WAITING FOR APPROVAL',
        'CONTENT APPROVED',
        'DESIGNING IN PROGRESS',
        'DESIGNING COMPLETED',
        'WAITING FOR FINAL APPROVAL',
        'APPROVED',
        'WAITING FOR POSTING',
        'POSTED'
    ],
    'Special Day Poster': [
        'PENDING',
        'CONTENT NOT STARTED',
        'CONTENT READY',
        'WAITING FOR APPROVAL',
        'CONTENT APPROVED',
        'DESIGNING IN PROGRESS',
        'DESIGNING COMPLETED',
        'WAITING FOR FINAL APPROVAL',
        'APPROVED',
        'WAITING FOR POSTING',
        'POSTED'
    ]
};

export default function EmployeeDashboard() {
    const { error: toastError, success: toastSuccess } = useToast();
    const { startLoading, stopLoading } = usePageLoading();
    
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

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

    const activeTasks = tasks.filter(t => (t.employee_task_status || '').toUpperCase() !== 'COMPLETED');
    const completedTasks = tasks.filter(t => (t.employee_task_status || '').toUpperCase() === 'COMPLETED');

    const todayTasks = activeTasks.filter(t => isToday(parseISO(t.assigned_at || t.scheduled_datetime || '')));
    const previousTasks = activeTasks.filter(t => isBefore(parseISO(t.assigned_at || t.scheduled_datetime || ''), startOfToday()));

    const handleOpenProgressModal = (task: Task) => {
        setSelectedTask(task);
        setIsModalOpen(true);
    };

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
            <header className="welcome-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="welcome-title">Daily Task Management</h1>
                    <p className="welcome-subtitle">
                        {format(new Date(), 'EEEE, MMMM do')} • You have {todayTasks.length} pending assignments today.
                    </p>
                </div>
                <button 
                    onClick={() => fetchDashboardTasks(true)} 
                    style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        padding: '10px 16px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 700
                    }}
                >
                    <RotateCcw size={16} />
                    Refresh
                </button>
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
                            <TaskCard key={task.id} task={task} onUpdateClick={handleOpenProgressModal} />
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
                            Overdue / Previous Assignments
                        </h2>
                        <span className="task-count-badge" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                            {previousTasks.length}
                        </span>
                    </div>
                    <div className="task-grid">
                        {previousTasks.map(task => (
                            <TaskCard key={task.id} task={task} onUpdateClick={handleOpenProgressModal} />
                        ))}
                    </div>
                </section>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
                <section className="task-section" style={{ marginTop: '48px', opacity: 0.8 }}>
                    <div className="section-header" style={{ borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                        <h2 className="section-title" style={{ color: 'var(--success)' }}>
                            <CheckCircle2 size={20} />
                            Recently Completed Tasks
                        </h2>
                        <span className="task-count-badge" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
                            {completedTasks.length}
                        </span>
                    </div>
                    <div className="task-grid">
                        {completedTasks.map(task => (
                            <TaskCard key={task.id} task={task} onUpdateClick={handleOpenProgressModal} />
                        ))}
                    </div>
                </section>
            )}

            {isModalOpen && selectedTask && (
                <ProgressUpdateModal 
                    task={selectedTask} 
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedTask(null);
                    }}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        setSelectedTask(null);
                        fetchDashboardTasks(true);
                        toastSuccess('Task progress logged successfully!');
                    }}
                />
            )}
        </div>
    );
}

interface TaskCardProps {
    task: Task;
    onUpdateClick: (task: Task) => void;
}

function TaskCard({ task, onUpdateClick }: TaskCardProps) {
    const isCompleted = (task.employee_task_status || '').toUpperCase() === 'COMPLETED';
    
    // Determine priority
    let priorityLabel = 'Normal';
    let priorityClass = 'priority-normal';
    if (task.is_emergency) {
        priorityLabel = 'Emergency';
        priorityClass = 'priority-emergency';
    } else if (task.is_rescheduled) {
        priorityLabel = 'Rescheduled';
        priorityClass = 'priority-rescheduled';
    }

    // Determine status badge label
    let statusLabel = task.status || 'Pending';
    let badgeClass = 'status-pending';
    const statusUpper = statusLabel.toUpperCase();

    if (isCompleted) {
        statusLabel = 'Completed';
        badgeClass = 'status-approved';
    } else if (statusUpper === 'PENDING' || statusUpper === 'CONTENT NOT STARTED') {
        statusLabel = 'Not Started';
        badgeClass = 'status-not-started';
    } else if (statusUpper === 'WAITING FOR APPROVAL' || statusUpper === 'WAITING FOR FINAL APPROVAL') {
        statusLabel = 'Waiting Approval';
        badgeClass = 'status-waiting';
    } else {
        statusLabel = task.status;
        badgeClass = 'status-pending';
    }

    return (
        <div className={`task-card ${isCompleted ? 'completed' : ''}`} style={{ display: 'flex', flexDirection: 'column', minHeight: '240px' }}>
            <div className="task-card-header">
                <span className="task-client-badge" style={{ fontSize: '12px', fontWeight: 800 }}>
                    {task.clients?.company_name || 'Freelancer Task'}
                </span>
                <div className="task-type-badge" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className={`priority-badge ${priorityClass}`} style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        background: task.is_emergency ? 'rgba(239, 68, 68, 0.15)' : task.is_rescheduled ? 'rgba(139, 92, 246, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                        color: task.is_emergency ? '#ef4444' : task.is_rescheduled ? '#8b5cf6' : 'var(--text-muted)'
                    }}>
                        {priorityLabel}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {task.content_type === 'Reel' || task.content_type === 'YouTube' ? <Video size={14} /> : <FileText size={14} />}
                        {task.content_type}
                    </div>
                </div>
            </div>

            <h3 className="task-title" style={{ marginTop: '8px' }}>{task.title}</h3>
            <p className="task-description" style={{ flexGrow: 1 }}>{task.description || 'No additional instructions provided for this task.'}</p>

            <div className="task-footer">
                <div className="task-time" title={`Schedule Date: ${format(parseISO(task.scheduled_datetime), 'MMM do, h:mm a')}`}>
                    <Calendar size={14} />
                    Due: {format(parseISO(task.scheduled_datetime), 'MMM do')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className={`status-badge-premium ${badgeClass}`}>
                        {isCompleted ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                        <span>{statusLabel}</span>
                    </div>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onUpdateClick(task);
                        }}
                        style={{
                            background: isCompleted ? 'transparent' : 'var(--accent)',
                            color: isCompleted ? 'var(--text-secondary)' : 'white',
                            border: isCompleted ? '1px solid var(--border)' : 'none',
                            padding: '6px 14px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 700
                        }}
                    >
                        {isCompleted ? 'Edit' : 'Log Progress'}
                    </button>
                </div>
            </div>
        </div>
    );
}

interface ModalProps {
    task: Task;
    onClose: () => void;
    onSuccess: () => void;
}

function ProgressUpdateModal({ task, onClose, onSuccess }: ModalProps) {
    const [submitting, setSubmitting] = useState(false);
    const [isCompleted, setIsCompleted] = useState((task.employee_task_status || '').toUpperCase() === 'COMPLETED');
    const [selectedGeneralStatus, setSelectedGeneralStatus] = useState(task.status);
    const [progressNote, setProgressNote] = useState('');

    const availableStatuses = STATUS_FLOWS[task.content_type] || ['PENDING', 'COMPLETED'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const employeeStatus = isCompleted ? 'COMPLETED' : 'PENDING';
            await employeeApi.updateTaskStatus(task.id, employeeStatus, selectedGeneralStatus, progressNote);
            onSuccess();
        } catch (err: any) {
            console.error('Error logging task progress:', err);
            alert(err.response?.data?.error || 'Failed to log task progress.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '20px'
        }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                background: 'var(--bg-surface)',
                borderRadius: '24px',
                padding: '28px',
                width: '100%',
                maxWidth: '520px',
                border: '1px solid var(--border)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
                animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                <div className="modal-header" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <div>
                        <h3 className="modal-title" style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Log Task Progress</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                            {task.clients?.company_name || 'Freelancer Task'} • {task.content_type}
                        </p>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{
                        background: 'var(--bg-elevated)',
                        padding: '16px',
                        borderRadius: '16px',
                        border: '1px solid var(--border)'
                    }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Task Title</span>
                        <p style={{ margin: '4px 0 0 0', fontWeight: 700, fontSize: '15px' }}>{task.title}</p>
                    </div>

                    {!task.is_freelancer_task && (
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Task Production Status</label>
                            <select 
                                value={selectedGeneralStatus}
                                onChange={(e) => setSelectedGeneralStatus(e.target.value)}
                                style={{
                                    background: 'var(--bg-elevated)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-primary)',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '14px',
                                    width: '100%'
                                }}
                            >
                                {availableStatuses.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                Choose where this task stands in the design/editing workflow.
                            </span>
                        </div>
                    )}

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: 'var(--bg-elevated)',
                        padding: '16px',
                        borderRadius: '16px',
                        border: '1px solid var(--border)'
                    }}>
                        <input 
                            type="checkbox"
                            id="complete-checkbox"
                            checked={isCompleted}
                            onChange={(e) => setIsCompleted(e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--success)' }}
                        />
                        <label htmlFor="complete-checkbox" style={{ fontSize: '14px', fontWeight: 700, cursor: 'pointer', color: 'var(--text-primary)' }}>
                            Mark My Portion of Work as Completed
                        </label>
                    </div>

                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Progress Update / Note (Optional)</label>
                        <textarea 
                            value={progressNote}
                            onChange={(e) => setProgressNote(e.target.value)}
                            placeholder="Write a brief note on what you did, next steps, or blockers..."
                            style={{
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-primary)',
                                padding: '12px',
                                borderRadius: '12px',
                                minHeight: '100px',
                                outline: 'none',
                                resize: 'vertical',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                    <div className="modal-footer" style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px',
                        marginTop: '10px'
                    }}>
                        <button type="button" onClick={onClose} style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            padding: '10px 20px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '14px'
                        }}>Cancel</button>
                        <button type="submit" disabled={submitting} style={{
                            background: 'var(--accent)',
                            color: 'white',
                            border: 'none',
                            padding: '10px 24px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            {submitting && <Loader2 size={16} className="animate-spin" />}
                            Save Update
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
