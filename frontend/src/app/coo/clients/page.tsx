"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { cooApi } from '@/lib/api';
import { Search, Calendar as CalendarIcon, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Client {
    id: string;
    company_name: string;
    phone?: string;
    email?: string;
    address?: string;
    is_active?: boolean;
    posts_per_month?: number;
    reels_per_month?: number;
    created_at: string;
}

export default function CooClientManagement() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const res = await cooApi.getClients();
                setClients(res.data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchClients();
    }, []);

    const filteredClients = clients.filter((client) =>
        client.company_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <header className="page-header">
                <div>
                    <h1 className="page-title">Client Management</h1>
                    <p className="page-subtitle">Monitor TrueUp Media client companies</p>
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
                            placeholder="Search clients by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {error ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--danger)' }}>{error}</div>
                ) : (
                    <div className="table-responsive">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Company Name</th>
                                    <th>Contact</th>
                                    <th>Email</th>
                                    <th>Address</th>
                                    <th>Posts/mo</th>
                                    <th>Reels/mo</th>
                                    <th>Date Added</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <>
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <tr key={i}>
                                                <td><Skeleton className="h-4 w-32" /></td>
                                                <td><Skeleton className="h-4 w-24" /></td>
                                                <td><Skeleton className="h-4 w-40" /></td>
                                                <td><Skeleton className="h-4 w-48" /></td>
                                                <td><Skeleton className="h-4 w-12" /></td>
                                                <td><Skeleton className="h-4 w-12" /></td>
                                                <td><Skeleton className="h-4 w-20" /></td>
                                                <td style={{ textAlign: 'right' }}><Skeleton className="h-8 w-10 ml-auto" /></td>
                                            </tr>
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        {filteredClients.map((client, index) => (
                                            <tr key={client.id || index}>
                                                <td data-label="Company Name" style={{ fontWeight: 700, color: 'var(--text-primary)' }}><span>{client.company_name}</span></td>
                                                <td data-label="Contact"><span>{client.phone || '-'}</span></td>
                                                <td data-label="Email"><span>{client.email || '-'}</span></td>
                                                <td data-label="Address" style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><span>{client.address || '-'}</span></td>
                                                <td data-label="Posts/mo"><span>{client.posts_per_month || '0'}</span></td>
                                                <td data-label="Reels/mo"><span>{client.reels_per_month || '0'}</span></td>
                                                <td data-label="Date Added"><span>{new Date(client.created_at).toLocaleDateString()}</span></td>
                                                <td data-label="Actions" style={{ textAlign: 'right' }}>
                                                    <div className="action-btns" style={{ justifyContent: 'flex-end' }}>
                                                        <Link href={`/coo/client-calendar/${client.id}`} className="btn-icon" title="View calendar">
                                                            <CalendarIcon size={14} />
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredClients.length === 0 && (
                                            <tr>
                                                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                    No clients found matching your search.
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
