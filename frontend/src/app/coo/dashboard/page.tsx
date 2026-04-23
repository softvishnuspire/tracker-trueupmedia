'use client';

import React, { useState } from 'react';
import { 
    LayoutDashboard,
    LogOut,
    Activity,
    Users,
    TrendingUp
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import './coo.css';

export default function COODashboard() {
    const router = useRouter();
    const supabase = createClient();
    const [view, setView] = useState<'overview'>('overview');
    
    // Placeholder Data
    const stats = [
        { title: 'Total Active Clients', value: '24', icon: Users, color: 'var(--accent)' },
        { title: 'Content Output (Monthly)', value: '1,284', icon: Activity, color: 'var(--success)' },
        { title: 'Team Efficiency', value: '94%', icon: TrendingUp, color: 'var(--warning)' }
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="logo-container">
                    <img src="/logo.png" alt="TrueUp Media" className="logo-img" />
                    <span style={{ marginLeft: '4px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>COO</span>
                </div>

                <nav className="flex-1">
                    <p className="sidebar-label">Navigation</p>
                    <div 
                        onClick={() => setView('overview')}
                        className={`nav-item ${view === 'overview' ? 'active' : ''}`}
                    >
                        <LayoutDashboard size={20} />
                        <span>Executive Overview</span>
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <p className="sidebar-label" style={{ margin: 0 }}>Appearance</p>
                        <ThemeToggle style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
                    </div>
                    <div className="user-info-box">
                        <div className="user-avatar" style={{ background: 'var(--accent)', color: 'white' }}>CO</div>
                        <div>
                            <p className="user-name">Chief Operating Officer</p>
                            <p className="user-role">TrueUp Media</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="logout-btn">
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <header className="page-header">
                    <div>
                        <h1 className="page-title">Executive Dashboard</h1>
                        <p className="page-subtitle">High-level metrics and company performance</p>
                    </div>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
                    {stats.map((stat, idx) => {
                        const Icon = stat.icon;
                        return (
                            <div key={idx} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: '14px', color: stat.color }}>
                                    <Icon size={24} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{stat.title}</p>
                                    <h3 style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{stat.value}</h3>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="calendar-card" style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ background: 'var(--bg-elevated)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--text-muted)' }}>
                        <Activity size={32} />
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Detailed Analytics Pipeline</h3>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>Full analytics and performance tracking modules are currently under development.</p>
                </div>
            </main>
        </div>
    );
}
