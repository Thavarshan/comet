'use client';

import * as React from 'react';
import { cn } from 'cn';
import { Progress as ProgressPrimitive } from 'radix-ui';

/**
 * Render the shared Mira progress primitive.
 */
function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>): React.ReactElement {
  return (
    <ProgressPrimitive.Root
      value={value ?? null}
      data-slot="progress"
      className={cn(
        'relative flex h-1 w-full items-center overflow-x-hidden rounded-md bg-muted',
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="size-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
