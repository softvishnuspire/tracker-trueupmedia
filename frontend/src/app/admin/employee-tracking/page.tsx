"use client";

import React, { useState, useEffect } from 'react';
import { 
    Activity, 
    Users, 
    CheckCircle2, 
    Circle, 
    RefreshCcw, 
    Search, 
    TrendingUp, 
    Target,
    UserCircle2,
    Calendar,
    MessageSquare,
    ChevronRight,
    Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminApi, TlTrackingStats, EmployeeTrackingStats } from '@/lib/api';
import '../admin.css';

const RadialProgress = ({ progress, size = 60, strokeWidth = 6, color = "var(--accent)" }: { progress: number, size?: number, strokeWidth?: number, color?: string }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress * circumference);

    return (
        <div className="radial-progress-container" style={{ position: 'relative', width: size, height: size }}>
            <svg width={size} height={size}>
                <circle
                    stroke="rgba(255,255,255,0.05)"
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

export default function EmployeeTrackingPage() {
    const [stats, setStats] = useState<{ teamLeads: TlTrackingStats[], employees: EmployeeTrackingStats[], date: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'tl' | 'employee'>('employee');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const fetchStats = async (date = selectedDate) => {
        setLoading(true);
        try {
            const res = await adminApi.getTrackingStats(date);
            setStats(res.data);
        } catch (err: any) {
            console.error('Error fetching tracking stats:', err);
            const detailMsg = err.response?.data?.details || err.response?.data?.error;
            if (detailMsg) {
                alert(`API Error: ${detailMsg}`);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats(selectedDate);
    }, [selectedDate]);

    const filteredTLs = stats?.teamLeads.filter(tl => 
        tl.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        tl.email.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const filteredEmployees = stats?.employees.filter(emp => 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        emp.email.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
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
                        <Calendar className="calendar-icon" size={18} />
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                    <div className="search-input-box">
                        <Search className="search-icon" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by name or email..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="refresh-btn" onClick={() => fetchStats()} disabled={loading}>
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            <div className="tracking-tabs">
                <button 
                    className={`tracking-tab-btn ${activeTab === 'tl' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tl')}
                >
                    <Users size={18} />
                    Team Leads
                </button>
                <button 
                    className={`tracking-tab-btn ${activeTab === 'employee' ? 'active' : ''}`}
                    onClick={() => setActiveTab('employee')}
                >
                    <Briefcase size={18} />
                    Employees
                </button>
            </div>

            {!loading && stats && (
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
                                {Math.round((stats.teamLeads.reduce((acc, tl) => acc + tl.progress, 0) / (stats.teamLeads.length || 1)) * 100)}%
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
                                {Math.round((stats.employees.reduce((acc, emp) => acc + emp.completionRate, 0) / (stats.employees.length || 1)) * 100)}%
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
                                {stats.teamLeads.reduce((acc, tl) => acc + tl.totalClients, 0)}
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
                                {stats.employees.reduce((acc, emp) => acc + emp.assignedTasks, 0)}
                            </span>
                        </div>
                        <div className="summary-trend">Items</div>
                    </motion.div>
                </div>
            )}

            <main className="tracking-content">
                <AnimatePresence mode="wait">
                    {loading ? (
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
                    ) : activeTab === 'tl' ? (
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
                                        <div className="user-avatar">
                                            <UserCircle2 size={32} />
                                        </div>
                                        <div className="user-meta">
                                            <h3>{tl.name}</h3>
                                            <p>{tl.email}</p>
                                        </div>
                                        <RadialProgress progress={tl.progress} color={tl.progress >= 1 ? "var(--success)" : "var(--accent)"} />
                                    </div>
                                    
                                    <div className="card-body">
                                        <div className="metric-row">
                                            <div className="metric-item">
                                                <span className="metric-label">Daily Ratio (POC)</span>
                                                <span className="metric-value">{tl.talkedToday} / {tl.totalClients}</span>
                                            </div>
                                            <div className="metric-status">
                                                {tl.talkedToday === tl.totalClients ? (
                                                    <span className="badge badge-success">Completed</span>
                                                ) : (
                                                    <span className="badge badge-warning">In Progress</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="metric-row" style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                                            <div className="metric-item">
                                                <span className="metric-label">Content Flow (Today)</span>
                                                <span className="metric-value">{tl.todayContentDone} / {tl.todayContentTotal}</span>
                                            </div>
                                            <div className="metric-status">
                                                <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)' }}>
                                                    {tl.todayContentTotal > 0 ? Math.round((tl.todayContentDone / tl.todayContentTotal) * 100) : 0}% Done
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="client-mini-list" style={{ marginTop: '16px' }}>
                                            <p className="section-label">Clients Status (Today)</p>
                                            {tl.assignedClients.map(client => (
                                                <div key={client.id} className="mini-client-item">
                                                    {client.talkedToday ? (
                                                        <CheckCircle2 className="text-success" size={14} />
                                                    ) : (
                                                        <Circle className="text-muted" size={14} />
                                                    )}
                                                    <span>{client.name}</span>
                                                </div>
                                            ))}
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
                                        <div className="user-avatar" style={{ color: 'var(--accent-secondary)' }}>
                                            <Briefcase size={32} />
                                        </div>
                                        <div className="user-meta">
                                            <h3>{emp.name}</h3>
                                            <p>{emp.role}</p>
                                        </div>
                                        <div className="completion-badge" style={{ 
                                            background: `rgba(${emp.completionRate >= 1 ? '16, 185, 129' : '99, 102, 241'}, 0.1)`,
                                            color: emp.completionRate >= 1 ? 'var(--success)' : 'var(--accent)',
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: 800
                                        }}>
                                            {Math.round(emp.completionRate * 100)}%
                                        </div>
                                    </div>

                                    <div className="card-body">
                                        <div className="task-stats">
                                            <div className="task-metric">
                                                <Target size={16} className="text-accent" />
                                                <div className="stat-col">
                                                    <span className="stat-label">Assigned</span>
                                                    <span className="stat-value">{emp.assignedTasks}</span>
                                                </div>
                                            </div>
                                            <div className="task-metric">
                                                <CheckCircle2 size={16} className="text-success" />
                                                <div className="stat-col">
                                                    <span className="stat-label">Completed</span>
                                                    <span className="stat-value">{emp.completedTasks}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="progress-bar-container">
                                            <div className="progress-bar-fill" style={{ width: `${emp.completionRate * 100}%` }}></div>
                                        </div>

                                        {emp.tasks && emp.tasks.length > 0 && (
                                            <div className="card-tasks-list" style={{ marginTop: '16px', fontSize: '12px' }}>
                                                <p className="section-label" style={{ marginBottom: '8px' }}>Task Details</p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {emp.tasks.map(task => {
                                                        const isDone = (task.employeeStatus || '').toUpperCase() === 'COMPLETED';
                                                        return (
                                                            <div key={task.id} style={{ 
                                                                display: 'flex', 
                                                                justifyContent: 'space-between', 
                                                                alignItems: 'center',
                                                                padding: '6px 8px',
                                                                background: 'rgba(255,255,255,0.03)',
                                                                borderRadius: '6px',
                                                                borderLeft: `2px solid ${isDone ? 'var(--success)' : 'var(--accent)'}`
                                                            }}>
                                                                <div style={{ flex: 1, marginRight: '8px', overflow: 'hidden' }}>
                                                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                        {task.title}
                                                                    </div>
                                                                    <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{task.clientName}</div>
                                                                </div>
                                                                <div style={{ 
                                                                    fontSize: '9px', 
                                                                    fontWeight: 800, 
                                                                    padding: '2px 6px', 
                                                                    borderRadius: '4px',
                                                                    background: isDone ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                                                                    color: isDone ? 'var(--success)' : 'var(--accent)',
                                                                    textTransform: 'uppercase'
                                                                }}>
                                                                    {isDone ? 'Done' : 'Pending'}
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

            <style jsx>{`
                .tracking-page-container {
                    padding-top: 10px;
                }

                .tracking-tabs {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 24px;
                    background: var(--bg-surface);
                    padding: 6px;
                    border-radius: 16px;
                    width: fit-content;
                    border: 1px solid var(--border);
                }

                .tracking-tab-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 20px;
                    border-radius: 12px;
                    border: none;
                    background: transparent;
                    color: var(--text-secondary);
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .tracking-tab-btn:hover {
                    color: var(--text-primary);
                    background: var(--bg-hover);
                }

                .tracking-tab-btn.active {
                    background: var(--bg-elevated);
                    color: var(--accent);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                    border: 1px solid var(--border-hover);
                }

                .tracking-card {
                    background: var(--bg-surface);
                    border-radius: 24px;
                    border: 1px solid var(--border);
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                    backdrop-filter: blur(10px);
                }

                .tracking-card:hover {
                    border-color: var(--accent);
                    transform: translateY(-4px);
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
                }

                .card-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    width: 100%;
                }

                .user-meta {
                    flex: 1;
                }

                .user-meta h3 {
                    font-size: 16px;
                    font-weight: 800;
                    color: var(--text-primary);
                    margin: 0;
                }

                .user-meta p {
                    font-size: 12px;
                    color: var(--text-muted);
                    margin: 2px 0 0;
                }

                .metric-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-bottom: 16px;
                }

                .metric-item {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .metric-label {
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: var(--text-muted);
                }

                .metric-value {
                    font-size: 20px;
                    font-weight: 800;
                    color: var(--text-primary);
                }

                .section-label {
                    font-size: 10px;
                    font-weight: 800;
                    text-transform: uppercase;
                    color: var(--text-muted);
                    margin-bottom: 10px;
                    letter-spacing: 0.05em;
                }

                .client-mini-list {
                    background: rgba(0, 0, 0, 0.1);
                    padding: 12px;
                    border-radius: 12px;
                    border: 1px solid var(--border);
                }

                .mini-client-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 0;
                    font-size: 13px;
                    color: var(--text-secondary);
                }

                .mini-client-item:not(:last-child) {
                    border-bottom: 1px solid var(--border);
                }

                .badge {
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 10px;
                    font-weight: 800;
                    text-transform: uppercase;
                }

                .badge-success { background: rgba(16, 185, 129, 0.1); color: var(--success); }
                .badge-warning { background: rgba(245, 158, 11, 0.1); color: var(--warning); }

                .task-stats {
                    display: flex;
                    gap: 24px;
                    margin-bottom: 16px;
                }

                .task-metric {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .stat-col {
                    display: flex;
                    flex-direction: column;
                }

                .stat-label {
                    font-size: 10px;
                    color: var(--text-muted);
                    font-weight: 700;
                }

                .stat-value {
                    font-size: 16px;
                    font-weight: 800;
                }

                .progress-bar-container {
                    height: 6px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                    overflow: hidden;
                    border: 1px solid var(--border);
                }

                .progress-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, var(--accent), var(--accent-secondary));
                    border-radius: 10px;
                    transition: width 1s ease-in-out;
                }

                .loading-placeholder {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 300px;
                    gap: 20px;
                    color: var(--text-muted);
                }

                .pulse-loader {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: var(--accent);
                    animation: pulse 1.5s infinite ease-in-out;
                }

                @keyframes pulse {
                    0% { transform: scale(0.8); opacity: 0.5; box-shadow: 0 0 0 0 var(--accent-glow); }
                    50% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 20px transparent; }
                    100% { transform: scale(0.8); opacity: 0.5; box-shadow: 0 0 0 0 transparent; }
                }

                .refresh-btn {
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    border: 1px solid var(--border);
                    background: var(--bg-surface);
                    color: var(--text-primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .refresh-btn:hover {
                    background: var(--bg-hover);
                    border-color: var(--accent);
                }

                .animate-spin {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .no-data {
                    grid-column: 1 / -1;
                    padding: 60px;
                    text-align: center;
                    background: var(--bg-surface);
                    border-radius: 24px;
                    border: 1px dashed var(--border);
                    color: var(--text-muted);
                }
            `}</style>
        </div>
    );
}
