import { ContentItem } from '@/lib/api';
import { formatIST } from '@/lib/utils';

export function isCrossMonthRescheduled(item: ContentItem): boolean {
    if (item.is_cross_month_rescheduled) return true;
    if (!item.is_rescheduled || !item.original_scheduled_datetime || !item.scheduled_datetime) {
        return false;
    }
    try {
        // formatIST outputs dd/MM/yyyy or dd/MM/yy. Splitting by '/' gives MM at index 1 and year at index 2.
        const origParts = formatIST(item.original_scheduled_datetime, 'dd/MM/yyyy').split('/');
        const schedParts = formatIST(item.scheduled_datetime, 'dd/MM/yyyy').split('/');
        if (origParts.length < 3 || schedParts.length < 3) return false;
        
        const origMonth = origParts[1];
        const origYear = origParts[2];
        const schedMonth = schedParts[1];
        const schedYear = schedParts[2];
        
        return origMonth !== schedMonth || origYear !== schedYear;
    } catch {
        return false;
    }
}
