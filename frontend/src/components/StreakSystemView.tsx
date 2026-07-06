"use client";

import React, { useState, useEffect } from 'react';
import { 
    Flame, 
    Trophy, 
    Calendar, 
    Search, 
    Users, 
    Briefcase,
    Award,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Sparkles
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';
import { usePageLoading } from '@/components/ui/TopProgressBar';

interface StreakUser {
    id: string;
    name: string;
    email: string;
    role: string;
    streakCount: number;
    streakDays: string[];
    assignedClients?: string[];
}

export default function StreakSystemView() {
    const { error: toastError } = useToast();
    const { startLoading, stopLoading } = usePageLoading();

    const getCurrentMonthStr = () => {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit'
        });
        return formatter.format(now).substring(0, 7); // YYYY-MM
    };

    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
    const [activeTab, setActiveTab] = useState<'employee' | 'tl'>('employee');
    const [searchQuery, setSearchQuery] = useState('');
    const [data, setData] = useState<{ teamLeads: StreakUser[], employees: StreakUser[] } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStreaks = async (month = selectedMonth) => {
        setLoading(true);
        startLoading();
        try {
            const res = await adminApi.getStreaks(month);
            setData(res.data);
        } catch (err: any) {
            console.error('Error fetching streaks:', err);
            toastError('Failed to fetch monthly streak records. Please verify user_streaks table exists.');
        } finally {
            setLoading(false);
            stopLoading();
        }
    };

    useEffect(() => {
        fetchStreaks(selectedMonth);
    }, [selectedMonth]);

    const handleMonthChange = (offset: number) => {
        const [year, mon] = selectedMonth.split('-').map(Number);
        const date = new Date(year, mon - 1 + offset, 1);
        const nextMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        setSelectedMonth(nextMonthStr);
    };

    // Calculate days in the selected month
    const getDaysInMonth = (monthStr: string) => {
        const [year, mon] = monthStr.split('-').map(Number);
        const lastDay = new Date(year, mon, 0).getDate();
        const days = [];
        for (let i = 1; i <= lastDay; i++) {
            days.push(String(i).padStart(2, '0'));
        }
        return days;
    };

    const daysArray = getDaysInMonth(selectedMonth);

    const filteredEmployees = data?.employees.filter(emp => 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
        emp.role.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const filteredTLs = data?.teamLeads.filter(tl => 
        tl.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        tl.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
        tl.role.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const getMonthLabel = (monthStr: string) => {
        try {
            const [year, mon] = monthStr.split('-').map(Number);
            const date = new Date(year, mon - 1, 1);
            return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } catch (e) {
            return monthStr;
        }
    };

    return (
        <div className="streaks-view-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <header className="page-header" style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 className="page-title" style={{ fontSize: '28px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                        <Trophy className="text-accent" size={28} style={{ color: 'var(--accent)' }} />
                        Monthly Streaks & Consistency
                    </h1>
                    <p className="page-subtitle" style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '14px' }}>
                        Gamified performance tracking and reward systems
                    </p>
                </div>

                <div className="header-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Month Picker controls */}
                    <div className="month-selector-box" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)', padding: '4px' }}>
                        <button className="icon-btn" onClick={() => handleMonthChange(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px' }}>
                            <ChevronLeft size={18} />
                        </button>
                        <span style={{ padding: '0 12px', fontSize: '14px', fontWeight: 700, minWidth: '130px', textAlign: 'center' }}>
                            {getMonthLabel(selectedMonth)}
                        </span>
                        <button className="icon-btn" onClick={() => handleMonthChange(1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px' }}>
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <div className="search-input-box" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)', padding: '6px 12px', minWidth: '220px' }}>
                        <Search size={18} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
                        <input 
                            type="text" 
                            placeholder="Search team member..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', width: '100%' }}
                        />
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="tracking-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '24px', gap: '24px' }}>
                <button 
                    className={`tracking-tab-btn ${activeTab === 'employee' ? 'active' : ''}`}
                    onClick={() => setActiveTab('employee')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 4px',
                        border: 'none',
                        background: 'transparent',
                        color: activeTab === 'employee' ? 'var(--accent)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'employee' ? '2px solid var(--accent)' : '2px solid transparent',
                        fontWeight: 700,
                        fontSize: '15px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <Briefcase size={18} />
                    Employees Streaks
                </button>
                <button 
                    className={`tracking-tab-btn ${activeTab === 'tl' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tl')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 4px',
                        border: 'none',
                        background: 'transparent',
                        color: activeTab === 'tl' ? 'var(--accent)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'tl' ? '2px solid var(--accent)' : '2px solid transparent',
                        fontWeight: 700,
                        fontSize: '15px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <Users size={18} />
                    Team Leads Streaks
                </button>
            </div>

            {loading && !data ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '100px 0' }}>
                    <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent)' }} />
                </div>
            ) : (
                <div className="streak-cards-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                    {activeTab === 'employee' ? (
                        filteredEmployees.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-elevated)', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                <Flame size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                                <h3>No employees found</h3>
                                <p style={{ color: 'var(--text-muted)' }}>No data matched your search query or no employees are registered.</p>
                            </div>
                        ) : (
                            filteredEmployees.map(emp => (
                                <StreakCard key={emp.id} user={emp} days={daysArray} month={selectedMonth} type="employee" />
                            ))
                        )
                    ) : (
                        filteredTLs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-elevated)', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                <Flame size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                                <h3>No team leads found</h3>
                                <p style={{ color: 'var(--text-muted)' }}>No data matched your search query or no team leads are registered.</p>
                            </div>
                        ) : (
                            filteredTLs.map(tl => (
                                <StreakCard key={tl.id} user={tl} days={daysArray} month={selectedMonth} type="tl" />
                            ))
                        )
                    )}
                </div>
            )}
        </div>
    );
}

function StreakCard({ user, days, month, type }: { user: StreakUser, days: string[], month: string, type: 'employee' | 'tl' }) {
    // Check if user is on a high streak
    const hasGreatStreak = user.streakCount >= 10;
    const hasPerfectStreak = user.streakCount >= 20;

    return (
        <div className="premium-streak-card" style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            flexWrap: 'wrap',
            transition: 'transform 0.2s, border-color 0.2s',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Left Accent indicator */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: '4px',
                background: user.streakCount > 0 ? 'linear-gradient(to bottom, #f97316, #ef4444)' : 'var(--border)'
            }} />

            {/* Profile & Streak Overview */}
            <div className="card-profile-section" style={{ flex: '1 1 300px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div className="avatar-box" style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '16px',
                    background: user.streakCount > 0 ? 'rgba(249, 115, 22, 0.1)' : 'var(--bg-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: user.streakCount > 0 ? '#f97316' : 'var(--text-muted)',
                    border: '1px solid ' + (user.streakCount > 0 ? 'rgba(249, 115, 22, 0.2)' : 'var(--border)'),
                    position: 'relative'
                }}>
                    {type === 'tl' ? <Users size={28} /> : <Briefcase size={28} />}
                    {user.streakCount > 0 && (
                        <div style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-6px',
                            background: '#f97316',
                            color: 'white',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 800
                        }}>
                            🔥
                        </div>
                    )}
                </div>

                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {user.name}
                        {hasPerfectStreak && <Sparkles size={16} style={{ color: 'var(--accent)' }} title="Outstanding Performer" />}
                        {hasGreatStreak && !hasPerfectStreak && <Award size={16} style={{ color: '#eab308' }} title="Gold Standard" />}
                    </h3>
                    <p style={{ margin: '4px 0', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {user.role} • {user.email}
                    </p>
                    {type === 'tl' && user.assignedClients && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                            Clients: {user.assignedClients.length > 0 ? user.assignedClients.join(', ') : 'None assigned'}
                        </p>
                    )}
                </div>
            </div>

            {/* Visual Calendar Heatmap Grid */}
            <div className="card-calendar-grid" style={{ flex: '2 1 450px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                    Consistency Calendar ({user.streakCount} Streaks)
                </p>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {days.map(d => {
                        const dateKey = `${month}-${d}`;
                        const isStreak = user.streakDays.includes(dateKey);
                        return (
                            <div 
                                key={d} 
                                title={`${getMonthLabel(month)} ${d}: ${isStreak ? 'Streak Earned 🔥' : 'No Streak'}`}
                                style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    background: isStreak 
                                        ? 'linear-gradient(135deg, #f97316, #ef4444)' 
                                        : 'var(--bg-elevated)',
                                    color: isStreak ? 'white' : 'var(--text-muted)',
                                    border: '1px solid ' + (isStreak ? 'transparent' : 'var(--border)'),
                                    boxShadow: isStreak ? '0 2px 6px rgba(239, 68, 68, 0.4)' : 'none',
                                    transition: 'transform 0.1s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1.0)'; }}
                            >
                                {parseInt(d)}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Streak Number Block */}
            <div className="card-streak-count" style={{
                flex: '0 0 120px',
                textAlign: 'center',
                background: user.streakCount > 0 ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-elevated)',
                border: '1px dashed ' + (user.streakCount > 0 ? '#ef4444' : 'var(--border)'),
                borderRadius: '16px',
                padding: '12px'
            }}>
                <span style={{ fontSize: '32px', fontWeight: 900, display: 'block', color: user.streakCount > 0 ? '#ef4444' : 'var(--text-muted)', lineHeight: 1 }}>
                    {user.streakCount}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '4px', display: 'block' }}>
                    Streaks
                </span>
            </div>
        </div>
    );
}

function getMonthLabel(monthStr: string) {
    try {
        const [year, mon] = monthStr.split('-').map(Number);
        const date = new Date(year, mon - 1, 1);
        return date.toLocaleDateString('en-US', { month: 'short' });
    } catch (e) {
        return monthStr;
    }
}
