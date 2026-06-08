import type { jsPDF } from 'jspdf';

export interface ClientStats {
    id: string;
    name: string;
    role: string;
    dailyCompleted?: number;
    dailyTotal?: number;
    monthlyCompleted?: number;
    monthlyTotal?: number;
}

export interface TaskStats {
    id: string;
    title: string;
    clientName: string;
    status: string;
    employeeStatus?: string;
    scheduledDate: string;
}

export interface EmployeeTrackingStats {
    id: string;
    name: string;
    email: string;
    role: string;
    assignedTasks: number;
    completedTasks: number;
    completionRate: number;
    monthlyTotal: number;
    monthlyCompleted: number;
    monthlyRate: number;
    assignedClients?: ClientStats[];
    tasks?: TaskStats[];
}

const loadLogo = (): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = '/logo.png';
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
    });
};

const drawWatermark = (doc: jsPDF, logoImg: HTMLImageElement | null) => {
    if (logoImg) {
        try {
            // Save state to isolate graphics settings (like opacity)
            doc.saveGraphicsState();
            
            // @ts-expect-error: GState typings missing in jsPDF
            const gState = new doc.GState({ opacity: 0.04 });
            doc.setGState(gState);
            
            // Center is (105, 148.5)
            // Draw logo: width 90mm, height 90mm
            doc.addImage(logoImg, 'PNG', 105 - 45, 148.5 - 45, 90, 90);
            
            // Restore graphics state to guarantee opacity reset
            doc.restoreGraphicsState();
        } catch (err) {
            console.error('Error drawing watermark:', err);
        }
    }
};

const drawFooter = (doc: jsPDF, pageNum: number, totalPages: number) => {
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFont('helvetica', 'normal');
    doc.text(`© ${new Date().getFullYear()} TRUEUP MEDIA SOLUTIONS`, 15, 285);
    doc.text(`PRECISION IN DIGITAL MARKETING`, 105, 285, { align: 'center' });
    doc.text(`Page ${pageNum} of ${totalPages}`, 195, 285, { align: 'right' });
};

const drawHeaderBlock = (doc: jsPDF, logoImg: HTMLImageElement | null, title: string, subtitle: string, selectedDate: string) => {
    // Company Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('TRUEUP MEDIA', 15, 24);

    doc.setFontSize(9);
    doc.setTextColor(99, 102, 241); // indigo-500
    doc.text('PRODUCTIVITY MANAGEMENT SYSTEM', 15, 30);

    // Draw logo on the top right
    if (logoImg) {
        try {
            doc.addImage(logoImg, 'PNG', 155, 12, 40, 20);
        } catch (err) {
            console.error('Error drawing header logo:', err);
        }
    }

    // Decorative line below header
    doc.setDrawColor(99, 102, 241); // Indigo
    doc.setLineWidth(1.5);
    doc.line(15, 36, 195, 36);

    // Metadata Bar
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.rect(15, 41, 180, 16, 'FD');

    doc.setTextColor(71, 85, 105); // slate-600
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORT:', 20, 51);
    doc.setFont('helvetica', 'normal');
    doc.text(title.toUpperCase(), 35, 51);

    doc.setFont('helvetica', 'bold');
    doc.text('TARGET DATE:', 95, 51);
    doc.setFont('helvetica', 'normal');
    doc.text(selectedDate, 118, 51);

    doc.setFont('helvetica', 'bold');
    doc.text('GENERATED:', 142, 51);
    doc.setFont('helvetica', 'normal');
    const genTime = new Date().toLocaleString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
    });
    doc.text(genTime, 162, 51);
};

