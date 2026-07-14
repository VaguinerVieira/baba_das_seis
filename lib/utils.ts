import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeGoogleDriveUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  // Extract file ID from different formats of Google Drive URLs
  let fileId = '';
  
  if (url.includes('/d/')) {
    const parts = url.split('/d/');
    if (parts.length > 1) {
      fileId = parts[1].split('/')[0].split('?')[0];
    }
  } else if (url.includes('id=')) {
    const parts = url.split('id=');
    if (parts.length > 1) {
      fileId = parts[1].split('&')[0];
    }
  }
  
  // If we successfully found a file ID, return the robust direct image CDN URL
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  
  return url;
}

