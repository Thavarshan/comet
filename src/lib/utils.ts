import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  const uniqueClasses = Array.from(new Set(clsx(inputs).split(' ')));
  return twMerge(uniqueClasses.join(' '));
}
