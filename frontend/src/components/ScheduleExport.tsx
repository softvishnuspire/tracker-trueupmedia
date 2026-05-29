import React from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, startOfWeek, endOfWeek, addMonths } from 'date-fns';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ContentItem {
    id: string;
    title: string;
    description: string;
    content_type: 'Post' | 'Reel' | 'YouTube' | 'Special Poster' | 'Special Day Poster';
    scheduled_datetime: string;
    status: string;
    client_id: string;
    clients?: { company_name: string };
}

interface ScheduleExportProps {
    data: ContentItem[];
    clientName: string;
    month: Date;
    batchType?: '1-1' | '15-15';
    clientLogo?: string; // Base64 or URL
    summaryOnly?: boolean;
}

const ScheduleExport: React.FC<ScheduleExportProps> = ({ data, clientName, month, batchType = '1-1', clientLogo, summaryOnly }) => {
    const exportRef = React.useRef<HTMLDivElement>(null);

    const handleDownload = async () => {
        if (!exportRef.current) return;

        const element = exportRef.current;
        element.style.display = 'block';

        try {
            const canvas = await html2canvas(element, {
                scale: 3, // Increased scale for high-definition clarity
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                allowTaint: true,
                imageTimeout: 0
            } as any);
            const imgData = canvas.toDataURL('image/png', 1.0);

            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4',
                compress: false // Disable overall PDF compression for clarity
            });

            pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'NONE');
            pdf.save(filename);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            element.style.display = 'none';
        }
    };

    // Period Calculation
    const isBiMonthly = batchType === '15-15';
    const periodStart = isBiMonthly
        ? new Date(month.getFullYear(), month.getMonth(), 15, 0, 0, 0, 0)
        : startOfMonth(month);
    const nextMonth = addMonths(month, 1);
    const periodEnd = isBiMonthly
        ? new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15, 23, 59, 59, 999)
        : endOfMonth(month);

    const periodLabel = isBiMonthly
        ? `${format(periodStart, 'd MMM')} \u2013 ${format(periodEnd, 'd MMM yyyy')}`
        : format(month, 'MMMM yyyy');

    const filename = isBiMonthly
        ? `${clientName}_Schedule_${format(periodStart, 'dd_MMM')}_to_${format(periodEnd, 'dd_MMM_yyyy')}.pdf`
        : `${clientName}_Schedule_${format(month, 'MMM_yyyy')}.pdf`;

    // Prepare Weekly Data
    const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    const getWeekIndex = (date: Date) => {
        const d = getDay(date);
        return d === 0 ? 6 : d - 1;
    };

    const weeklyStats = daysOfWeek.map((day, idx) => {
        const items = data.filter(item => {
            const itemDate = parseISO(item.scheduled_datetime);
            return getWeekIndex(itemDate) === idx && itemDate >= periodStart && itemDate <= periodEnd;
        });
        const posters = items.filter(item => item.content_type === 'Post');
        const reels = items.filter(item => item.content_type === 'Reel');
        const youtube = items.filter(item => item.content_type === 'YouTube');

        return {
            day,
            posterCount: posters.length,
            reelCount: reels.length,
            youtubeCount: youtube.length
        };
    });

    // Prepare Grid
    const gridStart = startOfWeek(periodStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(periodEnd, { weekStartsOn: 1 });
    const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

    const totalWeeks = gridDays.length / 7;
    // Compact, balanced cell height for a neat and professional grid layout
    const cellMinHeight = totalWeeks > 5 ? '88px' : '108px';

    return (
        <>
            <button
                onClick={handleDownload}
                className="export-btn"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    width: '45px',
                    height: '45px',
                    flexShrink: 0
                }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
            </button>

            {/* Premium Export Template */}
            <div
                ref={exportRef}
                style={{
                    display: 'none',
                    position: 'absolute',
                    left: '-9999px',
                    top: '-9999px',
                    width: '1000px',
                    height: '1414px',
                    padding: '60px 70px',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontFamily: "'Inter', 'Helvetica', sans-serif",
                    boxSizing: 'border-box'
                }}
            >
                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                        <h1 style={{ fontSize: '36px', fontWeight: 800, margin: 0, color: '#0f172a', lineHeight: '1.1', letterSpacing: '-0.02em' }}>{clientName.toUpperCase()}</h1>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', margin: '6px 0 0 0', letterSpacing: '0.08em' }}>CONTENT STRATEGY & EDITORIAL CALENDAR</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <img src="/logo.png" alt="TrueUp Media" style={{ height: '55px', objectFit: 'contain' }} />
                    </div>
                </div>

                <div style={{ width: '100%', height: '3px', background: 'linear-gradient(90deg, #4f46e5 0%, #06b6d4 100%)', marginBottom: '24px', borderRadius: '2px' }}></div>

                {/* Summary Info Bar */}
                <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '16px 30px', display: 'flex', justifyContent: 'space-between', marginBottom: '30px', border: '1px solid #e2e8f0' }}>
                    <div>
                        <p style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', margin: 0, marginBottom: '4px', letterSpacing: '0.05em' }}>PERIOD</p>
                        <p style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b', margin: 0 }}>{periodLabel.toUpperCase()}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', margin: 0, marginBottom: '4px', letterSpacing: '0.05em' }}>SCHEDULE TYPE</p>
                        <p style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b', margin: 0 }}>{batchType === '15-15' ? '15/15 BATCHING' : 'MONTHLY EXECUTION'}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', margin: 0, marginBottom: '4px', letterSpacing: '0.05em' }}>TOTAL CONTENT</p>
                        <p style={{ fontSize: '16px', fontWeight: 800, color: '#4f46e5', margin: 0 }}>
                            {data.filter(item => {
                                const d = parseISO(item.scheduled_datetime);
                                return d >= periodStart && d <= periodEnd;
                            }).length} ITEMS
                        </p>
                    </div>
                </div>

                {/* Monthly Calendar View */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                        <div style={{ width: '4px', height: '18px', background: '#4f46e5', borderRadius: '3px' }}></div>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '0.03em' }}>EDITORIAL SCHEDULE</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)' }}>
                        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                            <div key={day} style={{ padding: '12px 10px', fontSize: '10px', fontWeight: 700, color: '#64748b', textAlign: 'center', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', letterSpacing: '0.05em' }}>
                                {day}
                            </div>
                        ))}
                        {gridDays.map((day, idx) => {
                            const isInPeriod = day >= periodStart && day <= periodEnd;
                            const dayItems = isInPeriod
                                ? data.filter(item => isSameDay(parseISO(item.scheduled_datetime), day))
                                : [];

                            return (
                                <div key={idx} style={{
                                    minHeight: cellMinHeight,
                                    padding: '10px',
                                    borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid #e2e8f0',
                                    borderBottom: '1px solid #e2e8f0',
                                    background: isInPeriod ? '#fff' : '#f8fafc',
                                    position: 'relative'
                                }}>
                                    <div style={{
                                        fontSize: '12px',
                                        fontWeight: 800,
                                        color: isInPeriod ? '#1e293b' : '#cbd5e1',
                                        marginBottom: '6px'
                                    }}>
                                        {format(day, 'd')}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {summaryOnly ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                {(() => {
                                                    const postCount = dayItems.filter(i => i.content_type === 'Post').length;
                                                    const reelCount = dayItems.filter(i => i.content_type === 'Reel').length;
                                                    const youtubeCount = dayItems.filter(i => i.content_type === 'YouTube').length;

                                                    return (
                                                        <>
                                                            {reelCount > 0 && (
                                                                <div style={{
                                                                    fontSize: '9px', fontWeight: 800, padding: '3px 6px', borderRadius: '6px',
                                                                    background: '#ecfeff', color: '#0891b2', textAlign: 'center', border: '1px solid #cffafe'
                                                                }}>
                                                                    {reelCount} REEL{reelCount > 1 ? 'S' : ''}
                                                                </div>
                                                            )}
                                                            {postCount > 0 && (
                                                                <div style={{
                                                                    fontSize: '9px', fontWeight: 800, padding: '3px 6px', borderRadius: '6px',
                                                                    background: '#e0e7ff', color: '#4338ca', textAlign: 'center', border: '1px solid #c7d2fe'
                                                                }}>
                                                                    {postCount} POST{postCount > 1 ? 'S' : ''}
                                                                </div>
                                                            )}
                                                            {youtubeCount > 0 && (
                                                                <div style={{
                                                                    fontSize: '9px', fontWeight: 800, padding: '3px 6px', borderRadius: '6px',
                                                                    background: '#fef2f2', color: '#dc2626', textAlign: 'center', border: '1px solid #fee2e2'
                                                                }}>
                                                                    {youtubeCount} YT
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            dayItems.map((item, i) => {
                                                let typeBg = '#4f46e5'; // default Post (Indigo)
                                                if (item.content_type === 'Reel') {
                                                    typeBg = '#0891b2'; // Cyan
                                                } else if (item.content_type === 'YouTube') {
                                                    typeBg = '#dc2626'; // Red
                                                } else if (item.content_type === 'Special Day Poster' || item.content_type === 'Special Poster') {
                                                    typeBg = '#d97706'; // Amber
                                                }

                                                return (
                                                    <div key={i} style={{
                                                        padding: '6px 10px',
                                                        background: typeBg,
                                                        color: '#ffffff',
                                                        borderRadius: '6px',
                                                        fontSize: '10px',
                                                        fontWeight: 800,
                                                        textAlign: 'left',
                                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        letterSpacing: '0.02em',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '5px'
                                                    }}>
                                                        <span style={{ fontSize: '7px', opacity: 0.85 }}>●</span>
                                                        <span style={{ textTransform: 'uppercase' }}>{item.content_type}</span>
                                                        {item.title && (
                                                            <span style={{ 
                                                                fontWeight: 600, 
                                                                opacity: 0.95, 
                                                                marginLeft: '4px',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                - {item.title}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Section */}
                <div style={{
                    position: 'absolute',
                    bottom: '50px',
                    left: '70px',
                    right: '70px',
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '30px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', margin: 0 }}>© {new Date().getFullYear()} TRUEUP MEDIA SOLUTIONS</p>
                    <p style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', margin: 0, letterSpacing: '0.05em' }}>PRECISION IN DIGITAL MARKETING</p>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', margin: 0 }}>TRUEUPMEDIA.COM</p>
                </div>
            </div>
        </>
    );
};

export default ScheduleExport;