export const downloadAllEmployeesReport = async (employees: EmployeeTrackingStats[], selectedDate: string) => {
    let logoImg: HTMLImageElement | null = null;
    try {
        logoImg = await loadLogo();
    } catch (e) {
        console.error('Failed to load logo image', e);
    }

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    drawWatermark(doc, logoImg);
    drawHeaderBlock(doc, logoImg, 'All Employees Report', 'Performance statistics for all tracked employees', selectedDate);

    // Section Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('EMPLOYEE PERFORMANCE SUMMARY', 15, 68);

    // Table Header
    const tableHeaderY = 74;
    doc.setFillColor(79, 70, 229); // indigo-600
    doc.rect(15, tableHeaderY, 180, 9, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('EMPLOYEE NAME', 18, tableHeaderY + 6);
    doc.text('ROLE', 65, tableHeaderY + 6);
    doc.text('CLIENTS', 100, tableHeaderY + 6);
    doc.text('MONTHLY TASKS (COMP/PEND)', 122, tableHeaderY + 6);
    doc.text('COMPL. RATE', 168, tableHeaderY + 6);

    let currentY = tableHeaderY + 13;

    employees.forEach((emp, index) => {
        // Page break check (max 260 to accommodate footer safely)
        if (currentY + 11 > 260) {
            doc.addPage();
            drawWatermark(doc, logoImg);
            
            // Draw table header on new page
            const newHeaderY = 20;
            doc.setFillColor(79, 70, 229);
            doc.rect(15, newHeaderY, 180, 9, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text('EMPLOYEE NAME', 18, newHeaderY + 6);
            doc.text('ROLE', 65, newHeaderY + 6);
            doc.text('CLIENTS', 100, newHeaderY + 6);
            doc.text('MONTHLY TASKS (COMP/PEND)', 122, newHeaderY + 6);
            doc.text('COMPL. RATE', 168, newHeaderY + 6);
            
            currentY = newHeaderY + 13;
        }

        // Alternating row colors
        if (index % 2 === 1) {
            doc.setFillColor(248, 250, 252); // slate-50
            doc.rect(15, currentY, 180, 11, 'F');
        }

        // Row border line
        doc.setDrawColor(241, 245, 249); // slate-100
        doc.setLineWidth(0.5);
        doc.line(15, currentY + 11, 195, currentY + 11);

        // Employee Info
        doc.setTextColor(15, 23, 42); // slate-900
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(emp.name, 18, currentY + 7);

        doc.setTextColor(100, 116, 139); // slate-500
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(emp.role || 'Employee', 65, currentY + 7);

        const clientsCount = emp.assignedClients?.length || 0;
        doc.text(`${clientsCount} Clients`, 100, currentY + 7);

        const done = emp.monthlyCompleted || 0;
        const total = emp.monthlyTotal || 0;
        const pending = total - done;
        doc.text(`${done} / ${total} (Pending: ${pending})`, 122, currentY + 7);

        // Completion Rate
        const rate = Math.round((emp.monthlyRate || 0) * 100);
        let rateColor = [220, 38, 38]; // Red
        if (rate >= 80) {
            rateColor = [22, 163, 74]; // Green
        } else if (rate >= 50) {
            rateColor = [217, 119, 6]; // Amber
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        // @ts-expect-error: setTextColor array spreading typing issue in jsPDF
        doc.setTextColor(...rateColor);
        doc.text(`${rate}%`, 168, currentY + 7);

        currentY += 11;
    });

    // Clean up total page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        drawFooter(doc, i, pageCount);
    }

    doc.save('all_employees_report.pdf');
};

export const downloadEmployeeReport = async (employee: EmployeeTrackingStats, selectedDate: string) => {
    let logoImg: HTMLImageElement | null = null;
    try {
        logoImg = await loadLogo();
    } catch (e) {
        console.error('Failed to load logo image', e);
    }

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    drawWatermark(doc, logoImg);
    drawHeaderBlock(doc, logoImg, `Employee Report: ${employee.name}`, `Detailed productivity metrics for ${employee.name}`, selectedDate);

    // Profile Details Card
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.rect(15, 68, 180, 24, 'FD');

    // Details text
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(employee.name, 22, 76);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`Role: ${employee.role || 'Employee'}`, 22, 82);
    doc.text(`Email: ${employee.email || 'N/A'}`, 22, 87);

    // Right-aligned status badge in the profile card
    doc.setFillColor(239, 246, 255); // blue-50
    doc.setDrawColor(191, 219, 254); // blue-200
    doc.rect(140, 74, 45, 12, 'FD');
    doc.setTextColor(29, 78, 216); // blue-700
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('PRODUCTIVITY STATUS', 143, 79);
    doc.setFont('helvetica', 'normal');
    const rate = Math.round((employee.completionRate || 0) * 100);
    doc.text(`Completion Rate: ${rate}%`, 143, 83);

    // Metrics Grid (2x2 boxes)
    // Row 1: Daily Stats & Monthly Stats
    const metricsY = 100;
    
    // Daily Stats Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.rect(15, metricsY, 87, 18, 'FD');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(99, 102, 241); // indigo-500
    doc.text('DAILY METRICS', 20, metricsY + 6);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Completed Tasks: ${employee.completedTasks} / ${employee.assignedTasks}`, 20, metricsY + 13);

    // Monthly Stats Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.rect(108, metricsY, 87, 18, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(245, 158, 11); // amber-500
    doc.text('MONTHLY METRICS', 113, metricsY + 6);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Completed Tasks: ${employee.monthlyCompleted} / ${employee.monthlyTotal}`, 113, metricsY + 13);

    // Assigned Clients Table
    let currentY = 128;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`ASSIGNED CLIENTS (${employee.assignedClients?.length || 0})`, 15, currentY);

    currentY += 4;
    doc.setFillColor(79, 70, 229); // indigo-600
    doc.rect(15, currentY, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('CLIENT NAME', 18, currentY + 5.5);
    doc.text('TASKS COMPLETED (MONTHLY)', 110, currentY + 5.5);

    currentY += 8;
    const clients = employee.assignedClients || [];
    if (clients.length === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, currentY, 180, 8, 'F');
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'italic');
        doc.text('No assigned clients', 20, currentY + 5);
        currentY += 8;
    } else {
        clients.forEach((c, idx) => {
            if (idx % 2 === 1) {
                doc.setFillColor(248, 250, 252);
                doc.rect(15, currentY, 180, 8, 'F');
            }
            doc.setDrawColor(241, 245, 249);
            doc.line(15, currentY + 8, 195, currentY + 8);

            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.text(c.name, 18, currentY + 5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            const monthlyStr = `${c.monthlyCompleted || 0} / ${c.monthlyTotal || 0}`;
            doc.text(`${monthlyStr} (Monthly)`, 110, currentY + 5);

            currentY += 8;
        });
    }

    // Clean up total page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        drawFooter(doc, i, pageCount);
    }

    // Meaningful filename: employee_<employee_name>_report.pdf
    const formattedName = employee.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    doc.save(`employee_${formattedName}_report.pdf`);
};
