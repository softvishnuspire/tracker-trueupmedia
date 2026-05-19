import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getClientAbbreviation(name: string | undefined | null) {
  if (!name) return '???';
  const cleanName = name.trim();
  
  // Check for Dr prefix (case insensitive)
  if (cleanName.toLowerCase().startsWith('dr')) {
    // Remove "Dr" (first 2 chars)
    let rest = cleanName.substring(2);
    // Remove any leading dot or space
    rest = rest.replace(/^[.\s]+/, '');
    return rest.substring(0, 3);
  }
  
  return cleanName.substring(0, 3);
}

export function formatIST(dateInput: string | Date | undefined | null, formatType: 'dd/MM/yyyy' | 'dd/MM/yy' | 'PPP p' | 'PPP' | 'MMMM do, yyyy' | 'MMM d, yyyy' | 'p' | 'h:mm a' | 'hh:mm a') {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  // Format parts in Asia/Kolkata timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  
  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  parts.forEach(p => { partMap[p.type] = p.value; });
  
  const dd = partMap.day;
  const mm = partMap.month;
  const yyyy = partMap.year;
  const yy = yyyy.slice(-2);
  
  if (formatType === 'dd/MM/yyyy') {
    return `${dd}/${mm}/${yyyy}`;
  }
  if (formatType === 'dd/MM/yy') {
    return `${dd}/${mm}/${yy}`;
  }

  if (formatType === 'PPP p' || formatType === 'PPP' || formatType === 'MMMM do, yyyy' || formatType === 'MMM d, yyyy') {
    return date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: formatType === 'MMM d, yyyy' ? 'medium' : 'long' });
  }

  if (formatType === 'p' || formatType === 'h:mm a' || formatType === 'hh:mm a') {
    return date.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
  }

  return `${dd}/${mm}/${yyyy}`;
}
