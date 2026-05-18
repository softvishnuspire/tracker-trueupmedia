import { parseISO, isValid } from 'date-fns';
import { ContentItem } from '@/lib/api';

export function isCrossMonthRescheduled(item: ContentItem): boolean {
    if (item.is_cross_month_rescheduled) return true;
    if (!item.is_rescheduled || !item.original_scheduled_datetime || !item.scheduled_datetime) {
        return false;
    }
    try {
        const orig = parseISO(item.original_scheduled_datetime);
        const sched = parseISO(item.scheduled_datetime);
        if (!isValid(orig) || !isValid(sched)) return false;
        return orig.getFullYear() !== sched.getFullYear() || orig.getMonth() !== sched.getMonth();
    } catch {
        return false;
    }
}
