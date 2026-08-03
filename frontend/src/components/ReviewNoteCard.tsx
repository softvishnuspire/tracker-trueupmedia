'use client';

import React, { useState } from 'react';
import { MessageSquare, Clock, User, ChevronDown, ChevronUp } from 'lucide-react';
import { formatIST } from '@/lib/utils';

interface ReviewNoteCardProps {
    history?: any[];
    className?: string;
    style?: React.CSSProperties;
}

export default function ReviewNoteCard({ history, className = '', style }: ReviewNoteCardProps) {
    const [showAllNotes, setShowAllNotes] = useState(false);

    const safeHistory = Array.isArray(history) ? history : [];
    const notes = safeHistory.filter((h: any) => h.note && typeof h.note === 'string' && h.note.trim() !== '');

    if (notes.length === 0) {
        return (
            <div 
                className={`review-note-card-container ${className}`}
                style={{
                    background: 'rgba(99, 102, 241, 0.04)',
                    border: '1px dashed rgba(99, 102, 241, 0.25)',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    marginBottom: '20px',
                    ...style
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '6px', 
                        background: 'rgba(99, 102, 241, 0.12)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'var(--accent, #6366f1)' 
                    }}>
                        <MessageSquare size={14} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent, #6366f1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Review Note
                    </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)', fontStyle: 'italic', marginTop: '8px' }}>
                    No review note added for this task yet.
                </div>
            </div>
        );
    }

    const latestNote = notes[0];
    const previousNotes = notes.slice(1);

    const getAuthorDisplay = (noteItem: any) => {
        const name = noteItem.users?.name || noteItem.author_name || noteItem.changed_by_name || noteItem.user_name || 'Reviewer';
        const role = noteItem.users?.role_identifier || noteItem.users?.role || noteItem.author_role || noteItem.user_role;
        return role ? `${name} (${role})` : name;
    };

    return (
        <div 
            className={`review-note-card-container ${className}`}
            style={{
                background: 'rgba(99, 102, 241, 0.06)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '20px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                ...style
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '6px', 
                        background: 'rgba(99, 102, 241, 0.15)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'var(--accent, #6366f1)' 
                    }}>
                        <MessageSquare size={14} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent, #6366f1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Review Note
                    </span>
                    <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        background: 'var(--bg-elevated, rgba(255,255,255,0.05))', 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        color: 'var(--text-secondary, #94a3b8)',
                        border: '1px solid var(--border, rgba(255,255,255,0.1))'
                    }}>
                        {getAuthorDisplay(latestNote)}
                    </span>
                </div>
                {latestNote.changed_at && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                        <Clock size={12} />
                        <span>{`${formatIST(latestNote.changed_at, 'MMM d, yyyy')} ${formatIST(latestNote.changed_at, 'h:mm a')}`}</span>
                    </div>
                )}
            </div>

            {/* Note Text */}
            <div style={{
                background: 'var(--bg-surface, rgba(15, 23, 42, 0.6))',
                borderLeft: '4px solid var(--accent, #6366f1)',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '13px',
                color: 'var(--text-primary, #f8fafc)',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
            }}>
                &quot;{latestNote.note.trim()}&quot;
            </div>

            {/* Status change tag if available */}
            {latestNote.new_status && (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                    <span>Attached during step:</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: '4px' }}>
                        {latestNote.new_status}
                    </span>
                </div>
            )}

            {/* Previous Notes Section (if > 1 note exists) */}
            {previousNotes.length > 0 && (
                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border, rgba(255,255,255,0.1))', paddingTop: '10px' }}>
                    <button
                        type="button"
                        onClick={() => setShowAllNotes(!showAllNotes)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--accent, #6366f1)',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 0'
                        }}
                    >
                        <span>{showAllNotes ? 'Hide previous notes' : `Show ${previousNotes.length} previous note${previousNotes.length > 1 ? 's' : ''}`}</span>
                        {showAllNotes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showAllNotes && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                            {previousNotes.map((prev, idx) => (
                                <div 
                                    key={prev.log_id || prev.id || `prev-note-${idx}`}
                                    style={{
                                        background: 'var(--bg-elevated, rgba(255,255,255,0.03))',
                                        borderRadius: '8px',
                                        padding: '10px 12px',
                                        border: '1px solid var(--border, rgba(255,255,255,0.08))'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '11px' }}>
                                        <span style={{ fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>
                                            {getAuthorDisplay(prev)}
                                        </span>
                                        {prev.changed_at && (
                                            <span style={{ color: 'var(--text-muted, #64748b)' }}>
                                                {`${formatIST(prev.changed_at, 'MMM d, yyyy')} ${formatIST(prev.changed_at, 'h:mm a')}`}
                                            </span>
                                        )}
                                    </div>
                                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-primary, #e2e8f0)', fontStyle: 'italic', lineHeight: 1.4 }}>
                                        &quot;{prev.note.trim()}&quot;
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
