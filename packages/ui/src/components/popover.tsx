'use client';

import * as React from 'react';
import { cn } from 'cn';
import { Popover as PopoverPrimitive } from 'radix-ui';

/**
 * Render the shared Mira popover primitive.
 */
function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>): React.ReactElement {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

/**
 * Render the shared Mira popover trigger primitive.
 */
function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>): React.ReactElement {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

/**
 * Render the shared Mira popover content primitive.
 */
function PopoverContent({
  className,
  align = 'center',
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>): React.ReactElement {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 flex w-72 origin-(--radix-popover-content-transform-origin) flex-col gap-4 rounded-lg bg-popover p-2.5 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

/**
 * Render the shared Mira popover anchor primitive.
 */
function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>): React.ReactElement {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

/**
 * Render the shared Mira popover header primitive.
 */
function PopoverHeader({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      data-slot="popover-header"
      className={cn('flex flex-col gap-1 text-xs', className)}
      {...props}
    />
  );
}

/**
 * Render the shared Mira popover title primitive.
 */
function PopoverTitle({
  className,
  ...props
}: React.ComponentProps<'h2'>): React.ReactElement {
  return (
    <div
      data-slot="popover-title"
      className={cn('text-sm font-medium', className)}
      {...props}
    />
  );
}

/**
 * Render the shared Mira popover description primitive.
 */
function PopoverDescription({
  className,
  ...props
}: React.ComponentProps<'p'>): React.ReactElement {
  return (
    <p
      data-slot="popover-description"
      className={cn('text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
};
