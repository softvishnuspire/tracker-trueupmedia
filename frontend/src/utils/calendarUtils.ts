import { ContentItem } from '@/lib/api';
import { formatIST } from '@/lib/utils';

export function isCrossMonthRescheduled(item: ContentItem): boolean {
    if (item.is_cross_month_rescheduled) return true;
    if (!item.is_rescheduled || !item.original_scheduled_datetime || !item.scheduled_datetime) {
        return false;
    }
    try {
        const batchType = item.clients?.batch_type || '1-1';
        
        // formatIST outputs dd/MM/yyyy or dd/MM/yy. Splitting by '/' gives day at index 0, MM at index 1, and year at index 2.
        const origParts = formatIST(item.original_scheduled_datetime, 'dd/MM/yyyy').split('/');
        const schedParts = formatIST(item.scheduled_datetime, 'dd/MM/yyyy').split('/');
        if (origParts.length < 3 || schedParts.length < 3) return false;
        
        const origDay = parseInt(origParts[0], 10);
        const origMonth = parseInt(origParts[1], 10);
        const origYear = parseInt(origParts[2], 10);
        
        const schedDay = parseInt(schedParts[0], 10);
        const schedMonth = parseInt(schedParts[1], 10);
        const schedYear = parseInt(schedParts[2], 10);

        if (batchType === '15-15') {
            const get15PeriodStartMonth = (day: number, month: number, year: number) => {
                if (day >= 15) {
                    return { year, month };
                } else {
                    let m = month - 1;
                    let y = year;
                    if (m === 0) {
                        m = 12;
                        y -= 1;
                    }
                    return { year: y, month: m };
                }
            };
            const origPeriod = get15PeriodStartMonth(origDay, origMonth, origYear);
            const schedPeriod = get15PeriodStartMonth(schedDay, schedMonth, schedYear);
            return origPeriod.year !== schedPeriod.year || origPeriod.month !== schedPeriod.month;
        } else {
            return origMonth !== schedMonth || origYear !== schedYear;
        }
    } catch {
        return false;
    }
}

/**
 * Calculates the start and end dates for a 15-15 bi-monthly cycle.
 * The period is calculated dynamically based on a reference date (refDate)
 * and its relation to the actual real-world current period.
 */
export function get15BiMonthlyPeriod(refDate: Date): { periodStart: Date; periodEnd: Date } {
    const d = new Date(refDate.getTime());
    const year = d.getFullYear();
    const month = d.getMonth();
    const day = d.getDate();

    let periodStart: Date;
    let periodEnd: Date;

    if (day >= 15) {
        periodStart = new Date(year, month, 15, 0, 0, 0, 0);
        periodEnd = new Date(year, month + 1, 14, 23, 59, 59, 999);
    } else {
        periodStart = new Date(year, month - 1, 15, 0, 0, 0, 0);
        periodEnd = new Date(year, month, 14, 23, 59, 59, 999);
    }

    return { periodStart, periodEnd };
}

/**
 * Returns formatted yyyy-MM strings for the start and end months of a 15-15 cycle based on refDate.
 */
export function get15BiMonthlyMonths(refDate: Date): { startMonthStr: string; endMonthStr: string; periodStart: Date; periodEnd: Date } {
    const period = get15BiMonthlyPeriod(refDate);
    // formatIST or manual formatting: yyyy-MM
    const formatMonth = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
    };
    return {
        ...period,
        startMonthStr: formatMonth(period.periodStart),
        endMonthStr: formatMonth(period.periodEnd)
    };
}

/**
 * Deduplicates ContentItem array by item ID.
 */
export function dedupeContentItems(items: ContentItem[]): ContentItem[] {
    const map = new Map<string, ContentItem>();
    for (const item of items) {
        if (item && item.id) {
            map.set(item.id, item);
        }
    }
    return Array.from(map.values());
}


