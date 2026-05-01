'use client';

import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  CheckCircle2, 
  XCircle, 
  Mail, 
  Phone, 
  Calendar, 
  MoreVertical,
  ShieldCheck,
  Search,
  Filter,
  ArrowRight,
  Eye,
  Loader2
} from 'lucide-react';
import { adminApi, OnboardingRequest } from '@/lib/api';
import styles from './onboarding.module.css';

export default function OnboardingPage() {
    const [requests, setRequests] = useState<OnboardingRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED'>('PENDING');
    
    // Modal states
    const [showAcceptModal, setShowAcceptModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);
    const [password, setPassword] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const response = await adminApi.getOnboardingRequests();
            setRequests(response.data);
        } catch (error) {
            console.error('Error fetching onboarding requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!selectedRequest || !password) return;
        setProcessing(true);
        try {
            await adminApi.acceptOnboarding(selectedRequest.id, password);
            setShowAcceptModal(false);
            setPassword('');
            fetchRequests();
        } catch (error) {
            console.error('Error accepting onboarding:', error);
            alert('Failed to accept onboarding request. Please check if the email is already in use.');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm('Are you sure you want to reject this request?')) return;
        try {
            await adminApi.rejectOnboarding(id);
            fetchRequests();
        } catch (error) {
            console.error('Error rejecting onboarding:', error);
        }
    };

    const filteredRequests = requests.filter(req => {
        const matchesSearch = req.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             req.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'ALL' || (req.status || '').toUpperCase() === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const getStatusColor = (status: string) => {
        const s = (status || '').toUpperCase();
        switch (s) {
            case 'ACCEPTED': return styles.statusAccepted;
            case 'REJECTED': return styles.statusRejected;
            default: return styles.statusPending;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <div className={styles.iconBox}>
                        <UserPlus size={24} />
                    </div>
                    <div>
                        <h1>Client Onboarding</h1>
                        <p>Manage and approve incoming client registration requests</p>
                    </div>
                </div>
                
                <div className={styles.statsRow}>
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Pending</span>
                        <span className={styles.statValue}>{requests.filter(r => (r.status || '').toUpperCase() === 'PENDING').length}</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Approved</span>
                        <span className={styles.statValue}>{requests.filter(r => (r.status || '').toUpperCase() === 'ACCEPTED').length}</span>
                    </div>
                </div>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <Search size={18} className={styles.searchIcon} />
                    <input 
                        type="text" 
                        placeholder="Search by name or email..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className={styles.filters}>
                    <button 
                        className={`${styles.filterBtn} ${filterStatus === 'ALL' ? styles.activeFilter : ''}`}
                        onClick={() => setFilterStatus('ALL')}
                    >
                        All
                    </button>
                    <button 
                        className={`${styles.filterBtn} ${filterStatus === 'PENDING' ? styles.activeFilter : ''}`}
                        onClick={() => setFilterStatus('PENDING')}
                    >
                        Pending
                    </button>
                    <button 
                        className={`${styles.filterBtn} ${filterStatus === 'ACCEPTED' ? styles.activeFilter : ''}`}
                        onClick={() => setFilterStatus('ACCEPTED')}
                    >
                        Accepted
                    </button>
                    <button 
                        className={`${styles.filterBtn} ${filterStatus === 'REJECTED' ? styles.activeFilter : ''}`}
                        onClick={() => setFilterStatus('REJECTED')}
                    >
                        Rejected
                    </button>
                </div>
            </div>

            {loading ? (
                <div className={styles.loaderContainer}>
                    <Loader2 className={styles.spin} size={40} />
                    <p>Loading requests...</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {filteredRequests.length > 0 ? filteredRequests.map((req) => (
                        <div key={req.id} className={styles.requestCard}>
                            <div className={styles.cardHeader}>
                                <div className={styles.avatar}>
                                    {req.full_name.charAt(0)}
                                </div>
                                <div className={styles.nameSection}>
                                    <h3>{req.full_name}</h3>
                                    <span className={`${styles.statusBadge} ${getStatusColor(req.status)}`}>
                                        {req.status?.toUpperCase()}
                                    </span>
                                </div>
                                <button className={styles.optionsBtn}>
                                    <MoreVertical size={18} />
                                </button>
                            </div>

                            <div className={styles.cardBody}>
                                <div className={styles.infoItem}>
                                    <Mail size={16} />
                                    <span>{req.email}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <Phone size={16} />
                                    <span>{req.phone_number}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <Calendar size={16} />
                                    <span>{new Date(req.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            {(req.status || '').toUpperCase() === 'PENDING' && (
                                <div className={styles.cardFooter}>
                                    <button 
                                        className={styles.rejectBtn}
                                        onClick={() => handleReject(req.id)}
                                    >
                                        <XCircle size={18} />
                                        Reject
                                    </button>
                                    <button 
                                        className={styles.acceptBtn}
                                        onClick={() => {
                                            setSelectedRequest(req);
                                            setShowAcceptModal(true);
                                        }}
                                    >
                                        <CheckCircle2 size={18} />
                                        Approve
                                    </button>
                                </div>
                            )}
                        </div>
                    )) : (
                        <div className={styles.emptyState}>
                            <Search size={48} opacity={0.2} />
                            <p>No onboarding requests found</p>
                        </div>
                    )}
                </div>
            )}

            {showAcceptModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2>Approve Client</h2>
                            <button onClick={() => setShowAcceptModal(false)} className={styles.closeBtn}>
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.clientPreview}>
                                <p>You are about to approve <strong>{selectedRequest?.full_name}</strong> as a client.</p>
                                <p className={styles.emailHint}>{selectedRequest?.email}</p>
                            </div>
                            
                            <div className={styles.inputGroup}>
                                <label>Set Access Password</label>
                                <div className={styles.passwordWrapper}>
                                    <ShieldCheck size={20} className={styles.inputIcon} />
                                    <input 
                                        type="password" 
                                        placeholder="Enter password for the client..."
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <p className={styles.inputHint}>This password will be used by the client to login.</p>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button 
                                className={styles.cancelBtn} 
                                onClick={() => setShowAcceptModal(false)}
                                disabled={processing}
                            >
                                Cancel
                            </button>
                            <button 
                                className={styles.confirmBtn} 
                                onClick={handleAccept}
                                disabled={processing || !password}
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className={styles.spin} size={18} />
                                        Onboarding...
                                    </>
                                ) : (
                                    <>
                                        Complete Onboarding
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
