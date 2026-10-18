'use client';

import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { cn } from 'cn';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './dialog.js';
import { InputGroup, InputGroupAddon } from './input-group.js';
import { SearchIcon, CheckIcon } from 'lucide-react';

/**
 * Render the shared Mira command primitive.
 */
function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>): React.ReactElement {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        'flex size-full flex-col overflow-hidden rounded-xl bg-popover p-1 text-popover-foreground',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Render the shared Mira command dialog primitive.
 */
function CommandDialog({
  title = 'Command Palette',
  description = 'Search for a command to run...',
  children,
  className,
  showCloseButton = false,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string;
  description?: string;
  className?: string;
  showCloseButton?: boolean;
}): React.ReactElement {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn(
          'top-1/3 translate-y-0 overflow-hidden rounded-xl! p-0',
          className,
        )}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Render the shared Mira command input primitive.
 */
function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>): React.ReactElement {
  return (
    <div data-slot="command-input-wrapper" className="p-1 pb-0">
      <InputGroup className="h-8! bg-input/20 dark:bg-input/30">
        <CommandPrimitive.Input
          data-slot="command-input"
          className={cn(
            'w-full text-xs/relaxed outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          {...props}
        />
        <InputGroupAddon>
          <SearchIcon className="size-3.5 shrink-0 opacity-50" />
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

/**
 * Render the shared Mira command list primitive.
 */
function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>): React.ReactElement {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        'no-scrollbar max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Render the shared Mira command empty primitive.
 */
function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>): React.ReactElement {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn('py-6 text-center text-xs/relaxed', className)}
      {...props}
    />
  );
}

/**
 * Render the shared Mira command group primitive.
 */
function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>): React.ReactElement {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        'overflow-hidden p-1 text-foreground **:[[cmdk-group-heading]]:px-2.5 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Render the shared Mira command separator primitive.
 */
function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<
  typeof CommandPrimitive.Separator
>): React.ReactElement {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn('-mx-1 my-1 h-px bg-border/50', className)}
      {...props}
    />
  );
}

/**
 * Render the shared Mira command item primitive.
 */
function CommandItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>): React.ReactElement {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "group/command-item relative flex min-h-7 cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 text-xs/relaxed outline-hidden select-none in-data-[slot=dialog-content]:rounded-md data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-selected:bg-muted data-selected:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 data-selected:*:[svg]:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
      <CheckIcon className="ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100" />
    </CommandPrimitive.Item>
  );
}

/**
 * Render the shared Mira command shortcut primitive.
 */
function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<'span'>): React.ReactElement {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        'ml-auto text-[0.625rem] tracking-widest text-muted-foreground group-data-selected/command-item:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
