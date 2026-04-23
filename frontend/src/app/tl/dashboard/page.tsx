'use client';

import React, { useState } from 'react';
import { 
    LayoutDashboard,
    Globe, 
    LogOut,
    Calendar as CalendarIcon,
    FileText,
    Video,
    Clock,
    CheckCircle2
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import './tl.css';

export default function TLDashboard() {
    const router = useRouter();
    const supabase = createClient();
    const [view, setView] = useState<'assigned' | 'workflow'>('assigned');
    
    // Placeholder Data
    const clients = [
        { id: '1', company_name: 'Acme Corp' },
        { id: '2', company_name: 'TechFlow' }
    ];

    const contentItems = [
        { id: '1', title: 'Summer Campaign', type: 'Post', status: 'DESIGNING IN PROGRESS', time: '10:00 AM' },
        { id: '2', title: 'Product Launch', type: 'Reel', status: 'SHOOT DONE', time: '02:00 PM' }
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
                    <span style={{ marginLeft: '4px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>TL</span>
                </div>

                <nav className="flex-1">
                    <p className="sidebar-label">Navigation</p>
                    <div 
                        onClick={() => setView('assigned')}
                        className={`nav-item ${view === 'assigned' ? 'active' : ''}`}
                    >
                        <LayoutDashboard size={20} />
                        <span>Assigned Content</span>
                    </div>
                    <div 
                        onClick={() => setView('workflow')}
                        className={`nav-item ${view === 'workflow' ? 'active' : ''}`}
                    >
                        <Globe size={20} />
                        <span>Workflow Status</span>
                    </div>

                    <p className="sidebar-label">My Clients</p>
                    <div className="client-list">
                        {clients.map(c => (
                            <div key={c.id} className="client-item">
                                <div className="client-avatar">
                                    {c.company_name.charAt(0)}
                                </div>
                                <span>{c.company_name}</span>
                            </div>
                        ))}
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <p className="sidebar-label" style={{ margin: 0 }}>Appearance</p>
                        <ThemeToggle style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
                    </div>
                    <div className="user-info-box">
                        <div className="user-avatar" style={{ background: 'var(--accent)', color: 'white' }}>TL</div>
                        <div>
                            <p className="user-name">Team Lead</p>
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
                        <h1 className="page-title">
                            {view === 'assigned' ? 'Assigned Content' : 'Workflow Status'}
                        </h1>
                        <p className="page-subtitle">
                            {view === 'assigned' ? 'Manage your upcoming content deliveries' : 'Track and advance content states'}
                        </p>
                    </div>
                </header>

                <div className="calendar-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                        {contentItems.map(item => (
                            <div key={item.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div>
                                        <span className={`type-badge ${item.type.toLowerCase()}`} style={{ marginBottom: '8px', display: 'inline-block' }}>{item.type}</span>
                                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{item.title}</h3>
                                    </div>
                                    <div style={{ background: 'var(--bg-surface)', padding: '8px', borderRadius: '10px' }}>
                                        {item.type === 'Post' ? <FileText size={18} style={{ color: 'var(--accent)' }}/> : <Video size={18} style={{ color: 'var(--accent)' }}/>}
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        <Clock size={14} /> {item.time}
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                                    <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '4px' }}>Current Status</p>
                                    <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{item.status}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
