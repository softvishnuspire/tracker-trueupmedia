"use client";

import React, { useEffect, useState } from 'react';
import { cooApi, TeamMember } from '@/lib/api';
import { Search, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function CooTeamManagement() {
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchTeam = async () => {
            try {
                const res = await cooApi.getTeam();
                setTeam(res.data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchTeam();
    }, []);

    const filteredTeam = team.filter((member) =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <header className="page-header">
                <div>
                    <h1 className="page-title">Team Management</h1>
                    <p className="page-subtitle">Monitor Team Leads and assignment identifiers</p>
                </div>
                <div className="btn-secondary" style={{ cursor: 'default' }}>
                    <Eye size={16} />
                    Read-only
                </div>
            </header>

            <div className="table-card">
                <div className="table-header">
                    <div className="search-input-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {error ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--danger)' }}>{error}</div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Joined Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && team.length === 0 ? (
                                <>
                                    {[1, 2, 3, 4].map((i) => (
                                        <tr key={i}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Skeleton className="h-8 w-8 rounded-full" />
                                                    <Skeleton className="h-4 w-24" />
                                                </div>
                                            </td>
                                            <td><Skeleton className="h-4 w-40" /></td>
                                            <td><Skeleton className="h-6 w-24 rounded-full" /></td>
                                            <td><Skeleton className="h-4 w-20" /></td>
                                        </tr>
                                    ))}
                                </>
                            ) : (
                                <>
                                    {filteredTeam.map((member, index) => (
                                        <tr key={member.user_id || member.id || index}>
                                            <td data-label="Name" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                                                        {member.name.charAt(0)}
                                                    </div>
                                                    <span>{member.name}</span>
                                                </div>
                                            </td>
                                            <td data-label="Email"><span>{member.email}</span></td>
                                            <td data-label="Role">
                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                    <span className="type-badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', minWidth: '100px', textAlign: 'center' }}>
                                                        TEAM LEAD
                                                    </span>
                                                    {member.role_identifier && (
                                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                            {member.role_identifier}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td data-label="Joined Date"><span>{member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}</span></td>
                                        </tr>
                                    ))}
                                    {filteredTeam.length === 0 && (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                No team members found.
                                            </td>
                                        </tr>
                                    )}
                                </>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
