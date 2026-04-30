import React from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, getDay, isSameDay, addMonths, startOfWeek, endOfWeek } from 'date-fns';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ContentItem {
    id: string;
    title: string;
    description: string;
    content_type: 'Post' | 'Reel' | 'YouTube';
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
}

const ScheduleExport: React.FC<ScheduleExportProps> = ({ data, clientName, month, batchType = '1-1', clientLogo }) => {
    const exportRef = React.useRef<HTMLDivElement>(null);

    const handleDownload = async () => {
        if (!exportRef.current) return;

        const element = exportRef.current;
        element.style.display = 'block';

        try {
            const canvas = await html2canvas(element, {
                scale: 2, // Scale 2 is usually enough for A4 and keeps file size reasonable
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: 1000,
                height: 1414 // A4 Aspect Ratio (1000 * 297/210)
            } as any);
            const imgData = canvas.toDataURL('image/png', 1.0);

            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4'
            });

            pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
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
        ? new Date(month.getFullYear(), month.getMonth(), 15)
        : startOfMonth(month);
    const periodEnd = isBiMonthly
        ? new Date(addMonths(month, 1).getFullYear(), addMonths(month, 1).getMonth(), 15)
        : endOfMonth(month);

    const periodLabel = isBiMonthly
        ? `${format(periodStart, 'MMMM yyyy')} (Mid-Cycle)`
        : format(month, 'MMMM yyyy');

    const filename = isBiMonthly
        ? `${clientName}_Schedule_15${format(periodStart, 'MMM')}_to_15${format(periodEnd, 'MMM')}_${format(periodEnd, 'yyyy')}.pdf`
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
                    height: '45px'
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
                    padding: '80px',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontFamily: "'Inter', 'Helvetica', sans-serif",
                    boxSizing: 'border-box'
                }}
            >
                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                        <h1 style={{ fontSize: '38px', fontWeight: 900, margin: 0, color: '#0f172a', lineHeight: '1.1' }}>{clientName.toUpperCase()}</h1>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#64748b', margin: '4px 0 0 0', letterSpacing: '0.05em' }}>CONTENT STRATEGY & POSTING SCHEDULE</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <img src="/logo.png" alt="TrueUp Media" style={{ height: '60px', objectFit: 'contain' }} />
                        <p style={{ fontSize: '10px', fontWeight: 800, color: '#6366f1', margin: '4px 0 0 0' }}>BY TRUEUP MEDIA</p>
                    </div>
                </div>

                <div style={{ width: '100%', height: '3px', background: 'linear-gradient(to right, #6366f1, #3b82f6, #94a3b8)', marginBottom: '25px', borderRadius: '2px' }}></div>

                {/* Summary Info Bar */}
                <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', marginBottom: '30px', border: '1px solid #e2e8f0' }}>
                    <div>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', margin: 0, marginBottom: '4px' }}>PERIOD</p>
                        <p style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{periodLabel.toUpperCase()}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', margin: 0, marginBottom: '4px' }}>SCHEDULE TYPE</p>
                        <p style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{isBiMonthly ? '15/15 BATCHING' : 'MONTHLY EXECUTION'}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', margin: 0, marginBottom: '4px' }}>TOTAL CONTENT</p>
                        <p style={{ fontSize: '18px', fontWeight: 800, color: '#6366f1', margin: 0 }}>
                            {data.filter(item => {
                                const d = parseISO(item.scheduled_datetime);
                                return d >= periodStart && d <= periodEnd;
                            }).length} ITEMS
                        </p>
                    </div>
                </div>

                {/* Weekly Analysis Table */}
                <div style={{ marginBottom: '35px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                        <div style={{ width: '4px', height: '22px', background: '#ef4444', borderRadius: '3px' }}></div>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>WEEKLY ANALYSIS</h3>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>DAY OF WEEK</th>
                                <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>POSTERS</th>
                                <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>REELS</th>
                                <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>YOUTUBE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {weeklyStats.map((row, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 700, color: '#334155' }}>{row.day}</td>
                                    <td style={{ padding: '10px 20px', textAlign: 'center', fontSize: '14px', fontWeight: 800, color: '#6366f1' }}>
                                        {row.posterCount > 0 ? row.posterCount : '-'}
                                    </td>
                                    <td style={{ padding: '10px 20px', textAlign: 'center', fontSize: '14px', fontWeight: 800, color: '#22d3ee' }}>
                                        {row.reelCount > 0 ? row.reelCount : '-'}
                                    </td>
                                    <td style={{ padding: '10px 20px', textAlign: 'center', fontSize: '14px', fontWeight: 800, color: '#f59e0b' }}>
                                        {row.youtubeCount > 0 ? row.youtubeCount : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Monthly Calendar View */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                        <div style={{ width: '4px', height: '22px', background: '#6366f1', borderRadius: '3px' }}></div>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>CALENDAR VIEW</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                            <div key={day} style={{ padding: '10px', fontSize: '11px', fontWeight: 800, color: '#94a3b8', textAlign: 'center', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                {day}
                            </div>
                        ))}
                        {gridDays.map((day, idx) => {
                            const isInPeriod = day >= periodStart && day <= periodEnd;
                            const dayItems = data.filter(item => isSameDay(parseISO(item.scheduled_datetime), day));

                            return (
                                <div key={idx} style={{
                                    minHeight: '88px',
                                    padding: '8px',
                                    borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid #f1f5f9',
                                    borderBottom: '1px solid #f1f5f9',
                                    background: isInPeriod ? '#fff' : '#fcfdfe',
                                    position: 'relative'
                                }}>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: 800,
                                        color: isInPeriod ? '#94a3b8' : '#e2e8f0',
                                        marginBottom: '10px'
                                    }}>
                                        {format(day, 'dd')}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {dayItems.map((item, i) => (
                                            <div key={i} style={{
                                                fontSize: '10px',
                                                fontWeight: 800,
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                background: item.content_type === 'Post' ? 'rgba(99, 102, 241, 0.1)' : item.content_type === 'Reel' ? 'rgba(34, 211, 238, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                color: item.content_type === 'Post' ? '#4f46e5' : item.content_type === 'Reel' ? '#0891b2' : '#d97706',
                                                textAlign: 'center',
                                                border: `1px solid ${item.content_type === 'Post' ? 'rgba(99, 102, 241, 0.2)' : item.content_type === 'Reel' ? 'rgba(34, 211, 238, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                                            }}>
                                                {item.content_type.toUpperCase()}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Section */}
                <div style={{
                    position: 'absolute',
                    bottom: '80px',
                    left: '80px',
                    right: '80px',
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '30px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', margin: 0 }}>© {new Date().getFullYear()} TRUEUP MEDIA SOLUTIONS</p>
                    <p style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', margin: 0, letterSpacing: '0.05em' }}>PRECISION IN DIGITAL MARKETING</p>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#6366f1', margin: 0 }}>TRUEUPMEDIA.IN</p>
                </div>
            </div>
        </>
    );
};

export default ScheduleExport;

