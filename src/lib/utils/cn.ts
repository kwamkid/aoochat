// src/lib/utils/cn.ts

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge classnames with tailwind-merge to handle conflicts
 * This is the most commonly used utility in the app
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}