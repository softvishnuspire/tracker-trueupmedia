"use client";

import React, { useState } from 'react';
import { X, User, Phone, Mail, FileText, Video, Send, Loader2, Check } from 'lucide-react';
import { phApi } from '@/lib/api';
import { formatISTForm, convertISTToUTC } from '@/lib/utils';

interface FreelancerTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function FreelancerTaskModal({ isOpen, onClose, onSuccess }: FreelancerTaskModalProps) {
    const getLocalISOString = () => {
        return formatISTForm(new Date(), 'yyyy-MM-dd') + 'T' + formatISTForm(new Date(), 'HH:mm');
    };

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [formData, setFormData] = useState({
        freelancer_name: '',
        freelancer_phone: '',
        freelancer_email: '',
        content_type: 'Post' as 'Post' | 'Reel',
        scheduled_datetime: getLocalISOString(),
        title: '',
        description: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (!formData.freelancer_name || !formData.freelancer_phone || !formData.freelancer_email || !formData.scheduled_datetime) {
            setErrorMsg('Please fill in all required fields (Name, Phone, Email, Date).');
            return;
        }

        setLoading(true);
        try {
            const [datePart, timePart] = formData.scheduled_datetime.split('T');
            const utcScheduledDatetime = convertISTToUTC(datePart, timePart);

            await phApi.addFreelancerContent({
                ...formData,
                scheduled_datetime: utcScheduledDatetime
            });
            
            setSuccessMsg('Freelancer task created successfully!');
            onSuccess();
            
            setTimeout(() => {
                onClose();
                setFormData({
                    freelancer_name: '',
                    freelancer_phone: '',
                    freelancer_email: '',
                    content_type: 'Post',
                    scheduled_datetime: getLocalISOString(),
                    title: '',
                    description: ''
                });
                setSuccessMsg('');
            }, 1500);
        } catch (err: any) {
            console.error('Error creating freelancer task:', err);
            setErrorMsg(err.response?.data?.error || 'Failed to create freelancer task. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
            <div className="modal-content" style={{ maxWidth: '500px', padding: 0, overflow: 'hidden' }}>
                <div className="modal-header" style={{ 
                    padding: '24px', 
                    background: 'linear-gradient(135deg, var(--accent) 0%, #4f46e5 100%)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Create Freelancer Task</h2>
                        <p style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>Add a one-time production task</p>
                    </div>
                    <button onClick={onClose} style={{ 
                        background: 'rgba(255, 255, 255, 0.2)', 
                        border: 'none', 
                        color: 'white', 
                        padding: '8px', 
                        borderRadius: '12px',
                        cursor: 'pointer'
                    }}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {errorMsg && (
                        <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '14px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            {errorMsg}
                        </div>
                    )}
                    {successMsg && (
                        <div style={{ padding: '12px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '8px', fontSize: '14px', border: '1px solid rgba(34, 197, 94, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Check size={16} />
                            {successMsg}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Freelancer Name */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                                Freelancer Name
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input 
                                    type="text" 
                                    value={formData.freelancer_name}
                                    onChange={e => setFormData({ ...formData, freelancer_name: e.target.value })}
                                    placeholder="Enter full name"
                                    style={{ 
                                        width: '100%', 
                                        padding: '12px 12px 12px 40px', 
                                        background: 'var(--bg-elevated)', 
                                        border: '1px solid var(--border)', 
                                        borderRadius: '12px',
                                        color: 'var(--text-primary)',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Contact Info Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                                    Phone Number
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input 
                                        type="tel" 
                                        value={formData.freelancer_phone}
                                        onChange={e => setFormData({ ...formData, freelancer_phone: e.target.value })}
                                        placeholder="Phone"
                                        style={{ 
                                            width: '100%', 
                                            padding: '10px 10px 10px 36px', 
                                            background: 'var(--bg-elevated)', 
                                            border: '1px solid var(--border)', 
                                            borderRadius: '10px',
                                            color: 'var(--text-primary)',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                                    Email Address
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input 
                                        type="email" 
                                        value={formData.freelancer_email}
                                        onChange={e => setFormData({ ...formData, freelancer_email: e.target.value })}
                                        placeholder="Email"
                                        style={{ 
                                            width: '100%', 
                                            padding: '10px 10px 10px 36px', 
                                            background: 'var(--bg-elevated)', 
                                            border: '1px solid var(--border)', 
                                            borderRadius: '10px',
                                            color: 'var(--text-primary)',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Content Type Selector */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                                Content Type
                            </label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button 
                                    type="button"
                                    onClick={() => setFormData({ ...formData, content_type: 'Post' })}
                                    style={{ 
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        border: `2px solid ${formData.content_type === 'Post' ? 'var(--accent)' : 'var(--border)'}`,
                                        background: formData.content_type === 'Post' ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-elevated)',
                                        color: formData.content_type === 'Post' ? 'var(--accent)' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <FileText size={18} />
                                    Post
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setFormData({ ...formData, content_type: 'Reel' })}
                                    style={{ 
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        border: `2px solid ${formData.content_type === 'Reel' ? '#c084fc' : 'var(--border)'}`,
                                        background: formData.content_type === 'Reel' ? 'rgba(192, 132, 252, 0.1)' : 'var(--bg-elevated)',
                                        color: formData.content_type === 'Reel' ? '#c084fc' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <Video size={18} />
                                    Reel
                                </button>
                            </div>
                        </div>

                        {/* Scheduled Date & Time */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                                Schedule For
                            </label>
                            <input 
                                type="datetime-local" 
                                value={formData.scheduled_datetime}
                                onChange={e => setFormData({ ...formData, scheduled_datetime: e.target.value })}
                                style={{ 
                                    width: '100%', 
                                    padding: '12px', 
                                    background: 'var(--bg-elevated)', 
                                    border: '1px solid var(--border)', 
                                    borderRadius: '12px',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        {/* Description (Optional) */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                                Task Description (Optional)
                            </label>
                            <textarea 
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Details about the shoot or post..."
                                style={{ 
                                    width: '100%', 
                                    padding: '12px', 
                                    background: 'var(--bg-elevated)', 
                                    border: '1px solid var(--border)', 
                                    borderRadius: '12px',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    minHeight: '80px',
                                    resize: 'vertical'
                                }}
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        style={{ 
                            width: '100%', 
                            marginTop: '24px',
                            padding: '14px', 
                            background: 'linear-gradient(135deg, var(--accent) 0%, #4f46e5 100%)',
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '14px',
                            fontSize: '16px',
                            fontWeight: 800,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                        {loading ? 'Creating Task...' : 'Create Task'}
                    </button>
                </form>
            </div>
        </div>
    );
}
