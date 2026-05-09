import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getClientAbbreviation(name: string | undefined | null) {
  if (!name) return '???';
  let cleanName = name.trim();
  
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
