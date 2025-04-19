import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Check if the application is running in production mode
 */
export function isProduction(): boolean {
  // Check for production mode based on environment variable
  return import.meta.env.MODE === 'production';
}
