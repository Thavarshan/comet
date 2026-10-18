'use client';

import type { ReactElement, ReactNode } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select.js';

// Radix reserves an empty item value for clearing the selection. Keep empty
// domain values available to callers without leaking a sentinel into settings.
const automaticValue = '__comet_automatic__';

/**
 * Compose a labeled, controlled select with a consistent full-width trigger.
 */
export function SelectControl({
  label,
  value,
  onValueChange,
  children,
}: {
  label: string;
  value: string | number;
  onValueChange: (value: string) => void;
  children: ReactNode;
}): ReactElement {
  return (
    <Select
      value={String(value) || automaticValue}
      onValueChange={(next) => {
        onValueChange(next === automaticValue ? '' : next);
      }}
    >
      <SelectTrigger aria-label={label} className="h-9 w-full text-[13px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-64">
        {children}
      </SelectContent>
    </Select>
  );
}

/**
 * Represent numeric and automatic choices using the same domain values.
 */
export function SelectOption({
  value,
  children,
}: {
  value: string | number;
  children: ReactNode;
}): ReactElement {
  return (
    <SelectItem value={String(value) || automaticValue}>{children}</SelectItem>
  );
}
