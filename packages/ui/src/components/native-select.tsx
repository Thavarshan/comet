import type { ComponentProps, ReactElement } from 'react';
import { cn } from '../lib/utils.js';

/** Native form selection for static pages and platform keyboard conventions. */
export function NativeSelect({
  className,
  ...props
}: ComponentProps<'select'>): ReactElement {
  return (
    <select
      data-slot="native-select"
      className={cn(
        'border-input bg-background text-foreground min-h-10 w-full border px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
