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
    ChevronDown,
    Briefcase,
    Trophy,
    Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminApi, TlTrackingStats, EmployeeTrackingStats } from '@/lib/api';
import { downloadAllEmployeesReport, downloadEmployeeReport } from '@/utils/pdfExport';
import '../admin.css';

const RadialProgress = ({ progress, size = 60, strokeWidth = 6, color = "var(--accent)" }: { progress: number, size?: number, strokeWidth?: number, color?: string }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress * circumference);

    return (
        <div className="radial-progress-container" style={{ position: 'relative', width: size, height: size }}>
            <svg width={size} height={size}>
                <circle
                    stroke="var(--border)"
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
    const [expandedEmpClients, setExpandedEmpClients] = useState<Record<string, boolean>>({});

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
                    {activeTab === 'employee' && stats && stats.employees.length > 0 && (
                        <button 
                            className="refresh-btn" 
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'auto', padding: '0 16px', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                            onClick={() => downloadAllEmployeesReport(filteredEmployees, selectedDate)}
                            title="Download All Employees Report"
                        >
                            <Download size={18} />
                            <span style={{ fontSize: '13px', fontWeight: 700 }}>Export PDF</span>
                        </button>
                    )}
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
                                        <div className="user-info-group">
                                            <div className="user-avatar-small" style={{ color: 'var(--accent-secondary)' }}>
                                                <Users size={20} />
                                            </div>
                                            <div className="user-meta">
                                                <h3>{tl.name}</h3>
                                                <p>Team Lead</p>
                                            </div>
                                        </div>
                                        <div className="radial-group">
                                            <RadialProgress 
                                                progress={tl.progress} 
                                                size={48} 
                                                color={tl.progress >= 1 ? "var(--success)" : "var(--accent-secondary)"} 
                                            />
                                        </div>
                                    </div>

                                    <div className="card-body">
                                        <div className="stats-2x2-grid">
                                            <div className="metric-box poc">
                                                <div className="box-header">
                                                    <MessageSquare size={12} style={{ color: 'var(--accent-secondary)' }} />
                                                    <span>POC COMMS</span>
                                                </div>
                                                <div className="box-content">
                                                    <div className="val-pair">
                                                        <span className="pair-main">{tl.talkedToday}</span>
                                                        <span className="pair-sub">/ {tl.totalClients}</span>
                                                    </div>
                                                    <div className="mini-progress">
                                                        <div className="bar"><div className="fill" style={{ width: `${tl.progress * 100}%`, background: 'var(--accent-secondary)' }}></div></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="metric-box content">
                                                <div className="box-header">
                                                    <TrendingUp size={12} className="text-success" />
                                                    <span>CONTENT FLOW</span>
                                                </div>
                                                <div className="box-content">
                                                    <div className="val-pair">
                                                        <span className="pair-main">{tl.todayContentDone}</span>
                                                        <span className="pair-sub">/ {tl.todayContentTotal}</span>
                                                    </div>
                                                    <div className="mini-progress">
                                                        <div className="bar"><div className="fill" style={{ width: `${tl.todayContentTotal > 0 ? (tl.todayContentDone / tl.todayContentTotal) * 100 : 0}%`, background: 'var(--success)' }}></div></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="compact-task-list" style={{ marginTop: '12px' }}>
                                            <div className="list-header">
                                                <Circle size={10} />
                                                <span>CLIENTS STATUS (TODAY)</span>
                                            </div>
                                            <div className="tasks-container scrollable-list">
                                                {tl.assignedClients.map(client => (
                                                    <div key={client.id} className="mini-task-item">
                                                        <span className={`status-dot ${client.talkedToday ? 'done' : 'pending'}`}></span>
                                                        <div className="task-info">
                                                            <span className="task-name">{client.name}</span>
                                                            <span className="task-client">{client.talkedToday ? 'Talked' : 'Not Contacted'}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
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
                                        <div className="user-info-group">
                                            <div className="user-avatar-small">
                                                <Briefcase size={20} />
                                            </div>
                                            <div className="user-meta">
                                                <h3>{emp.name}</h3>
                                                <p>{emp.role}</p>
                                            </div>
                                        </div>
                                        <div className="radial-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button 
                                                onClick={() => downloadEmployeeReport(emp, selectedDate)}
                                                title="Download Employee Report"
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    padding: '6px',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
                                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                            >
                                                <Download size={16} />
                                            </button>
                                            <RadialProgress 
                                                progress={emp.completionRate} 
                                                size={48} 
                                                color={emp.completionRate >= 1 ? "var(--success)" : "var(--accent)"} 
                                            />
                                        </div>
                                    </div>

                                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div className="stats-2x2-grid" style={{ marginBottom: 0 }}>
                                            <div className="metric-box daily">
                                                <div className="box-header">
                                                    <Target size={12} className="text-accent" />
                                                    <span>DAILY</span>
                                                </div>
                                                <div className="box-content">
                                                    <div className="val-pair">
                                                        <span className="pair-main">{emp.completedTasks}</span>
                                                        <span className="pair-sub">/ {emp.assignedTasks}</span>
                                                    </div>
                                                    <div className="mini-progress">
                                                        <div className="bar"><div className="fill" style={{ width: `${emp.completionRate * 100}%` }}></div></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="metric-box monthly">
                                                <div className="box-header">
                                                    <Trophy size={12} style={{ color: '#fbbf24' }} />
                                                    <span>MONTHLY</span>
                                                </div>
                                                <div className="box-content">
                                                    <div className="val-pair">
                                                        <span className="pair-main">{emp.monthlyCompleted}</span>
                                                        <span className="pair-sub">/ {emp.monthlyTotal}</span>
                                                    </div>
                                                    <div className="mini-progress">
                                                        <div className="bar"><div className="fill monthly" style={{ width: `${emp.monthlyRate * 100}%` }}></div></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Active Workload Section */}
                                        <div className="compact-task-list" style={{ marginBottom: 0 }}>
                                            <button 
                                                className="list-header" 
                                                style={{ 
                                                    background: 'none', 
                                                    border: 'none', 
                                                    width: '100%', 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    alignItems: 'center', 
                                                    cursor: 'pointer',
                                                    padding: 0,
                                                    textAlign: 'left'
                                                }}
                                                onClick={() => setExpandedEmpClients(prev => ({ ...prev, [`${emp.id}-active`]: !prev[`${emp.id}-active`] }))}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Activity size={10} style={{ color: 'var(--accent)' }} />
                                                    <span>ACTIVE WORKLOAD ({(emp.activeWorkload || []).length})</span>
                                                </div>
                                                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                                                    {expandedEmpClients[`${emp.id}-active`] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                </div>
                                            </button>
                                            
                                            {expandedEmpClients[`${emp.id}-active`] && (
                                                <div className="tasks-container scrollable-list" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {(emp.activeWorkload || []).length > 0 ? (
                                                        (emp.activeWorkload || []).map(task => (
                                                            <TrackingTaskItem key={task.id} task={task} />
                                                        ))
                                                    ) : (
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '4px' }}>No active tasks</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Recently Completed Tasks Section */}
                                        <div className="compact-task-list" style={{ marginTop: 0 }}>
                                            <button 
                                                className="list-header" 
                                                style={{ 
                                                    background: 'none', 
                                                    border: 'none', 
                                                    width: '100%', 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    alignItems: 'center', 
                                                    cursor: 'pointer',
                                                    padding: 0,
                                                    textAlign: 'left'
                                                }}
                                                onClick={() => setExpandedEmpClients(prev => ({ ...prev, [`${emp.id}-completed`]: !prev[`${emp.id}-completed`] }))}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <CheckCircle2 size={10} style={{ color: 'var(--success)' }} />
                                                    <span>RECENTLY COMPLETED ({(emp.recentlyCompleted || []).length})</span>
                                                </div>
                                                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                                                    {expandedEmpClients[`${emp.id}-completed`] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                </div>
                                            </button>
                                            
                                            {expandedEmpClients[`${emp.id}-completed`] && (
                                                <div className="tasks-container scrollable-list" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {(emp.recentlyCompleted || []).length > 0 ? (
                                                        (emp.recentlyCompleted || []).map(task => (
                                                            <TrackingTaskItem key={task.id} task={task} isCompleted={true} />
                                                        ))
                                                    ) : (
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '4px' }}>No completed tasks recently</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
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
                    border-radius: 20px;
                    border: 1px solid var(--border);
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                }

                .tracking-card:hover {
                    border-color: var(--accent);
                    transform: translateY(-4px);
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
                }

                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .card-body {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    flex: 1;
                }

                .user-info-group {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .user-avatar-small {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    background: var(--bg-elevated);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--accent);
                    border: 1px solid var(--border);
                }

                .user-meta h3 {
                    font-size: 15px;
                    font-weight: 800;
                    margin: 0;
                    color: var(--text-primary);
                }

                .user-meta p {
                    font-size: 11px;
                    color: var(--text-muted);
                    margin: 0;
                }

                .stats-2x2-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin-bottom: 8px;
                }

                .metric-box {
                    padding: 12px;
                    border-radius: 14px;
                    background: var(--bg-elevated);
                    border: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .box-header {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 9px;
                    font-weight: 800;
                    color: var(--text-muted);
                    letter-spacing: 0.05em;
                }

                .val-pair {
                    display: flex;
                    align-items: baseline;
                    gap: 4px;
                }

                .pair-main {
                    font-size: 18px;
                    font-weight: 900;
                    color: var(--text-primary);
                }

                .pair-sub {
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--text-muted);
                }

                .mini-progress {
                    width: 100%;
                }

                .mini-progress .bar {
                    height: 4px;
                    background: var(--border);
                    border-radius: 10px;
                    overflow: hidden;
                }

                .mini-progress .fill {
                    height: 100%;
                    background: var(--accent);
                    border-radius: 10px;
                }

                .mini-progress .fill.monthly {
                    background: var(--accent-secondary);
                }

                .compact-task-list {
                    background: var(--bg-elevated);
                    border-radius: 14px;
                    padding: 12px;
                    border: 1px solid var(--border);
                    margin-top: auto;
                    display: flex;
                    flex-direction: column;
                }

                .list-header {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    font-weight: 800;
                    color: var(--text-secondary);
                    margin-bottom: 10px;
                    letter-spacing: 0.05em;
                }

                .tasks-container {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .scrollable-list {
                    max-height: 200px;
                    overflow-y: auto;
                    padding-right: 4px;
                }

                .scrollable-list::-webkit-scrollbar {
                    width: 3px;
                }

                .scrollable-list::-webkit-scrollbar-track {
                    background: transparent;
                }

                .scrollable-list::-webkit-scrollbar-thumb {
                    background: var(--border);
                    border-radius: 10px;
                }

                .mini-task-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                }

                .status-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    margin-top: 5px;
                    flex-shrink: 0;
                }

                .status-dot.done { background: var(--success); box-shadow: 0 0 8px var(--success); }
                .status-dot.pending { background: var(--warning); }

                .task-info {
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .task-name {
                    font-size: 13px;
                    font-weight: 800;
                    color: var(--text-primary);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .task-client {
                    font-size: 11px;
                    color: var(--text-secondary);
                }

                .more-tasks-indicator {
                    font-size: 10px;
                    font-weight: 700;
                    color: var(--accent);
                    margin-top: 4px;
                    text-align: center;
                }

                .loading-placeholder {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                    gap: 20px;
                }

                @keyframes pulse {
                    0% { transform: scale(0.9); opacity: 0.5; }
                    50% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(0.9); opacity: 0.5; }
                }

                .refresh-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    border: 1px solid var(--border);
                    background: var(--bg-surface);
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

                .no-data {
                    grid-column: 1 / -1;
                    padding: 80px 20px;
                    text-align: center;
                    background: var(--bg-surface);
                    border-radius: 20px;
                    border: 1px dashed var(--border);
                    color: var(--text-muted);
                }

            `}</style>
        </div>
    );
}

function TrackingTaskItem({ task, isCompleted = false }: { task: any, isCompleted?: boolean }) {
    const [showComments, setShowComments] = useState(false);
    
    // Determine priority
    let priorityLabel = 'Normal';
    let priorityClass = 'priority-normal';
    if (task.isEmergency) {
        priorityLabel = 'Emergency';
        priorityClass = 'priority-emergency';
    } else if (task.isRescheduled) {
        priorityLabel = 'Rescheduled';
        priorityClass = 'priority-rescheduled';
    }

    // Determine status badge class
    let badgeClass = 'status-pending';
    const statusUpper = (task.status || '').toUpperCase();
    if (isCompleted) {
        badgeClass = 'status-approved';
    } else if (statusUpper === 'PENDING' || statusUpper === 'CONTENT NOT STARTED') {
        badgeClass = 'status-not-started';
    } else if (statusUpper === 'WAITING FOR APPROVAL' || statusUpper === 'WAITING FOR FINAL APPROVAL') {
        badgeClass = 'status-waiting';
    }

    const formatShortDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        } catch {
            return 'N/A';
        }
    };

    const formatFullDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    return (
        <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: 'var(--accent)',
                    background: 'var(--accent-glow)',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    textTransform: 'uppercase'
                }}>{task.clientName}</span>
                <span style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    background: task.isEmergency ? 'rgba(239, 68, 68, 0.15)' : task.isRescheduled ? 'rgba(139, 92, 246, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                    color: task.isEmergency ? '#ef4444' : task.isRescheduled ? '#8b5cf6' : 'var(--text-muted)'
                }}>{priorityLabel}</span>
            </div>

            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{task.title}</div>
            {task.description && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {task.description}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '4px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={10} />
                    Due: {task.scheduledDate ? formatShortDate(task.scheduledDate) : 'N/A'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`status-badge-premium ${badgeClass}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                        {isCompleted ? 'Completed' : task.status}
                    </span>
                    {(task.comments || []).length > 0 && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowComments(!showComments);
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                                padding: '2px',
                                fontSize: '10px',
                                fontWeight: 700
                            }}
                        >
                            <MessageSquare size={10} />
                            <span>{(task.comments || []).length}</span>
                        </button>
                    )}
                </div>
            </div>

            {showComments && (task.comments || []).length > 0 && (
                <div style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px',
                    marginTop: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                }}>
                    <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>STATUS HISTORY / COMMENTS</div>
                    {(task.comments || []).map((comment: any, idx: number) => (
                        <div key={idx} style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', borderLeft: '2px solid var(--accent)', paddingLeft: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                <span>{comment.changedBy}</span>
                                <span>{comment.changedAt ? formatFullDate(comment.changedAt) : ''}</span>
                            </div>
                            <div style={{ color: 'var(--text-primary)', marginTop: '2px' }}>
                                {comment.note || `Transitioned to status: ${comment.status}`}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

