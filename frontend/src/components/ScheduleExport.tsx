import React from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, getDay, isSameDay } from 'date-fns';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ContentItem {
    id: string;
    title: string;
    description: string;
    content_type: 'Post' | 'Reel';
    scheduled_datetime: string;
    status: string;
    client_id: string;
    clients?: { company_name: string };
}

interface ScheduleExportProps {
    data: ContentItem[];
    clientName: string;
    month: Date;
    clientLogo?: string; // Base64 or URL
}

const ScheduleExport: React.FC<ScheduleExportProps> = ({ data, clientName, month, clientLogo }) => {
    const exportRef = React.useRef<HTMLDivElement>(null);

    const handleDownload = async () => {
        if (!exportRef.current) return;

        // Temporarily show the element for capturing
        const element = exportRef.current;
        element.style.display = 'block';

        try {
            const canvas = await html2canvas(element, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                windowWidth: 800 // Ensure consistent width for capture
            } as any);
            const imgData = canvas.toDataURL('image/png', 1.0);
            
            // Calculate dimensions to fit content
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            // If image height is greater than A4, create a custom sized PDF
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: imgHeight > pageHeight ? [imgWidth, imgHeight] : 'a4'
            });

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
            pdf.save(`${clientName}_Schedule_${format(month, 'MMM_yyyy')}.pdf`);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            element.style.display = 'none';
        }
    };

    // Prepare Weekly Data
    const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    // Map JS getDay (0=Sun, 1=Mon...) to our array index (0=Mon, 1=Tue... 6=Sun)
    const getWeekIndex = (date: Date) => {
        const d = getDay(date);
        return d === 0 ? 6 : d - 1;
    };

    const weeklyStats = daysOfWeek.map((day, idx) => {
        const items = data.filter(item => getWeekIndex(parseISO(item.scheduled_datetime)) === idx);
        const posters = items.filter(item => item.content_type === 'Post');
        const reels = items.filter(item => item.content_type === 'Reel');

        return {
            day,
            posterCount: posters.length,
            reelCount: reels.length
        };
    });

    // Prepare Monthly Grid
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const days = eachDayOfInterval({ start, end });
    
    // To align the grid, we need to know which day of the week the month starts on
    const firstDayIndex = getWeekIndex(start);
    const gridDays = Array(firstDayIndex).fill(null).concat(days);

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
                    letterSpacing: '0.02em',
                    textTransform: 'none',
                    position: 'relative',
                    overflow: 'hidden',
                    width: '45px',
                    height: '45px'
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(79, 70, 229, 0.5)';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(79, 70, 229, 0.4)';
                }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                </div>
            </button>

            {/* Hidden Export Template */}
            <div 
                ref={exportRef}
                style={{
                    display: 'none',
                    position: 'absolute',
                    left: '-9999px',
                    top: '-9999px',
                    width: '850px', 
                    padding: '60px',
                    background: '#ffffff',
                    color: '#000000',
                    fontFamily: "'Inter', sans-serif",
                }}
            >
                {/* Header Logo Only */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
                    <img src="/logo.png" alt="TrueUp Media" style={{ height: '80px', objectFit: 'contain' }} />
                </div>

                {/* Main Title */}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: 600, margin: '0 0 8px 0', letterSpacing: '1px', color: '#000' }}>{clientName.toUpperCase()}</h1>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                        <span style={{ color: '#ef4444' }}>POSTING SCHEDULE</span> 
                        <span style={{ marginLeft: '10px', color: '#000', fontWeight: 500 }}>({format(startOfMonth(month), 'MMM dd').toUpperCase()} - {format(endOfMonth(month), 'MMM dd').toUpperCase()})</span>
                    </h2>
                </div>

                <div style={{ width: '100%', height: '1px', background: '#ccc', marginBottom: '40px' }}></div>

                {/* Weekly Section */}
                <div style={{ marginBottom: '50px' }}>
                    <h3 style={{ textAlign: 'center', fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: '#000', letterSpacing: '0.5px' }}>WEEKLY POSTING</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', color: '#000' }}>
                                <th style={{ border: '1.2px solid #000', padding: '12px', fontSize: '13px', fontWeight: 700, width: '33.33%', textAlign: 'center' }}>DAYS</th>
                                <th style={{ border: '1.2px solid #000', padding: '12px', fontSize: '13px', fontWeight: 700, width: '33.33%', textAlign: 'center' }}>POSTERS</th>
                                <th style={{ border: '1.2px solid #000', padding: '12px', fontSize: '13px', fontWeight: 700, width: '33.33%', textAlign: 'center' }}>REELS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {weeklyStats.map((row, i) => (
                                <tr key={i}>
                                    <td style={{ border: '1.2px solid #000', padding: '10px 25px', fontSize: '12px', fontWeight: 600 }}>{row.day}</td>
                                    <td style={{ border: '1.2px solid #000', padding: '10px', fontSize: '13px', textAlign: 'center', fontWeight: 600 }}>
                                        {row.posterCount > 0 ? row.posterCount : ''}
                                    </td>
                                    <td style={{ border: '1.2px solid #000', padding: '10px', fontSize: '13px', textAlign: 'center', fontWeight: 600 }}>
                                        {row.reelCount > 0 ? row.reelCount : ''}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Monthly Section */}
                <div style={{ marginBottom: '40px' }}>
                    <h3 style={{ textAlign: 'center', fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: '#000', letterSpacing: '0.5px' }}>MONTHLY POSTING</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1.5px solid #000', background: '#000', gap: '1px' }}>
                        {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map(day => (
                            <div key={day} style={{ padding: '10px 5px', fontSize: '11px', fontWeight: 700, textAlign: 'center', background: '#f8fafc', border: '1px solid #000' }}>
                                {day}
                            </div>
                        ))}
                        {gridDays.map((day, idx) => {
                            if (!day) return <div key={`empty-${idx}`} style={{ background: '#fff', border: '1px solid #000', minHeight: '85px' }}></div>;
                            
                            const dayItems = data.filter(item => isSameDay(parseISO(item.scheduled_datetime), day));
                            
                            return (
                                <div key={idx} style={{ background: '#fff', border: '1px solid #000', minHeight: '85px', padding: '6px', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 700, textAlign: 'center', marginBottom: '5px', borderBottom: '1px solid #f1f5f9', paddingBottom: '2px' }}>{format(day, 'dd')}</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                                        {dayItems.map((item, i) => (
                                            <div key={i} style={{ 
                                                fontSize: '11px', 
                                                lineHeight: '1.2',
                                                fontWeight: 600, 
                                                color: '#f59e0b', 
                                                textAlign: 'center',
                                            }}>
                                                {item.content_type === 'Post' ? 'Poster' : 'Reel'}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '11px', color: '#64748b', fontWeight: 500, letterSpacing: '0.5px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                    TRUEUP MEDIA | {clientName.toUpperCase()} PITHAPURAM | MONTHLY POSTING SCHEDULE
                </div>
            </div>
        </>
    );
};

export default ScheduleExport;
